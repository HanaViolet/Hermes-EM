"""
Market Regime Detection — identifies trend and volatility regimes
to help the Agent make context-aware trading decisions.
"""
from __future__ import annotations
import pandas as pd


def detect_market_regime(df: pd.DataFrame) -> dict:
    """
    Classify the current market into trend and volatility regimes.

    Returns:
        trend_regime: "uptrend" | "downtrend" | "range_bound"
        volatility_regime: "high_volatility" | "normal_volatility" | "low_volatility"
        trend_strength: numeric strength of trend
        volatility_percentile: where current vol sits in historical distribution
    """
    latest = df.iloc[-1]

    ma20 = latest.get("ma20")
    ma60 = latest.get("ma60")
    volatility_20d = latest.get("volatility_20d")
    return_20d = latest.get("return_20d")

    # Trend regime
    trend_strength = (ma20 - ma60) / ma60 if ma60 and ma60 != 0 else 0

    if trend_strength > 0.03 and return_20d and return_20d > 0:
        trend_regime = "uptrend"
    elif trend_strength < -0.03 and return_20d and return_20d < 0:
        trend_regime = "downtrend"
    else:
        trend_regime = "range_bound"

    # Volatility regime
    if "volatility_20d" in df.columns:
        vol_rank = df["volatility_20d"].rank(pct=True)
        vol_percentile = float(vol_rank.iloc[-1])
    else:
        vol_percentile = 0.5

    if vol_percentile > 0.8:
        volatility_regime = "high_volatility"
    elif vol_percentile < 0.3:
        volatility_regime = "low_volatility"
    else:
        volatility_regime = "normal_volatility"

    # Regime fit scores for common strategies
    strategy_fit = {
        "momentum": _momentum_fit(trend_regime, volatility_regime),
        "ma": _ma_fit(trend_regime, volatility_regime),
        "rsi": _rsi_fit(trend_regime, volatility_regime),
    }

    return {
        "trend_regime": trend_regime,
        "volatility_regime": volatility_regime,
        "trend_strength": round(trend_strength, 4),
        "volatility_percentile": round(vol_percentile, 2),
        "strategy_fit": strategy_fit,
        "interpretation": _interpret(trend_regime, volatility_regime, trend_strength),
    }


def _momentum_fit(trend: str, vol: str) -> int:
    """How well momentum strategy fits current regime (0-100)."""
    score = 50
    if trend == "uptrend": score += 30
    elif trend == "downtrend": score -= 20
    if vol == "high_volatility": score -= 15
    elif vol == "low_volatility": score += 10
    return max(0, min(100, score))


def _ma_fit(trend: str, vol: str) -> int:
    score = 50
    if trend in ("uptrend", "downtrend"): score += 25
    else: score -= 10
    if vol == "high_volatility": score -= 10
    return max(0, min(100, score))


def _rsi_fit(trend: str, vol: str) -> int:
    score = 50
    if trend == "range_bound": score += 30
    elif trend == "downtrend": score += 10
    if vol == "high_volatility": score += 10
    elif vol == "low_volatility": score -= 10
    return max(0, min(100, score))


def _interpret(trend: str, vol: str, strength: float) -> str:
    parts = []
    if trend == "uptrend":
        parts.append("市场处于上升趋势")
    elif trend == "downtrend":
        parts.append("市场处于下降趋势")
    else:
        parts.append("市场处于震荡状态")

    if vol == "high_volatility":
        parts.append("波动率偏高")
    elif vol == "low_volatility":
        parts.append("波动率偏低")
    else:
        parts.append("波动率正常")

    if trend == "range_bound":
        parts.append("趋势信号不强，不适合激进追涨。")
    elif trend == "uptrend" and vol != "high_volatility":
        parts.append("适合跟随趋势策略。")
    elif trend == "downtrend":
        parts.append("建议谨慎或考虑防御型策略。")

    return "，".join(parts)
