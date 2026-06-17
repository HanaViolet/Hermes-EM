"""
Explain Agent V1.5 — generates rule-based natural language explanations,
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
    indicators = context.get("indicator_result", {})
    strategy_scores = context.get("strategy_scores", [])

    reasons = []
    counterfactual = []

    dec_action = decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)
    dec_action = dec_action.lower()
    dec_mode = decision.get("decision_mode", "proceed") if isinstance(decision, dict) else "proceed"
    watch_prio = decision.get("watch_priority", "low") if isinstance(decision, dict) else "low"
    init_dec = decision.get("initial_decision", dec_action) if isinstance(decision, dict) else dec_action
    rev_applied = decision.get("revision_applied", False) if isinstance(decision, dict) else False
    critic_score = decision.get("critic_score", 70) if isinstance(decision, dict) else 70

    # Reason 0: Revision
    if rev_applied and init_dec != dec_action:
        reasons.append(f"初始决策为 {init_dec.upper()}，经 Critic Agent 审查后修订为 {dec_action.upper()}。")
    elif rev_applied:
        reasons.append(f"Critic Agent 审查后建议保持 {dec_action.upper()}，但调整了仓位和监控计划。")

    # Reason 1: Strategy
    top = strategy_scores[0] if strategy_scores else None
    if top:
        top_name = top.get("name", "?")
        top_score = top.get("blended_score", top.get("adjusted_score", top.get("score", 0)))
        if top_score > 70:
            reasons.append(f"候选策略 {top_name} 得分 {top_score}，信号较强。")
        else:
            reasons.append(f"候选策略 {top_name} 得分 {top_score}，信号不够突出。")

    # Reason 2: Risk
    risk_score = risk.get("risk_score", 40) if isinstance(risk, dict) else 40
    if risk_score >= 50:
        reasons.append(f"当前风险分数 {risk_score}（较高），对仓位形成显著限制。")
    elif risk_score >= 40:
        reasons.append(f"当前风险分数 {risk_score}，对仓位形成限制。")
    elif risk_score < 30:
        reasons.append(f"当前风险分数 {risk_score}（较低），风险环境相对友好。")

    # Reason 3: Regime
    trend = regime.get("trend_regime", "range_bound")
    if trend == "range_bound":
        reasons.append("市场处于震荡状态，趋势确认不足。")
    elif trend == "downtrend":
        reasons.append("市场处于下降趋势，不宜追高。")
    elif trend == "uptrend":
        reasons.append("市场处于上升趋势，但需结合其他维度确认。")

    # Reason 4: Indicators
    macd_val = indicators.get("macd")
    if macd_val is not None and macd_val <= 0:
        reasons.append("MACD 动量信号偏弱。")
    elif macd_val is not None and macd_val > 0.5:
        reasons.append("MACD 动量信号偏强。")

    rsi_val = indicators.get("rsi")
    if rsi_val is not None and rsi_val > 70:
        reasons.append(f"RSI={rsi_val:.1f} 处于超买区间。")
    elif rsi_val is not None and rsi_val < 30:
        reasons.append(f"RSI={rsi_val:.1f} 处于超卖区间。")
    elif rsi_val is not None:
        reasons.append(f"RSI={rsi_val:.1f} 处于中性区间。")

    # Reason 5: Critic
    if critic_score < 50:
        reasons.append(f"Critic Agent 评分较低（{critic_score}），对决策信心不足，建议谨慎。")
    elif critic_score < 65:
        reasons.append(f"Critic Agent 有保留意见（评分 {critic_score}），决策存在不确定性。")
    else:
        reasons.append(f"Critic Agent 对决策较为认可（评分 {critic_score}）。")

    # Counterfactuals
    if dec_action == "hold":
        if dec_mode == "wait_for_confirmation":
            counterfactual.append("如果 MACD 确认金叉且风险分数下降到 35 以下，系统可能转为 BUY。")
        elif dec_mode == "watchlist":
            counterfactual.append("如果触发条件逐一满足，系统将自动提升优先级并考虑入场。")
        elif dec_mode == "risk_off":
            counterfactual.append("如果风险分数显著下降且趋势转强，系统将从防御状态恢复。")
        else:
            counterfactual.append("如果风险分数下降到 30 以下，系统会提高买入倾向。")
            counterfactual.append("如果 MACD 明显转强且趋势变为上行，决策可能转为 Buy。")
    elif dec_action == "buy":
        counterfactual.append("如果最大回撤突然扩大，系统会降低仓位或转为 Hold。")
        counterfactual.append("如果波动率飙升，风险模块会限制新买入。")
        if dec_mode == "proceed_with_caution":
            counterfactual.append("如果 Critic 的顾虑被证实，系统可能进一步减仓。")
    else:
        counterfactual.append("如果 RSI 进入超卖区间且趋势转正，可能转为 Buy。")
        counterfactual.append("如果风险分数下降且新闻面改善，系统可能重新评估。")

    counterfactual.append("如果市场进入 downtrend 且波动率上升，系统会进一步降低风险敞口。")

    # Build short explanation
    mode_label = {
        "proceed": "",
        "proceed_with_caution": " · 谨慎执行",
        "wait_for_confirmation": " · 等待确认",
        "risk_off": " · 防御持仓",
        "watchlist": " · 重点监控",
    }.get(dec_mode, "")

    short = f"当前选择 {dec_action.upper()}{mode_label}"
    if watch_prio != "low":
        short += f"，监控优先级 {watch_prio.upper()}"
    short += "。"

    return {
        "short": short,
        "reasons": reasons,
        "counterfactual": counterfactual,
    }
