"""
Dynamic Risk Scoring — regime-aware risk assessment with
position sizing recommendations.
"""
from __future__ import annotations


def compute_dynamic_risk_score(
    backtest: dict,
    indicators: dict,
    regime: dict,
) -> dict:
    """Compute a regime-aware risk score (0-100) and position constraints."""
    max_drawdown = abs(backtest.get("max_drawdown", 0))
    volatility = indicators.get("volatility_20d", 0)
    vol_percentile = regime.get("volatility_percentile", 0.5)
    trend_regime = regime.get("trend_regime", "range_bound")

    risk_score = 0.0

    # Drawdown contribution (max 40 points)
    risk_score += min(max_drawdown / 0.35, 1.0) * 40

    # Volatility contribution (max 30 points)
    risk_score += min(vol_percentile, 1.0) * 30

    # Trend penalty
    if trend_regime == "downtrend":
        risk_score += 20
    elif trend_regime == "range_bound":
        risk_score += 10
    # uptrend: no penalty

    risk_score = min(round(risk_score), 100)

    # Risk level
    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    # Position sizing
    position_pct = _suggest_position(risk_score)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "position_pct": position_pct,
        "drawdown_contribution": round(min(max_drawdown / 0.35, 1.0) * 40),
        "volatility_contribution": round(min(vol_percentile, 1.0) * 30),
        "trend_penalty": 20 if trend_regime == "downtrend" else 10 if trend_regime == "range_bound" else 0,
    }


def _suggest_position(risk_score: int) -> float:
    if risk_score >= 80:
        return 0.05  # Almost no position
    elif risk_score >= 60:
        return 0.25
    elif risk_score >= 40:
        return 0.40
    elif risk_score >= 25:
        return 0.55
    else:
        return 0.70
