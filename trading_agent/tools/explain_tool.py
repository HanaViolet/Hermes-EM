"""
Explain Agent — generates rule-based natural language explanations,
counterfactuals, and reasoning chains from trading results.
No LLM required.
"""
from __future__ import annotations


def explain_decision(context: dict) -> dict:
    """
    Generate structured explanation from trading context.

    Args:
        context: dict with keys:
            decision_result, risk_result, regime_result,
            strategy_result, indicator_result, strategy_scores
    """
    decision = context.get("decision_result", {})
    risk = context.get("risk_result", {})
    regime = context.get("regime_result", {})
    strategy = context.get("strategy_result", {})
    indicators = context.get("indicator_result", {})
    strategy_scores = context.get("strategy_scores", [])

    reasons = []
    counterfactual = []

    dec_action = decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)
    dec_action = dec_action.lower()

    # Reason 1: Strategy
    top = strategy_scores[0] if strategy_scores else None
    if top:
        top_name = top.get("name", "?")
        top_score = top.get("score", 0)
        if top_score > 70:
            reasons.append(f"候选策略 {top_name} 得分 {top_score}，信号较强。")
        else:
            reasons.append(f"候选策略 {top_name} 得分 {top_score}，信号不够突出。")

    # Reason 2: Risk
    risk_score = risk.get("risk_score", 40) if isinstance(risk, dict) else 40
    if risk_score >= 40:
        reasons.append(f"当前风险分数 {risk_score}，对仓位形成限制。")

    # Reason 3: Regime
    trend = regime.get("trend_regime", "range_bound")
    if trend == "range_bound":
        reasons.append("市场处于震荡状态，趋势确认不足。")
    elif trend == "downtrend":
        reasons.append("市场处于下降趋势，不宜追高。")

    # Reason 4: Indicators
    macd_val = indicators.get("macd")
    if macd_val is not None and macd_val <= 0:
        reasons.append("MACD 动量信号偏弱。")
    rsi_val = indicators.get("rsi")
    if rsi_val is not None and (rsi_val > 70 or rsi_val < 30):
        reasons.append(f"RSI={rsi_val:.1f} 处于极端区间。")

    # Counterfactuals
    if dec_action == "hold":
        counterfactual.append("如果风险分数下降到 30 以下，系统会提高买入倾向。")
        counterfactual.append("如果 MACD 明显转强且趋势变为上行，决策可能转为 Buy。")
    elif dec_action == "buy":
        counterfactual.append("如果最大回撤突然扩大，系统会降低仓位或转为 Hold。")
        counterfactual.append("如果波动率飙升，风险模块会限制新买入。")
    else:
        counterfactual.append("如果 RSI 进入超卖区间且趋势转正，可能转为 Buy。")

    counterfactual.append("如果市场进入 downtrend 且波动率上升，系统会进一步降低风险敞口。")

    return {
        "short": f"当前选择 {dec_action.upper()}，主要因为{'风险约束' if risk_score >= 40 else '策略信号'}和趋势确认不足。",
        "reasons": reasons,
        "counterfactual": counterfactual,
    }
