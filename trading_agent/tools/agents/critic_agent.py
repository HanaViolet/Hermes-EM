"""
Critic Agent — reviews the aggregated votes and final decision,
produces concerns and explains why the opposite action is not taken.
"""
from __future__ import annotations


def review_decision(
    votes: list[dict],
    decision: str,
    indicators: dict,
    risk: dict,
    backtest: dict,
) -> dict:
    """Return critic review with verdict, concerns, and why-nots."""
    concerns = []
    why_not_buy = []
    why_not_sell = []

    # Check each dimension against the final decision
    for v in votes:
        if v["vote"] != decision and v["vote"] != "hold":
            concerns.append(f"{v['agent']} signals {v['vote'].upper()} (score {v['score']})")

    # Risk-specific concerns
    risk_score = risk.get("risk_score", 40)
    if risk_score >= 40:
        why_not_buy.append("Risk gate blocks aggressive entry")
    if risk_score >= 60:
        concerns.append("High risk environment — position should be limited")

    # Indicator-specific concerns
    macd = indicators.get("macd", 0)
    rsi = indicators.get("rsi", 50)
    if macd is not None and abs(macd) < 0.5:
        why_not_buy.append("MACD confirmation is weak")
        why_not_sell.append("MACD lacks directional momentum")
    if rsi is not None and 40 <= rsi <= 60:
        why_not_buy.append("RSI is neutral — no oversold signal")
        why_not_sell.append("RSI is neutral — no overbought signal")

    # Backtest-specific concerns
    sharpe = backtest.get("sharpe_ratio", 0)
    max_dd = backtest.get("max_drawdown", 0)
    if sharpe < 0.5:
        why_not_buy.append("Backtest Sharpe is below threshold")
    if max_dd < -0.20:
        concerns.append("Historical max drawdown exceeds -20%")

    # Verdict
    disagree_count = sum(1 for v in votes if v["vote"] != decision and v["vote"] != "hold")
    if disagree_count == 0:
        verdict = "agree"
    elif disagree_count <= 1:
        verdict = "partial"
    else:
        verdict = "disagree"

    return {
        "critic_review": {
            "verdict": verdict,
            "concerns": concerns,
            "why_not_buy": why_not_buy,
            "why_not_sell": why_not_sell,
            "recommendation": _recommendation(verdict, decision, concerns),
        },
    }


def _recommendation(verdict: str, decision: str, concerns: list) -> str:
    if verdict == "agree":
        return f"All dimensions align with {decision.upper()}. Proceed with standard risk controls."
    if verdict == "partial":
        return f"{decision.upper()} is supported but with reservations. Review concerns before execution."
    return f"{decision.upper()} is not well supported. Consider reducing position size or waiting for confirmation."
