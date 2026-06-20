"""
SkillOpt Runner — one-shot CLI to evolve the global agent skill from stored lessons.

Usage:
    python -m trading_agent.tools.skillopt_runner
"""
from __future__ import annotations
import json
from pathlib import Path

from trading_agent.tools.skillopt import run_skillopt_and_save


def _load_lessons(path: Path | None = None) -> list[dict]:
    if path is None:
        path = Path(__file__).resolve().parent.parent.parent / "trading_server" / "strategy_lessons.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data.get("lessons", [])
        return data if isinstance(data, list) else []
    except Exception:
        return []


def main() -> None:
    lessons = _load_lessons()
    print(f"Loaded {len(lessons)} lessons for SkillOpt")
    result = run_skillopt_and_save(lessons)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
