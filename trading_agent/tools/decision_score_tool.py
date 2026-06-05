"""
Score-Based Decision Agent — combines strategy scores, risk assessment,
regime fit, and memory into a weighted final decision.
"""
from __future__ import annotations


def compute_decision_score(
    regime: dict,
    risk: dict,
    strategy_scores: list[dict],
    memory: dict,
    indicators: dict,
    backtest: dict,
) -> dict:
    """
    Compute a weighted decision score and derive Buy/Sell/Hold.
    """
    # Strategy: best score from candidates (0-100)
    best_strategy = strategy_scores[0] if strategy_scores else {"name": "?", "score": 50}
    strategy_score = best_strategy.get("score", 50)

    # Regime fit: use strategy-specific fit from regime (0-100)
    strategy_name = best_strategy.get("name", "ma")
    regime_fit = regime.get("strategy_fit", {}).get(strategy_name, 50)

    # Risk: invert so higher = better
    risk_score_val = risk.get("risk_score", 40)
    risk_adjusted = 100 - risk_score_val

    # Backtest: normalize Sharpe to 0-100
    sharpe = backtest.get("sharpe_ratio", 0)
    backtest_score = min(100, max(0, (sharpe + 0.5) * 60))

    # Indicator: signal strength
    rsi = indicators.get("rsi", 50)
    ind_score = 50
    if rsi is not None:
        if rsi < 30:
            ind_score = 75  # Oversold → potential buy
        elif rsi > 70:
            ind_score = 25  # Overbought → potential sell
        else:
            ind_score = 50 + (50 - abs(rsi - 50))  # Closer to 50 = less signal

    # Memory
    mem = memory.get("memory_score", 0)

    # Weighted total
    decision_score = (
        0.35 * strategy_score
        + 0.20 * regime_fit
        + 0.20 * risk_adjusted
        + 0.10 * backtest_score
        + 0.10 * ind_score
        + 0.05 * max(-10, min(10, mem))
    )

    # Decision rule
    if decision_score >= 65 and risk_score_val < 50:
        action = "buy"
    elif decision_score <= 35:
        action = "sell"
    else:
        action = "hold"

    confidence = min(max(abs(decision_score - 50) / 50, 0.25), 0.95)
    position_pct = risk.get("position_pct", 0.35)
    if action == "sell":
        position_pct = 0
    elif action == "hold":
        position_pct = min(position_pct, 0.35)

    return {
        "decision": action,
        "confidence": round(confidence, 2),
        "decision_score": round(decision_score),
        "suggested_position_pct": position_pct,
        "breakdown": {
            "strategy_score": round(strategy_score),
            "regime_fit": round(regime_fit),
            "risk_adjusted": round(risk_adjusted),
            "backtest_score": round(backtest_score),
            "indicator_score": round(ind_score),
            "memory_boost": mem,
        },
        "reason": _reason(action, decision_score, risk_score_val, regime, best_strategy),
    }


def _reason(action, score, risk, regime, best) -> str:
    trend = regime.get("trend_regime", "range_bound")
    st_name = best.get("name", "?")
    if action == "buy":
        return f"决策得分 {score} 较高，{st_name} 策略信号强，风险可控，建议买入。"
    elif action == "sell":
        return f"决策得分 {score} 偏低，市场信号弱或风险过高，建议卖出。"
    else:
        parts = [f"决策得分 {score}，"]
        if risk >= 40:
            parts.append("风险约束限制仓位，")
        if trend == "range_bound":
            parts.append("趋势确认不足，")
        parts.append(f"选择 Hold。")
        return "".join(parts)
