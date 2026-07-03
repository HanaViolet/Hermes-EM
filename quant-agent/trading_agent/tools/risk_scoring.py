"""Regime-aware risk scoring with sentiment-market constraints."""
from __future__ import annotations

from trading_agent.tools.sentiment_market_tool import normalize_sentiment_market_context


def compute_dynamic_risk_score(
    backtest: dict,
    indicators: dict,
    regime: dict,
    sentiment_market: dict | None = None,
) -> dict:
    """Compute a 0-100 risk score and position constraints."""
    max_drawdown = abs(float(backtest.get("max_drawdown", 0) or 0))
    vol_percentile = float(regime.get("volatility_percentile", 0.5) or 0.5)
    trend_regime = regime.get("trend_regime", "range_bound")
    sentiment_view = normalize_sentiment_market_context(sentiment_market)

    drawdown_contribution = min(max_drawdown / 0.35, 1.0) * 40
    volatility_contribution = min(max(vol_percentile, 0), 1.0) * 30
    trend_penalty = 20 if trend_regime == "downtrend" else 10 if trend_regime == "range_bound" else 0
    sentiment_contribution = sentiment_view["sentiment_risk_score"] * 0.30

    risk_score = min(round(drawdown_contribution + volatility_contribution + trend_penalty + sentiment_contribution), 100)

    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    position_pct = _suggest_position(risk_score)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "position_pct": position_pct,
        "drawdown_contribution": round(drawdown_contribution),
        "volatility_contribution": round(volatility_contribution),
        "trend_penalty": trend_penalty,
        "sentiment_contribution": round(sentiment_contribution),
        "sentiment_market_risk": sentiment_view["sentiment_risk_score"],
        "sentiment_market_zone": sentiment_view["risk_zone"],
        "sentiment_market_flags": sentiment_view["risk_flags"],
        "sentiment_market_summary": sentiment_view["summary_zh"],
        "sentiment_market": sentiment_view,
    }


def _suggest_position(risk_score: int) -> float:
    if risk_score >= 80:
        return 0.05
    if risk_score >= 60:
        return 0.25
    if risk_score >= 40:
        return 0.40
    if risk_score >= 25:
        return 0.55
    return 0.70
