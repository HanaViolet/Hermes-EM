"""
Plan Agent — generates trigger conditions and a monitoring plan
based on the final decision and current indicator state.
"""
from __future__ import annotations


def generate_plan(
    decision: str,
    indicators: dict,
    risk: dict,
    critic_review: dict,
) -> dict:
    """Return trigger conditions and monitoring plan."""
    triggers = []
    plan = []

    rsi = indicators.get("rsi", 50)
    macd = indicators.get("macd", 0)
    macd_signal = indicators.get("macd_signal", 0)
    vol = indicators.get("volatility_20d", 0.15)
    risk_score = risk.get("risk_score", 40)

    # ── Trigger Conditions ──
    if decision == "hold":
        triggers.append({"condition": f"Risk Score < 35 (current: {risk_score})", "type": "entry"})
        if rsi is not None:
            triggers.append({"condition": f"RSI < 30 (current: {round(rsi, 1)})", "type": "momentum"})
        if macd is not None and macd_signal is not None:
            triggers.append({"condition": "MACD > signal for 3 consecutive days", "type": "confirmation"})
        triggers.append({"condition": "News Score > 70", "type": "sentiment"})

    elif decision == "buy":
        triggers.append({"condition": f"Max drawdown < -10%", "type": "stop_loss"})
        if rsi is not None:
            triggers.append({"condition": f"RSI > 75 (overbought warning, current: {round(rsi, 1)})", "type": "exit"})
        triggers.append({"condition": f"Risk Score > 60 (current: {risk_score})", "type": "re_evaluate"})

    elif decision == "sell":
        triggers.append({"condition": f"RSI < 25 (oversold bounce, current: {round(rsi, 1) if rsi else 50})", "type": "re_entry"})
        triggers.append({"condition": "MACD crosses above signal", "type": "confirmation"})

    # Volatility-based triggers
    if vol > 0.25:
        triggers.append({"condition": f"Volatility drops below 25% (current: {round(vol * 100, 1)}%)", "type": "stability"})

    # ── Monitoring Plan ──
    plan.append({"action": "Re-check next trading day", "priority": "high"})

    if macd is not None and macd_signal is not None:
        if abs(macd - macd_signal) < 0.3:
            plan.append({"action": "Monitor MACD crossover closely", "priority": "high"})
        else:
            plan.append({"action": "Monitor MACD divergence", "priority": "medium"})

    if vol > 0.20:
        plan.append({"action": "Watch volatility expansion", "priority": "medium"})

    concerns = critic_review.get("concerns", [])
    if any("News" in c for c in concerns):
        plan.append({"action": "Re-run news sentiment if major macro event appears", "priority": "medium"})

    if decision == "hold":
        plan.append({"action": "Wait for trigger condition fulfillment before entry", "priority": "high"})

    return {
        "trigger_conditions": triggers,
        "monitor_plan": plan,
    }
