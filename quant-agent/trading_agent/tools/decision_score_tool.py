"""Score-based decision agent for Hermes."""
from __future__ import annotations

from trading_agent.tools.sentiment_market_tool import normalize_sentiment_market_context


def compute_decision_score(
    regime: dict,
    risk: dict,
    strategy_scores: list[dict],
    memory: dict,
    indicators: dict,
    backtest: dict,
    news_result: dict | None = None,
    sentiment_market: dict | None = None,
) -> dict:
    """Compute a weighted Buy/Sell/Hold decision."""
    best_strategy = strategy_scores[0] if strategy_scores else {"name": "?", "score": 50}
    strategy_score = best_strategy.get("blended_score", best_strategy.get("adjusted_score", best_strategy.get("score", 50)))

    strategy_name = best_strategy.get("name", "ma")
    regime_fit = regime.get("strategy_fit", {}).get(strategy_name, 50)

    risk_score_val = float(risk.get("risk_score", 40) or 40)
    risk_adjusted = 100 - risk_score_val

    sentiment_view = normalize_sentiment_market_context(sentiment_market or risk.get("sentiment_market"))
    sentiment_risk = float(sentiment_view["sentiment_risk_score"])
    sentiment_adjusted = 100 - sentiment_risk
    market_sentiment = float(sentiment_view["market_sentiment"])

    news_score = float((news_result or {}).get("news_score", 50))
    sharpe = float(backtest.get("sharpe_ratio", 0) or 0)
    backtest_score = min(100, max(0, (sharpe + 0.5) * 60))

    rsi = indicators.get("rsi", 50)
    ind_score = 50
    if rsi is not None:
      rsi_value = float(rsi)
      if rsi_value < 30:
          ind_score = 75
      elif rsi_value > 70:
          ind_score = 25
      else:
          ind_score = 50 + (50 - rsi_value) * 1.25

    mem = float(memory.get("memory_score", 0) or 0)

    decision_score = (
        0.28 * float(strategy_score)
        + 0.16 * float(regime_fit)
        + 0.16 * risk_adjusted
        + 0.12 * sentiment_adjusted
        + 0.10 * backtest_score
        + 0.09 * ind_score
        + 0.07 * news_score
        + 0.02 * max(-10, min(10, mem))
    )

    if market_sentiment > 0.30 and sentiment_risk < 55:
        decision_score += 3
    elif market_sentiment < -0.30:
        decision_score -= 4
    if sentiment_risk >= 70:
        decision_score -= 5

    if decision_score <= 35 or (sentiment_risk >= 75 and market_sentiment < -0.25):
        action = "sell"
    elif decision_score >= 65 and risk_score_val < 50 and sentiment_risk < 65:
        action = "buy"
    else:
        action = "hold"

    confidence = min(max(abs(decision_score - 50) / 50, 0.25), 0.95)
    position_pct = float(risk.get("position_pct", 0.35) or 0.35)
    if sentiment_risk >= 75:
        position_pct = min(position_pct, 0.15)
    elif sentiment_risk >= 60:
        position_pct = min(position_pct, 0.25)

    if action == "sell":
        position_pct = 0
    elif action == "hold":
        position_pct = min(position_pct, 0.35)

    return {
        "decision": action,
        "confidence": round(confidence, 2),
        "decision_score": round(decision_score),
        "suggested_position_pct": round(position_pct, 4),
        "breakdown": {
            "strategy_score": round(float(strategy_score)),
            "regime_fit": round(float(regime_fit)),
            "risk_adjusted": round(risk_adjusted),
            "sentiment_adjusted": round(sentiment_adjusted),
            "backtest_score": round(backtest_score),
            "indicator_score": round(ind_score),
            "news_score": round(news_score),
            "memory_boost": mem,
        },
        "sentiment_market": sentiment_view,
        "reason": _reason(action, decision_score, risk_score_val, sentiment_view, regime, best_strategy),
    }


def _reason(action: str, score: float, risk_score: float, sentiment_view: dict, regime: dict, best: dict) -> str:
    trend = regime.get("trend_regime", "range_bound")
    strategy_name = best.get("name", "?")
    sentiment_risk = sentiment_view.get("sentiment_risk_score", 0)
    zone = sentiment_view.get("risk_zone", "calm")
    if action == "buy":
        return (
            f"决策分 {score:.1f} 较高，{strategy_name} 策略信号较强；"
            f"风险分 {risk_score:.0f}、情绪风险 {sentiment_risk}/100（{zone}）仍在可控区间，建议买入。"
        )
    if action == "sell":
        return (
            f"决策分 {score:.1f} 偏低，风险分 {risk_score:.0f}，"
            f"情绪风险 {sentiment_risk}/100（{zone}），建议降低或卖出仓位。"
        )
    parts = [f"决策分 {score:.1f}，当前选择 Hold。"]
    if risk_score >= 40:
        parts.append("风险约束限制新增仓位。")
    if sentiment_risk >= 55:
        parts.append("社交热度、传闻或拥挤度提示情绪链过热。")
    if trend == "range_bound":
        parts.append("趋势确认不足。")
    return "".join(parts)
