"""
Decision Reviser V1.5 — two-stage decision making:
  initial_decision -> critic_review -> final_decision

Supports decision modes:
  proceed          : confident, execute as planned
  proceed_with_caution : minor concerns, smaller position
  wait_for_confirmation : hold with watch conditions
  risk_off         : defensive hold due to risk
  watchlist        : actively monitoring for trigger
"""
from __future__ import annotations


def revise_decision(
    initial_decision: str,
    decision_score: float,
    confidence: float,
    critic_review: dict,
    risk: dict,
    indicators: dict,
    backtest: dict,
    news: dict | None = None,
) -> dict:
    """
    Apply critic review to produce a revised final decision.

    Returns:
        final_decision, decision_mode, watch_priority,
        revision_applied, revision_reason,
        suggested_position_before, suggested_position_after
    """
    init = initial_decision.lower()
    risk_score = risk.get("risk_score", 40)
    position_pct = risk.get("position_pct", 0.35)

    critic = critic_review.get("critic_review", {})
    critic_score = critic.get("critic_score", 70)
    main_objections = critic.get("main_objections", [])
    revision = critic.get("revision_suggestion", {})
    rev_action = revision.get("action", "keep")
    rev_delta = revision.get("position_delta", 0.0)
    rev_reason = revision.get("reason", "")

    # ── Compute decision mode ──
    mode = _decide_mode(init, critic_score, len(main_objections), risk_score, rev_action)

    # ── Determine watch priority ──
    watch_priority = _watch_priority(init, mode, risk_score, critic_score, indicators, backtest, news)

    # ── Position sizing ──
    pos_before = position_pct
    pos_after = _adjust_position(init, mode, position_pct, rev_delta, risk_score, critic_score)

    # ── Revision applied? ──
    revision_applied = rev_action != "keep" or abs(pos_after - pos_before) > 0.01

    revision_reason = ""
    if revision_applied:
        if rev_reason:
            revision_reason = rev_reason
        elif mode == "wait_for_confirmation":
            revision_reason = "Critic Agent suggests waiting for stronger confirmation before acting."
        elif mode == "proceed_with_caution":
            revision_reason = "Critic has minor objections; proceed with reduced position."
        elif mode == "risk_off":
            revision_reason = "Elevated risk environment requires defensive positioning."
        else:
            revision_reason = "Critic review suggests adjusting the initial decision."

    # ── Final decision ──
    final = _apply_revision_to_decision(init, mode, rev_action)

    return {
        "decision_revision": {
            "initial_decision": init,
            "final_decision": final,
            "decision_mode": mode,
            "watch_priority": watch_priority,
            "revision_applied": revision_applied,
            "revision_reason": revision_reason,
            "suggested_position_before": round(pos_before, 2),
            "suggested_position_after": round(pos_after, 2),
            "critic_score": critic_score,
            "objection_count": len(main_objections),
        },
        "final_decision": final,
        "final_confidence": round(_adjust_confidence(confidence, critic_score, mode), 2),
        "final_position_pct": round(pos_after, 2),
    }


def _decide_mode(decision: str, critic_score: int, objection_count: int,
                 risk_score: int, rev_action: str) -> str:
    """Determine decision mode based on critic and risk."""

    # Risk-off override
    if risk_score >= 70:
        return "risk_off"
    if risk_score >= 55 and decision == "buy":
        return "proceed_with_caution"

    # Strong critic disagreement
    if critic_score < 40:
        return "wait_for_confirmation"
    if critic_score < 55 and objection_count >= 2:
        return "wait_for_confirmation"

    # Moderate concerns
    if critic_score < 65 or objection_count >= 1:
        if rev_action in ("reduce_size", "wait"):
            return "proceed_with_caution" if decision == "buy" else "wait_for_confirmation"
        if decision == "hold" and rev_action == "raise_watch":
            return "watchlist"
        return "proceed_with_caution"

    # Confident
    if decision == "hold" and rev_action == "raise_watch":
        return "watchlist"

    return "proceed"


def _watch_priority(decision: str, mode: str, risk_score: int,
                    critic_score: int, indicators: dict, backtest: dict,
                    news: dict | None = None) -> str:
    """Determine watch priority for non-active decisions."""
    rsi = indicators.get("rsi", 50)
    macd = indicators.get("macd", 0)
    news_score = float((news or {}).get("news_score", 50))
    sharpe = backtest.get("sharpe_ratio", 0)

    score = 0

    # Proximity to trigger thresholds
    if rsi is not None:
        if 30 <= rsi <= 35 or 65 <= rsi <= 70:
            score += 3
        elif 35 < rsi < 40 or 60 < rsi < 65:
            score += 1

    if macd is not None:
        if abs(macd) < 0.3:
            score += 2

    # News proximity
    if 55 <= news_score <= 65:
        score += 2
    elif 45 <= news_score <= 55:
        score += 1

    # Backtest quality
    if sharpe > 0.5:
        score += 1

    # Critic score (lower = more uncertain = higher watch)
    if critic_score < 50:
        score += 3
    elif critic_score < 65:
        score += 1

    if mode == "watchlist":
        score += 2
    elif mode == "wait_for_confirmation":
        score += 1

    if score >= 6:
        return "high"
    elif score >= 3:
        return "medium"
    return "low"


def _adjust_position(decision: str, mode: str, base_pos: float,
                     rev_delta: float, risk_score: int, critic_score: int) -> float:
    """Adjust position size based on mode and critic."""
    pos = base_pos + rev_delta

    if decision == "sell":
        return 0.0

    if mode == "risk_off":
        pos = min(pos, 0.15)
    elif mode == "proceed_with_caution":
        pos = min(pos, base_pos * 0.7)
    elif mode == "wait_for_confirmation":
        pos = 0.0
    elif mode == "watchlist":
        pos = min(pos, base_pos * 0.5)

    # Risk hard caps
    if risk_score >= 80:
        pos = min(pos, 0.05)
    elif risk_score >= 60:
        pos = min(pos, 0.25)
    elif risk_score >= 40:
        pos = min(pos, 0.40)

    # Critic hard cap
    if critic_score < 40:
        pos = min(pos, 0.10)
    elif critic_score < 55:
        pos = min(pos, 0.25)

    return max(0.0, min(0.80, pos))


def _apply_revision_to_decision(initial: str, mode: str, rev_action: str) -> str:
    """Map mode and revision action to final decision string."""
    # Buy can be downgraded to hold
    if initial == "buy":
        if mode in ("wait_for_confirmation", "risk_off", "watchlist"):
            return "hold"
        if rev_action == "wait":
            return "hold"
        return "buy"

    # Sell can be downgraded to hold
    if initial == "sell":
        if mode in ("wait_for_confirmation", "watchlist"):
            return "hold"
        if rev_action == "reconsider":
            return "hold"
        return "sell"

    # Hold stays hold, but mode changes
    return "hold"


def _adjust_confidence(base_conf: float, critic_score: int, mode: str) -> float:
    """Adjust confidence based on critic review."""
    adj = base_conf

    if mode == "proceed":
        adj = max(adj, 0.70)
    elif mode == "proceed_with_caution":
        adj = min(adj, 0.75)
    elif mode == "watchlist":
        adj = min(adj, 0.65)
    elif mode == "wait_for_confirmation":
        adj = min(adj, 0.55)
    elif mode == "risk_off":
        adj = min(adj, 0.50)

    # Critic dampening
    if critic_score < 40:
        adj *= 0.70
    elif critic_score < 55:
        adj *= 0.85
    elif critic_score < 65:
        adj *= 0.95

    return min(0.95, max(0.25, adj))
