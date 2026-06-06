"""
Strategy Adjustment Agent — suggests parameter tweaks based on
critic feedback and current risk/backtest profile.
"""
from __future__ import annotations


def suggest_adjustments(
    critic_review: dict,
    risk: dict,
    backtest: dict,
) -> dict:
    """Return a list of parameter adjustments."""
    adjustments = []
    risk_score = risk.get("risk_score", 40)
    max_dd = backtest.get("max_drawdown", 0)
    sharpe = backtest.get("sharpe_ratio", 0)
    position_pct = risk.get("position_pct", 0.35)

    # Position size adjustment
    if risk_score >= 50:
        new_pos = max(0.10, position_pct * 0.7)
        adjustments.append({
            "parameter": "position_size",
            "current": f"{int(position_pct * 100)}%",
            "suggested": f"{int(new_pos * 100)}%",
            "reason": "High risk score suggests reducing exposure",
        })
    elif risk_score <= 25 and sharpe > 0.8:
        new_pos = min(0.80, position_pct * 1.2)
        adjustments.append({
            "parameter": "position_size",
            "current": f"{int(position_pct * 100)}%",
            "suggested": f"{int(new_pos * 100)}%",
            "reason": "Low risk + strong Sharpe supports larger position",
        })

    # Stop-loss adjustment
    if max_dd < -0.20:
        adjustments.append({
            "parameter": "stop_loss",
            "current": "-15%",
            "suggested": "-10%",
            "reason": "Historical max drawdown is severe — tighten stop",
        })
    elif max_dd > -0.08 and sharpe > 1.0:
        adjustments.append({
            "parameter": "stop_loss",
            "current": "-15%",
            "suggested": "-18%",
            "reason": "Stable history with high Sharpe — allow wider stop",
        })

    # Risk gate adjustment
    if risk_score >= 60:
        adjustments.append({
            "parameter": "risk_gate",
            "current": "Score < 70",
            "suggested": "Score < 50",
            "reason": "Elevated risk environment — lower risk tolerance",
        })

    return {"strategy_adjustments": adjustments}
