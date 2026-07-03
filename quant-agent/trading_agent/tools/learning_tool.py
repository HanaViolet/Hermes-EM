"""
Learning Tool — generates lessons and experience cards after each trading run.

- Saves per-run lessons to trading_server/strategy_lessons.json.
- After accumulating LESSONS_PER_EXPERIENCE lessons for a strategy, summarizes them
  into an experience card and stores it.
- Uses the shared LLM client when enabled; otherwise falls back to rule-based
  generation.
- Prior experiences and recent lessons are injected into the LLM context so the
  learner can reflect and improve over time.
"""
from __future__ import annotations
import json
import os
import threading
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from trading_agent.tools.llm_client import call_llm_json

try:
    from trading_server.artifact_builder import STRATEGY_KNOWLEDGE_BASE
except Exception:
    STRATEGY_KNOWLEDGE_BASE = []

_LESSONS_PATH = Path(__file__).resolve().parent.parent.parent / "trading_server" / "strategy_lessons.json"
_SKILLOPT_STATUS_PATH = Path(__file__).resolve().parent.parent.parent / "outputs" / "skillopt_status.json"
LESSONS_PER_EXPERIENCE = 3
MAX_LESSONS = 100
MAX_EXPERIENCES = 20
SKILLOPT_MIN_LESSONS = 10
SKILLOPT_COOLDOWN_SECONDS = 300


def _default_knowledge_base() -> list[dict[str, Any]]:
    return STRATEGY_KNOWLEDGE_BASE if STRATEGY_KNOWLEDGE_BASE else []


def _load_store() -> dict[str, Any]:
    if _LESSONS_PATH.exists():
        try:
            data = json.loads(_LESSONS_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {"lessons": [], "experience_cards": [], "version": "1.0"}


def load_strategy_experience_adjustments(strategies: list[str]) -> dict[str, dict[str, Any]]:
    """Return per-strategy score adjustments based on accumulated experience cards.

    The adjustment boosts strategies with positive historical experience and
    penalizes those with poor experience. The magnitude scales with the number
    of lessons backing the experience card (full confidence at 3+ lessons).
    """
    store = _load_store()
    adjustments: dict[str, dict[str, Any]] = {}
    for strategy in strategies:
        cards = [e for e in store.get("experience_cards", []) if e.get("strategy") == strategy]
        if not cards:
            continue
        # Keep the latest experience card for this strategy
        card = max(cards, key=lambda e: e.get("created_at", ""))
        avg = card.get("avg_metrics", {}) or {}
        avg_return = float(avg.get("avg_return_pct", 0.0) or 0.0)
        avg_sharpe = float(avg.get("avg_sharpe", 0.0) or 0.0)
        lesson_count = int(card.get("lesson_count", 0) or 0)

        delta = 0.0
        reason_parts: list[str] = []

        # Return contribution: ±5 points for ±50% avg return
        return_delta = max(-5.0, min(5.0, avg_return / 10.0))
        if abs(return_delta) >= 0.5:
            reason_parts.append(f"avg return {avg_return:.1f}%")
        delta += return_delta

        # Sharpe contribution
        if avg_sharpe >= 0.8:
            delta += 3.0
            reason_parts.append(f"Sharpe {avg_sharpe:.2f}")
        elif avg_sharpe >= 0.5:
            delta += 1.0
            reason_parts.append(f"Sharpe {avg_sharpe:.2f}")
        elif avg_sharpe < 0:
            delta -= 3.0
            reason_parts.append(f"negative Sharpe {avg_sharpe:.2f}")
        elif avg_sharpe < 0.3:
            delta -= 1.0
            reason_parts.append(f"low Sharpe {avg_sharpe:.2f}")

        # Confidence scaling by lesson count
        confidence = min(lesson_count / LESSONS_PER_EXPERIENCE, 1.0)
        delta = round(delta * confidence, 2)

        adjustments[strategy] = {
            "delta": delta,
            "reason": "; ".join(reason_parts) or "historical experience",
            "card_id": card.get("id"),
            "lesson_count": lesson_count,
        }
    return adjustments


def _save_store(store: dict[str, Any]) -> None:
    _LESSONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = _LESSONS_PATH.with_suffix(".tmp")
    data = json.dumps(store, ensure_ascii=False, indent=2)
    tmp_path.write_text(data, encoding="utf-8")
    os.replace(tmp_path, _LESSONS_PATH)


def _load_skillopt_status() -> dict[str, Any]:
    if not _SKILLOPT_STATUS_PATH.exists():
        return {}
    try:
        data = json.loads(_SKILLOPT_STATUS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _skillopt_cooldown_remaining() -> float:
    """Return seconds until SkillOpt can run again; 0 if ready."""
    status = _load_skillopt_status()
    last_run = status.get("last_run_at")
    if not last_run:
        return 0.0
    try:
        last_dt = datetime.fromisoformat(last_run)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds()
        return max(0.0, SKILLOPT_COOLDOWN_SECONDS - elapsed)
    except Exception:
        return 0.0


def _should_trigger_skillopt(store: dict[str, Any]) -> bool:
    """Trigger only when enough lessons have accumulated and cooldown has passed."""
    if len(store.get("lessons", [])) < SKILLOPT_MIN_LESSONS:
        return False
    return _skillopt_cooldown_remaining() <= 0.0


def _run_skillopt_thread(lessons: list[dict[str, Any]]) -> None:
    try:
        # Lazy import so learning_tool does not depend on SkillOpt at import time.
        from trading_agent.tools.skillopt import run_skillopt_and_save
        run_skillopt_and_save(lessons)
    except Exception:
        # SkillOpt must never break the trading pipeline.
        pass


def _maybe_trigger_skillopt(store: dict[str, Any]) -> None:
    if not _should_trigger_skillopt(store):
        return
    # Snapshot the lessons so the background thread is isolated from later mutations.
    lessons_snapshot = json.loads(json.dumps(store.get("lessons", [])))
    threading.Thread(target=_run_skillopt_thread, args=(lessons_snapshot,), daemon=True).start()


def _trim_store(store: dict[str, Any]) -> dict[str, Any]:
    store.setdefault("lessons", [])
    store.setdefault("experience_cards", [])
    if len(store["lessons"]) > MAX_LESSONS:
        store["lessons"] = store["lessons"][-MAX_LESSONS:]
    if len(store["experience_cards"]) > MAX_EXPERIENCES:
        store["experience_cards"] = store["experience_cards"][-MAX_EXPERIENCES:]
    return store


def _run_id(task: dict[str, Any], result: dict[str, Any]) -> str:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    ticker = result.get("ticker", task.get("ticker", "?"))
    strategy = result.get("strategy", task.get("strategy", "?"))
    return f"{ticker}_{strategy}_{ts}"


def _classify_outcome(backtest: dict[str, Any]) -> str:
    """Classify a backtest result as positive / negative / neutral."""
    total_ret = backtest.get("total_return", 0) or 0
    sharpe = backtest.get("sharpe_ratio", 0) or 0
    max_dd = backtest.get("max_drawdown", 0) or 0
    # Severe losses or excessive drawdown are unambiguous failures.
    if total_ret < 0 or sharpe < 0 or max_dd < -0.20:
        return "negative"
    # Good outcomes need positive return, decent Sharpe, and controlled drawdown.
    if total_ret > 0 and sharpe >= 0.5 and max_dd >= -0.15:
        return "positive"
    return "neutral"


def _attribute_agents(agent_analysis: dict[str, Any], decision: str, backtest: dict[str, Any]) -> list[dict[str, Any]]:
    """Reflect on the decision flow and attribute poor outcomes to specific agents."""
    outcome = _classify_outcome(backtest)
    if outcome != "negative":
        return []

    dec = str(decision).lower()
    issues: list[dict[str, Any]] = []

    # Vote agents: if an agent voted the same as the final (losing) decision, it shares blame.
    for v in (agent_analysis.get("agent_votes") or []):
        agent_name = v.get("agent", "?")
        vote = str(v.get("vote", "hold")).lower()
        if vote == dec:
            issues.append({
                "agent": agent_name,
                "role": "vote",
                "signal": vote,
                "issue": f"{agent_name} voted {vote.upper()} alongside the final decision, but the run ended with a loss",
            })

    # Critic: if outcome was poor but critic did not strongly object, it missed the problem.
    critic = (agent_analysis.get("critic_review") or {})
    verdict = critic.get("verdict")
    objections = critic.get("main_objections", [])
    if verdict in ("agree", "partial") or not objections:
        issues.append({
            "agent": "Critic",
            "role": "critic",
            "signal": verdict,
            "issue": "Critic did not strongly object despite the poor outcome",
        })

    # Reviser: if it changed the decision and the outcome is still poor, its revision is questionable.
    revision = agent_analysis.get("decision_revision") or {}
    if revision.get("revision_applied"):
        issues.append({
            "agent": "Reviser",
            "role": "reviser",
            "signal": revision.get("final_decision", "?"),
            "issue": "Reviser adjusted the decision but the outcome remained negative",
        })

    # Strategy adjustment agent: if it suggested changes and we still lost, note it.
    adjustments = agent_analysis.get("strategy_adjustments") or []
    if adjustments:
        issues.append({
            "agent": "StrategyAdjustment",
            "role": "adjustment",
            "signal": adjustments,
            "issue": "StrategyAdjustment provided suggestions but did not prevent the loss",
        })

    return issues


def _lesson_context(task: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    backtest = result.get("backtest_result", {}) or {}
    decision = result.get("decision", {}) or {}
    risk = result.get("risk_result", {}) or {}
    sentiment_market = result.get("sentiment_market_result") or risk.get("sentiment_market", {}) or {}
    indicator = result.get("indicator_result", {}) or {}
    news = result.get("news_result", {}) or {}
    agent_analysis = result.get("agent_analysis", {}) or {}
    return {
        "ticker": result.get("ticker", task.get("ticker", "?")),
        "strategy": result.get("strategy", task.get("strategy", "?")),
        "date_range": f"{task.get('start_date', '?')} ~ {task.get('end_date', '?')}",
        "metrics": {
            "decision": decision.get("decision", "hold"),
            "decision_mode": decision.get("decision_mode", "proceed"),
            "confidence": round(decision.get("confidence", 0) * 100, 1),
            "position_pct": round((decision.get("suggested_position_pct", 0) or 0) * 100, 1),
            "total_return_pct": round((backtest.get("total_return") or 0) * 100, 2),
            "sharpe_ratio": round(backtest.get("sharpe_ratio", 0), 2),
            "max_drawdown_pct": round(abs(backtest.get("max_drawdown", 0)) * 100, 2),
            "win_rate_pct": round((backtest.get("win_rate") or 0) * 100, 1),
            "trades": backtest.get("trades") or backtest.get("number_of_trades", 0),
            "risk_score": risk.get("risk_score", 40),
            "risk_level": risk.get("risk_level", "medium"),
            "sentiment_market_risk": sentiment_market.get("sentiment_risk_score", risk.get("sentiment_market_risk", 0)),
            "sentiment_market_zone": sentiment_market.get("risk_zone", risk.get("sentiment_market_zone", "calm")),
            "social_heat": sentiment_market.get("social_heat", 0),
            "rumor_heat": sentiment_market.get("rumor_heat", 0),
            "crowding": sentiment_market.get("crowding", 0),
            "liquidity_score": sentiment_market.get("liquidity_score", 0),
            "rsi": indicator.get("rsi"),
            "macd": indicator.get("macd"),
            "ma20": indicator.get("ma20"),
            "ma60": indicator.get("ma60"),
            "volatility_20d_pct": round((indicator.get("volatility_20d") or 0) * 100, 2),
            "return_20d_pct": round((indicator.get("return_20d") or 0) * 100, 2),
            "news_sentiment": news.get("news_sentiment", "neutral"),
            "news_score": news.get("news_score", 50),
        },
        "agent_consensus": agent_analysis.get("vote_summary", {}),
        "agent_attribution": _attribute_agents(agent_analysis, decision.get("decision", "hold"), backtest),
    }


def _pick_paper_refs(strategy: str, knowledge_base: list[dict[str, Any]]) -> list[str]:
    refs = []
    strategy_lower = str(strategy).lower()
    for kb in knowledge_base:
        if not kb.get("paper"):
            continue
        tags = [str(t).lower() for t in kb.get("tags", [])]
        kb_id = str(kb.get("id", "")).lower()
        if strategy_lower in kb_id or any(strategy_lower in t for t in tags):
            refs.append(kb["paper"])
        elif kb.get("adopted") and len(refs) < 2:
            refs.append(kb["paper"])
    return refs[:3]


def _fallback_lesson(
    context: dict[str, Any],
    knowledge_base: list[dict[str, Any]],
    prior_experiences: list[dict[str, Any]],
) -> dict[str, Any]:
    strategy = context.get("strategy", "?")
    m = context.get("metrics", {}) or {}
    total_ret = m.get("total_return_pct", 0.0)
    sharpe = m.get("sharpe_ratio", 0.0)
    dd = m.get("max_drawdown_pct", 0.0)
    decision = m.get("decision", "hold")
    risk_score = m.get("risk_score", 40)
    sentiment_risk = m.get("sentiment_market_risk", 0)

    attribution = context.get("agent_attribution", [])
    attribution_text_zh = ""
    attribution_text_en = ""
    if attribution:
        parts_zh = [f"{a['agent']}：{a['issue']}" for a in attribution]
        parts_en = [f"{a['agent']}: {a['issue']}" for a in attribution]
        attribution_text_zh = "；需关注责任归因：" + "；".join(parts_zh)
        attribution_text_en = "; attribution: " + "; ".join(parts_en)

    sentiment_text_zh = ""
    sentiment_text_en = ""
    if sentiment_risk and sentiment_risk >= 55:
        sentiment_text_zh = f"、情绪市场风险 {sentiment_risk}/100"
        sentiment_text_en = f", sentiment-market risk {sentiment_risk}/100"

    if total_ret > 0 and sharpe >= 1.0:
        lesson_zh = f"{strategy} 策略本次表现良好：收益 {total_ret:.1f}%，夏普 {sharpe:.2f}，当前市场环境较适合该策略。"
        lesson_en = f"{strategy} performed well: return {total_ret:.1f}%, Sharpe {sharpe:.2f}; current market regime appears favorable."
        tags = ["positive_return", "good_sharpe", "favorable_regime"]
    elif total_ret < 0:
        lesson_zh = f"{strategy} 策略本次收益为负（{total_ret:.1f}%），需关注最大回撤 {dd:.1f}%、风险分数 {risk_score}{sentiment_text_zh}{attribution_text_zh}。"
        lesson_en = f"{strategy} produced negative return ({total_ret:.1f}%); monitor max drawdown {dd:.1f}%, risk score {risk_score}{sentiment_text_en}{attribution_text_en}."
        tags = ["negative_return", "risk_alert", "drawdown_watch"]
    elif sharpe < 0.5 and dd > 15:
        lesson_zh = f"{strategy} 策略夏普过低（{sharpe:.2f}）且回撤较大（{dd:.1f}%），建议收紧仓位或等待更明确信号{attribution_text_zh}。"
        lesson_en = f"{strategy} has low Sharpe ({sharpe:.2f}) and high drawdown ({dd:.1f}%); consider tighter sizing or waiting for clearer signals{attribution_text_en}."
        tags = ["low_sharpe", "high_drawdown", "risk_off"]
    else:
        lesson_zh = f"{strategy} 策略本次表现中性（收益 {total_ret:.1f}%，夏普 {sharpe:.2f}），建议继续观察后续确认。"
        lesson_en = f"{strategy} showed neutral performance (return {total_ret:.1f}%, Sharpe {sharpe:.2f}); continue monitoring for confirmation."
        tags = ["neutral", "watch"]

    if decision.lower() == "hold":
        tags.append("hold_decision")
    elif decision.lower() == "buy":
        tags.append("buy_signal")
    elif decision.lower() == "sell":
        tags.append("sell_signal")

    paper_refs = _pick_paper_refs(strategy, knowledge_base)
    if prior_experiences and not paper_refs:
        paper_refs = list(set(p for exp in prior_experiences for p in exp.get("paper_refs", [])))[:3]

    return {
        "lesson": {"zh": lesson_zh, "en": lesson_en},
        "tags": tags,
        "paper_refs": paper_refs,
        "_source": "rule_fallback",
    }


def _fallback_experience(
    strategy: str,
    lessons: list[dict[str, Any]],
    knowledge_base: list[dict[str, Any]],
) -> dict[str, Any]:
    returns = [l.get("metrics", {}).get("total_return_pct", 0.0) for l in lessons if isinstance(l.get("metrics"), dict)]
    sharpes = [l.get("metrics", {}).get("sharpe_ratio", 0.0) for l in lessons if isinstance(l.get("metrics"), dict)]
    avg_ret = sum(returns) / len(returns) if returns else 0.0
    avg_sharpe = sum(sharpes) / len(sharpes) if sharpes else 0.0

    if avg_ret > 0 and avg_sharpe >= 0.8:
        summary_zh = f"基于 {len(lessons)} 次运行，{strategy} 策略平均收益为正（{avg_ret:.1f}%），夏普 {avg_sharpe:.2f}，表现稳定。"
        summary_en = f"Based on {len(lessons)} runs, {strategy} shows stable positive average returns ({avg_ret:.1f}%) with Sharpe {avg_sharpe:.2f}."
    elif avg_ret < 0:
        summary_zh = f"基于 {len(lessons)} 次运行，{strategy} 策略平均收益为负（{avg_ret:.1f}%），需重新审视参数或择时。"
        summary_en = f"Based on {len(lessons)} runs, {strategy} shows negative average returns ({avg_ret:.1f}%); review parameters or timing."
    else:
        summary_zh = f"基于 {len(lessons)} 次运行，{strategy} 策略表现中性（收益 {avg_ret:.1f}%，夏普 {avg_sharpe:.2f}），需更多样本。"
        summary_en = f"Based on {len(lessons)} runs, {strategy} is neutral (return {avg_ret:.1f}%, Sharpe {avg_sharpe:.2f}); more samples needed."

    all_tags = sorted(set(t for l in lessons for t in l.get("tags", [])))
    all_papers = sorted(set(p for l in lessons for p in l.get("paper_refs", [])))
    if not all_papers:
        all_papers = _pick_paper_refs(strategy, knowledge_base)

    # Aggregate agent attribution across lessons (Hermes reflection)
    agent_counts = Counter(
        a["agent"]
        for l in lessons
        for a in l.get("agent_attribution", [])
        if isinstance(a, dict) and a.get("agent")
    )
    if agent_counts:
        top_agents = agent_counts.most_common(3)
        agents_zh = "，".join(f"{agent} {cnt} 次" for agent, cnt in top_agents)
        agents_en = ", ".join(f"{agent} {cnt} time(s)" for agent, cnt in top_agents)
        summary_zh += f" 常见责任 agent：{agents_zh}。"
        summary_en += f" Frequent responsible agents: {agents_en}."

    return {
        "summary": {"zh": summary_zh, "en": summary_en},
        "key_findings": [{"zh": l.get("lesson", {}).get("zh", ""), "en": l.get("lesson", {}).get("en", "")} for l in lessons[-LESSONS_PER_EXPERIENCE:]],
        "avg_metrics": {"avg_return_pct": round(avg_ret, 2), "avg_sharpe": round(avg_sharpe, 2)},
        "tags": all_tags,
        "paper_refs": all_papers,
        "agent_attribution_summary": dict(agent_counts),
        "_source": "rule_fallback",
    }


_LESSON_SYSTEM_PROMPT = """You are a quantitative trading strategy learning engine.
Analyze the provided run result and generate a structured lesson.
Also consider the PRIOR EXPERIENCES (if any) so the lesson builds on accumulated knowledge.

The run context includes `agent_attribution`: a list of agents whose vote/advice aligned with a poor final decision.
When `agent_attribution` is non-empty, explicitly mention which agents contributed to the problem and what should change next time.

Return valid JSON only, with this schema:
{
  "lesson": {"zh": "中文经验教训，1-2句话，具体且可执行", "en": "English lesson, 1-2 sentences, specific and actionable"},
  "tags": ["tag1", "tag2"],
  "paper_refs": ["Author (Year)", ...]
}

Rules:
- lesson must explain what worked, what didn't, or what conditions favored / hurt the strategy.
- If agent_attribution is provided, name the responsible agents and recommend how to correct their behavior.
- tags should categorize the lesson (e.g., "trend_following", "mean_reversion", "momentum", "volatility", "risk_management", "hold_signal", "agent_fault").
- paper_refs must only reference papers listed in the provided knowledge_base.
- If prior_experiences exist, explicitly contrast or reinforce them.
- Keep each bilingual text under 200 characters.
"""


_EXPERIENCE_SYSTEM_PROMPT = """You are a quantitative trading strategy memory synthesizer.
Given K lessons for the same strategy, produce an experience card that captures the key insight.
Also consider PRIOR EXPERIENCES so the summary evolves rather than repeats.

Each lesson contains `agent_attribution`: agents whose advice aligned with a poor outcome.
Use these attributions to identify recurring weak points in the decision pipeline.

Return valid JSON only, with this schema:
{
  "summary": {"zh": "中文总结", "en": "English summary"},
  "key_findings": [
    {"zh": "中文发现1", "en": "English finding 1"},
    ...
  ],
  "tags": ["tag1", "tag2"],
  "paper_refs": ["Author (Year)", ...]
}

Rules:
- summary should be a concise strategy-level takeaway (2-3 sentences).
- key_findings should list 2-4 concrete, non-redundant observations from the lessons, including any recurring agent failures.
- tags should cover the dominant themes.
- paper_refs must only reference papers listed in knowledge_base.
- Each bilingual text should be under 250 characters.
"""


def generate_lesson(
    task: dict[str, Any],
    result: dict[str, Any],
    knowledge_base: list[dict[str, Any]] | None = None,
    prior_lessons: list[dict[str, Any]] | None = None,
    prior_experiences: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate a single lesson for the latest run, using LLM when enabled."""
    kb = knowledge_base or _default_knowledge_base()
    context = _lesson_context(task, result)
    fallback = _fallback_lesson(context, kb, prior_experiences or [])

    user_payload = {
        "run": context,
        "knowledge_base": [{"paper": k.get("paper", ""), "tags": k.get("tags", []), "adopted": k.get("adopted", False)} for k in kb if k.get("paper")],
        "prior_experiences": [
            {
                "strategy": e.get("strategy"),
                "summary": e.get("summary", {}),
                "tags": e.get("tags", []),
            }
            for e in (prior_experiences or [])[-3:]
        ],
        "recent_lessons": [
            {
                "ticker": l.get("ticker"),
                "metrics": l.get("metrics", {}),
                "lesson": l.get("lesson", {}),
                "tags": l.get("tags", []),
            }
            for l in (prior_lessons or [])[-3:]
        ],
    }

    llm_result = call_llm_json(_LESSON_SYSTEM_PROMPT, user_payload, fallback, temperature=0.3)
    if not isinstance(llm_result, dict):
        return fallback

    lesson_text = llm_result.get("lesson") or fallback["lesson"]
    if isinstance(lesson_text, str):
        lesson_text = {"en": lesson_text, "zh": lesson_text}

    tags = llm_result.get("tags") or fallback["tags"]
    if isinstance(tags, str):
        tags = [tags]

    paper_refs = llm_result.get("paper_refs") or fallback["paper_refs"]
    if isinstance(paper_refs, str):
        paper_refs = [paper_refs]

    return {
        "lesson": lesson_text,
        "tags": list(tags),
        "paper_refs": list(paper_refs),
        "_source": "llm" if llm_result is not fallback else fallback.get("_source", "rule_fallback"),
    }


def summarize_experience(
    strategy: str,
    lessons: list[dict[str, Any]],
    knowledge_base: list[dict[str, Any]] | None = None,
    prior_experiences: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Summarize K lessons into an experience card, using LLM when enabled."""
    kb = knowledge_base or _default_knowledge_base()
    fallback = _fallback_experience(strategy, lessons, kb)

    user_payload = {
        "strategy": strategy,
        "lessons": [
            {
                "ticker": l.get("ticker"),
                "metrics": l.get("metrics", {}),
                "lesson": l.get("lesson", {}),
                "tags": l.get("tags", []),
                "agent_attribution": l.get("agent_attribution", []),
            }
            for l in lessons[-LESSONS_PER_EXPERIENCE:]
        ],
        "knowledge_base": [{"paper": k.get("paper", ""), "tags": k.get("tags", []), "adopted": k.get("adopted", False)} for k in kb if k.get("paper")],
        "prior_experiences": [
            {
                "summary": e.get("summary", {}),
                "tags": e.get("tags", []),
                "agent_attribution_summary": e.get("agent_attribution_summary", {}),
            }
            for e in (prior_experiences or [])[-2:]
        ],
    }

    llm_result = call_llm_json(_EXPERIENCE_SYSTEM_PROMPT, user_payload, fallback, temperature=0.3)
    if not isinstance(llm_result, dict):
        return fallback

    summary = llm_result.get("summary") or fallback["summary"]
    if isinstance(summary, str):
        summary = {"en": summary, "zh": summary}

    findings = llm_result.get("key_findings") or fallback["key_findings"]
    normalized_findings = []
    for f in findings:
        if isinstance(f, str):
            normalized_findings.append({"en": f, "zh": f})
        elif isinstance(f, dict):
            normalized_findings.append({"en": f.get("en", ""), "zh": f.get("zh", "")})

    tags = llm_result.get("tags") or fallback["tags"]
    if isinstance(tags, str):
        tags = [tags]

    paper_refs = llm_result.get("paper_refs") or fallback["paper_refs"]
    if isinstance(paper_refs, str):
        paper_refs = [paper_refs]

    returns = [l.get("metrics", {}).get("total_return_pct", 0.0) for l in lessons if isinstance(l.get("metrics"), dict)]
    sharpes = [l.get("metrics", {}).get("sharpe_ratio", 0.0) for l in lessons if isinstance(l.get("metrics"), dict)]
    avg_ret = round(sum(returns) / len(returns), 2) if returns else 0.0
    avg_sharpe = round(sum(sharpes) / len(sharpes), 2) if sharpes else 0.0

    return {
        "summary": summary,
        "key_findings": normalized_findings,
        "avg_metrics": {"avg_return_pct": avg_ret, "avg_sharpe": avg_sharpe},
        "tags": list(tags),
        "paper_refs": list(paper_refs),
        "_source": "llm" if llm_result is not fallback else fallback.get("_source", "rule_fallback"),
    }


def run_learning_pipeline(
    task: dict[str, Any],
    result: dict[str, Any],
    knowledge_base: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate a lesson, persist it, and create an experience card when enough lessons exist."""
    kb = knowledge_base or _default_knowledge_base()
    store = _load_store()
    store.setdefault("lessons", [])
    store.setdefault("experience_cards", [])

    strategy = result.get("strategy", task.get("strategy", "?"))
    ticker = result.get("ticker", task.get("ticker", "?"))
    run_id = _run_id(task, result)

    prior_lessons = [l for l in store["lessons"] if l.get("strategy") == strategy]
    prior_experiences = [e for e in store["experience_cards"] if e.get("strategy") == strategy]

    # Generate lesson for this run
    lesson_meta = generate_lesson(task, result, kb, prior_lessons, prior_experiences)
    context = _lesson_context(task, result)
    lesson = {
        "run_id": run_id,
        "ticker": ticker,
        "strategy": strategy,
        "date": str(datetime.now())[:10],
        "timestamp": datetime.now().isoformat(),
        "metrics": context["metrics"],
        "agent_attribution": context.get("agent_attribution", []),
        "lesson": lesson_meta["lesson"],
        "tags": lesson_meta["tags"],
        "paper_refs": lesson_meta["paper_refs"],
        "source": lesson_meta.get("_source", "unknown"),
    }
    store["lessons"].append(lesson)

    # Maybe summarize a new experience card
    new_experience = None
    strategy_lessons = [l for l in store["lessons"] if l.get("strategy") == strategy]
    if len(strategy_lessons) >= LESSONS_PER_EXPERIENCE:
        # Check whether we already have an experience for the last K lessons
        recent_ids = {l["run_id"] for l in strategy_lessons[-LESSONS_PER_EXPERIENCE:]}
        already_summarized = any(
            set(e.get("source_lesson_ids", [])) == recent_ids for e in store["experience_cards"] if e.get("strategy") == strategy
        )
        if not already_summarized:
            exp_meta = summarize_experience(strategy, strategy_lessons[-LESSONS_PER_EXPERIENCE:], kb, prior_experiences)
            new_experience = {
                "id": f"exp_{strategy}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "strategy": strategy,
                "created_at": datetime.now().isoformat(),
                "lesson_count": LESSONS_PER_EXPERIENCE,
                "summary": exp_meta["summary"],
                "key_findings": exp_meta["key_findings"],
                "avg_metrics": exp_meta["avg_metrics"],
                "tags": exp_meta["tags"],
                "paper_refs": exp_meta["paper_refs"],
                "source_lesson_ids": list(recent_ids),
                "source": exp_meta.get("_source", "unknown"),
            }
            # Keep only the latest experience card per strategy to avoid duplicates in the UI
            store["experience_cards"] = [e for e in store["experience_cards"] if e.get("strategy") != strategy]
            store["experience_cards"].append(new_experience)

    store = _trim_store(store)
    _save_store(store)
    _maybe_trigger_skillopt(store)

    all_experiences = [e for e in store["experience_cards"] if e.get("strategy") == strategy]
    recent_lessons = [l for l in store["lessons"] if l.get("strategy") == strategy][-5:]

    return {
        "latest_lesson": lesson,
        "recent_lessons": list(reversed(recent_lessons)),
        "experience_cards": list(reversed(all_experiences)),
        "total_lessons": len(store["lessons"]),
        "new_experience": new_experience,
    }
