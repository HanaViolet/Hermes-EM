"""Normalize sentiment-market context for Hermes Agent.

The financial big-data simulator can send social heat, rumor heat, crowding,
liquidity, order-book imbalance, and market sentiment. This module converts
those heterogeneous signals into a compact risk view that the trading agent can
use in both risk gating and decision scoring.
"""
from __future__ import annotations

from typing import Any


def _num(value: Any, default: float) -> float:
    try:
        if value in (None, ""):
            return default
        return float(value)
    except Exception:
        return default


def _pick(data: dict, keys: tuple[str, ...], default: float) -> float:
    for key in keys:
        if key in data:
            return _num(data.get(key), default)
    return default


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _as_percent(value: float) -> float:
    if -1 <= value <= 1:
        return _clamp(value * 100, 0, 100)
    return _clamp(value, 0, 100)


def _as_signed_unit(value: float) -> float:
    if abs(value) > 1:
        value = value / 100
    return _clamp(value, -1, 1)


def default_sentiment_market_context() -> dict:
    return normalize_sentiment_market_context({})


def normalize_sentiment_market_context(context: dict | None) -> dict:
    """Return a normalized sentiment-market risk view.

    Accepted field aliases include:
    - social_heat, socialHeat, heat
    - rumor_heat, rumorHeat
    - alert_heat, alertHeat
    - crowding, crowding_score, crowdingScore
    - liquidity_score, liquidityScore, liquidity
    - order_book_imbalance, orderBookImbalance, imbalance
    - market_sentiment, averageSentiment, sentiment
    - capital_flow_score, capitalFlowScore
    """
    raw = context if isinstance(context, dict) else {}

    social_heat = _as_percent(_pick(raw, ("social_heat", "socialHeat", "heat"), 50))
    if "totalInteractions" in raw and not any(key in raw for key in ("social_heat", "socialHeat", "heat")):
        social_heat = _clamp(_num(raw.get("totalInteractions"), 0) / 20, 0, 100)

    rumor_heat = _as_percent(_pick(raw, ("rumor_heat", "rumorHeat"), 0))
    alert_heat = _as_percent(_pick(raw, ("alert_heat", "alertHeat"), 0))
    crowding = _as_percent(_pick(raw, ("crowding", "crowding_score", "crowdingScore"), 35))
    liquidity_score = _as_percent(_pick(raw, ("liquidity_score", "liquidityScore", "liquidity"), 70))
    order_book_imbalance = _as_signed_unit(_pick(raw, ("order_book_imbalance", "orderBookImbalance", "imbalance"), 0))
    market_sentiment = _as_signed_unit(_pick(raw, ("market_sentiment", "averageSentiment", "sentiment"), 0))
    capital_flow_score = _clamp(_pick(raw, ("capital_flow_score", "capitalFlowScore", "capitalFlow"), 0), -100, 100)

    social_overheat = _clamp((social_heat - 60) / 40, 0, 1) * 20
    rumor_component = rumor_heat / 100 * 22
    alert_component = alert_heat / 100 * 18
    crowding_component = crowding / 100 * 18
    liquidity_component = (100 - liquidity_score) / 100 * 14
    sell_pressure_component = _clamp((-order_book_imbalance - 0.15) / 0.85, 0, 1) * 8
    euphoric_component = 6 if market_sentiment > 0.55 and social_heat > 70 else 0
    panic_component = 8 if market_sentiment < -0.45 and social_heat > 60 else 0

    sentiment_risk_score = round(_clamp(
        social_overheat
        + rumor_component
        + alert_component
        + crowding_component
        + liquidity_component
        + sell_pressure_component
        + euphoric_component
        + panic_component,
        0,
        100,
    ))

    if sentiment_risk_score >= 75:
        risk_zone = "panic" if market_sentiment < -0.2 or order_book_imbalance < -0.25 else "overheated"
    elif sentiment_risk_score >= 55:
        risk_zone = "overheated"
    elif sentiment_risk_score >= 30:
        risk_zone = "watch"
    else:
        risk_zone = "calm"

    risk_flags: list[str] = []
    if social_heat >= 75:
        risk_flags.append("social_overheat")
    if rumor_heat >= 40:
        risk_flags.append("rumor_spike")
    if alert_heat >= 35:
        risk_flags.append("alert_spike")
    if crowding >= 65:
        risk_flags.append("crowding")
    if liquidity_score <= 45:
        risk_flags.append("thin_liquidity")
    if order_book_imbalance <= -0.25:
        risk_flags.append("sell_pressure")
    if market_sentiment <= -0.45:
        risk_flags.append("panic_sentiment")
    if market_sentiment >= 0.55 and social_heat >= 70:
        risk_flags.append("euphoric_sentiment")

    direction = "偏多" if market_sentiment > 0.15 else "偏空" if market_sentiment < -0.15 else "中性"
    summary_zh = (
        f"情绪市场{direction}，社交热度 {social_heat:.0f}/100，传闻热度 {rumor_heat:.0f}/100，"
        f"拥挤度 {crowding:.0f}/100，流动性 {liquidity_score:.0f}/100，"
        f"情绪风险 {sentiment_risk_score}/100（{risk_zone}）。"
    )
    summary_en = (
        f"Sentiment is {direction}; social heat {social_heat:.0f}/100, rumor heat {rumor_heat:.0f}/100, "
        f"crowding {crowding:.0f}/100, liquidity {liquidity_score:.0f}/100, "
        f"sentiment risk {sentiment_risk_score}/100 ({risk_zone})."
    )

    return {
        "social_heat": round(social_heat, 2),
        "rumor_heat": round(rumor_heat, 2),
        "alert_heat": round(alert_heat, 2),
        "crowding": round(crowding, 2),
        "liquidity_score": round(liquidity_score, 2),
        "order_book_imbalance": round(order_book_imbalance, 4),
        "market_sentiment": round(market_sentiment, 4),
        "capital_flow_score": round(capital_flow_score, 2),
        "sentiment_risk_score": sentiment_risk_score,
        "risk_zone": risk_zone,
        "risk_flags": risk_flags,
        "summary_zh": summary_zh,
        "summary_en": summary_en,
    }
