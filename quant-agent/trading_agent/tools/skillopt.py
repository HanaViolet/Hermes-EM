"""
SkillOpt — Executive Strategy for Self-Evolving Agent Skills.

A minimal text-space optimizer for agent skill markdown.

Loop:
  1. Rollout   : collect scored trajectories from past runs (lessons).
  2. Reflect   : split into train/validation failure minibatches.
  3. Edit      : ask a frozen LLM to propose bounded edits to the skill markdown.
  4. Gate      : accept the edit only if validation score strictly improves.

The skill is treated as trainable external state; the underlying model stays frozen.
"""
from __future__ import annotations
import json
import os
import random
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from trading_agent.tools.llm_client import call_llm_json


SKILL_DIR = Path(__file__).resolve().parent.parent / "skills"
DEFAULT_SKILL_PATH = SKILL_DIR / "global_skill.md"
OUTPUTS_DIR = Path(__file__).resolve().parent.parent.parent / "outputs"
REJECTED_PATH = OUTPUTS_DIR / "skillopt_rejected.json"

# Protect concurrent writes to the skill file and rejected-edits store.
_SKILL_FILE_LOCK = threading.Lock()
_REJECTED_FILE_LOCK = threading.Lock()
_STATUS_FILE_LOCK = threading.Lock()


@dataclass
class Trajectory:
    """One training example: a past run and its outcome."""
    run_id: str
    ticker: str
    strategy: str
    decision: str
    total_return_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    agent_attribution: list[dict[str, Any]]
    lesson_zh: str
    lesson_en: str


class SkillLibrary:
    """Load and persist skill markdown."""

    def __init__(self, path: Path | str | None = None):
        self.path = Path(path or DEFAULT_SKILL_PATH)

    def load(self) -> str:
        if self.path.exists():
            return self.path.read_text(encoding="utf-8")
        return ""

    def save(self, text: str) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        with _SKILL_FILE_LOCK:
            tmp.write_text(text, encoding="utf-8")
            os.replace(tmp, self.path)


class SkillOptimizer:
    """Text-space skill optimizer with validation gate."""

    def __init__(
        self,
        library: SkillLibrary | None = None,
        edit_budget: int = 5,
        validation_ratio: float = 0.3,
        random_seed: int = 42,
    ):
        self.library = library or SkillLibrary()
        self.edit_budget = edit_budget
        self.validation_ratio = validation_ratio
        self.rng = random.Random(random_seed)
        self.rejected_edits: list[str] = self._load_rejected()

    @staticmethod
    def _load_rejected() -> list[str]:
        with _REJECTED_FILE_LOCK:
            if not REJECTED_PATH.exists():
                return []
            try:
                data = json.loads(REJECTED_PATH.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    return [s for s in data if isinstance(s, str)]
                if isinstance(data, dict):
                    return [s for s in data.get("rejected", []) if isinstance(s, str)]
            except Exception:
                pass
            return []

    @staticmethod
    def _save_rejected(rejected: list[str]) -> None:
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        tmp = REJECTED_PATH.with_suffix(".tmp")
        with _REJECTED_FILE_LOCK:
            tmp.write_text(json.dumps({"rejected": rejected}, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(tmp, REJECTED_PATH)

    def _persist_rejected(self, edit: str) -> None:
        if edit in self.rejected_edits:
            return
        self.rejected_edits.append(edit)
        # Keep the most recent 100 rejected edits to avoid unbounded growth.
        self.rejected_edits = self.rejected_edits[-100:]
        self._save_rejected(self.rejected_edits)
    @staticmethod
    def trajectories_from_lessons(lessons: list[dict[str, Any]]) -> list[Trajectory]:
        """Convert stored lessons into optimization trajectories."""
        out: list[Trajectory] = []
        for l in lessons:
            m = l.get("metrics", {}) or {}
            lesson = l.get("lesson", {}) or {}
            out.append(
                Trajectory(
                    run_id=l.get("run_id", "?"),
                    ticker=l.get("ticker", "?"),
                    strategy=l.get("strategy", "?"),
                    decision=m.get("decision", "hold"),
                    total_return_pct=m.get("total_return_pct", 0.0),
                    sharpe_ratio=m.get("sharpe_ratio", 0.0),
                    max_drawdown_pct=m.get("max_drawdown_pct", 0.0),
                    agent_attribution=l.get("agent_attribution", []),
                    lesson_zh=lesson.get("zh", ""),
                    lesson_en=lesson.get("en", ""),
                )
            )
        return out

    def split(self, trajectories: list[Trajectory]) -> tuple[list[Trajectory], list[Trajectory]]:
        """Shuffle and split into train / validation."""
        data = list(trajectories)
        self.rng.shuffle(data)
        n_val = max(1, int(len(data) * self.validation_ratio))
        return data[n_val:], data[:n_val]

    @staticmethod
    def _outcome_label(t: Trajectory) -> str:
        # Severe losses or excessive drawdown are unambiguous failures.
        if t.total_return_pct < 0 or t.sharpe_ratio < 0 or t.max_drawdown_pct > 20:
            return "bad"
        # Good outcomes need positive return, decent Sharpe, and controlled drawdown.
        if t.total_return_pct > 0 and t.sharpe_ratio >= 0.5 and t.max_drawdown_pct <= 15:
            return "good"
        return "neutral"

    def _judge_prompt(self, skill: str, t: Trajectory) -> tuple[str, dict]:
        system = (
            "You are a strict skill evaluator. Given a skill document and a past trading run, "
            "rate how well the skill would have helped the agent avoid this failure or reinforce this success. "
            "Return JSON only: {\"score\": int(0-100), \"reason\": \"...\"}."
        )
        user = {
            "skill": skill,
            "run": {
                "ticker": t.ticker,
                "strategy": t.strategy,
                "decision": t.decision,
                "total_return_pct": t.total_return_pct,
                "sharpe_ratio": t.sharpe_ratio,
                "max_drawdown_pct": t.max_drawdown_pct,
                "agent_attribution": t.agent_attribution,
                "lesson": {"zh": t.lesson_zh, "en": t.lesson_en},
            },
        }
        return system, user

    def evaluate(self, skill: str, trajectories: list[Trajectory]) -> float:
        """Return average judge score over trajectories."""
        if not trajectories:
            return 0.0
        scores: list[float] = []
        for t in trajectories:
            system, user = self._judge_prompt(skill, t)
            result = call_llm_json(
                system,
                user,
                fallback={"score": 50, "reason": "llm disabled"},
                temperature=0.0,
            )
            try:
                scores.append(float(result.get("score", 50)))
            except Exception:
                scores.append(50.0)
        return sum(scores) / len(scores)

    def _edit_prompt(
        self,
        skill: str,
        failures: list[Trajectory],
        rejected: list[str],
    ) -> tuple[str, dict]:
        system = (
            "You are a skill editor. You will receive a markdown skill document and a list of failed trading runs. "
            f"Propose an improved version of the skill. You may make at most {self.edit_budget} bounded edits "
            "(add, delete, or replace short sections). Do not rewrite the whole document. "
            "Return JSON only: {\"skill\": \"full updated markdown\"}."
        )
        user = {
            "current_skill": skill,
            "rejected_edits": rejected,
            "failures": [
                {
                    "ticker": t.ticker,
                    "strategy": t.strategy,
                    "decision": t.decision,
                    "total_return_pct": t.total_return_pct,
                    "sharpe_ratio": t.sharpe_ratio,
                    "max_drawdown_pct": t.max_drawdown_pct,
                    "agent_attribution": t.agent_attribution,
                    "lesson": {"zh": t.lesson_zh, "en": t.lesson_en},
                }
                for t in failures
            ],
        }
        return system, user

    def propose_edit(
        self,
        skill: str,
        train_trajectories: list[Trajectory],
    ) -> str | None:
        """Ask the frozen LLM to propose a new skill markdown."""
        failures = [t for t in train_trajectories if self._outcome_label(t) == "bad"]
        if not failures:
            return None
        system, user = self._edit_prompt(skill, failures, self.rejected_edits)
        result = call_llm_json(
            system,
            user,
            fallback={},
            temperature=0.3,
        )
        new_skill = result.get("skill")
        if not isinstance(new_skill, str) or new_skill.strip() == skill.strip():
            return None
        return new_skill.strip()

    def step(self, trajectories: list[Trajectory]) -> dict[str, Any]:
        """Run one SkillOpt step: rollout -> reflect -> edit -> gate."""
        train, val = self.split(trajectories)
        current_skill = self.library.load()

        baseline_score = self.evaluate(current_skill, val)
        new_skill = self.propose_edit(current_skill, train)

        if new_skill is None:
            return {
                "updated": False,
                "reason": "no_edit_proposed",
                "baseline_score": baseline_score,
                "new_score": None,
                "skill_path": str(self.library.path),
            }

        edit_count = self._count_edits(current_skill, new_skill)
        added_chars = max(0, len(new_skill) - len(current_skill))
        # Enforce a strict edit budget: line changes and total growth must both stay bounded.
        if edit_count > self.edit_budget or added_chars > self.edit_budget * 200:
            self._persist_rejected(new_skill)
            return {
                "updated": False,
                "reason": "edit_too_large",
                "baseline_score": baseline_score,
                "new_score": None,
                "skill_path": str(self.library.path),
                "edit_count": edit_count,
                "added_chars": added_chars,
            }

        new_score = self.evaluate(new_skill, val)

        if new_score > baseline_score:
            self.library.save(new_skill)
            return {
                "updated": True,
                "reason": "validation_improved",
                "baseline_score": baseline_score,
                "new_score": new_score,
                "skill_path": str(self.library.path),
                "edit_count": edit_count,
            }

        self._persist_rejected(new_skill)
        return {
            "updated": False,
            "reason": "validation_rejected",
            "baseline_score": baseline_score,
            "new_score": new_score,
            "skill_path": str(self.library.path),
            "edit_count": edit_count,
        }

    @staticmethod
    def _count_edits(old_skill: str, new_skill: str) -> int:
        """Crude edit count based on line diff."""
        old_lines = old_skill.splitlines()
        new_lines = new_skill.splitlines()
        return len(set(new_lines) - set(old_lines)) + len(set(old_lines) - set(new_lines))


def optimize_global_skill(lessons: list[dict[str, Any]]) -> dict[str, Any]:
    """High-level entry point: optimize the global skill from a list of lessons."""
    optimizer = SkillOptimizer()
    trajectories = optimizer.trajectories_from_lessons(lessons)
    if len(trajectories) < 5:
        return {
            "updated": False,
            "reason": "insufficient_trajectories",
            "count": len(trajectories),
            "last_run_at": datetime.now(timezone.utc).isoformat(),
        }
    result = optimizer.step(trajectories)
    result["last_run_at"] = datetime.now(timezone.utc).isoformat()
    result["rejected_count"] = len(optimizer.rejected_edits)
    return result


def _save_status(result: dict[str, Any]) -> None:
    """Persist the latest SkillOpt status to outputs/skillopt_status.json."""
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    status_path = OUTPUTS_DIR / "skillopt_status.json"
    tmp = status_path.with_suffix(".tmp")
    with _STATUS_FILE_LOCK:
        tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, status_path)


def run_skillopt_and_save(lessons: list[dict[str, Any]]) -> dict[str, Any]:
    """Run one SkillOpt step and persist its status."""
    result = optimize_global_skill(lessons)
    _save_status(result)
    return result
