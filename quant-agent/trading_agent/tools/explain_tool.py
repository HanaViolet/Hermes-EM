"""Rule-based explanations for Hermes Agent decisions."""
from __future__ import annotations


def explain_decision(context: dict) -> dict:
    decision = context.get("decision_result", {})
    risk = context.get("risk_result", {})
    regime = context.get("regime_result", {})
    indicators = context.get("indicator_result", {})
    strategy_scores = context.get("strategy_scores", [])
    sentiment_market = context.get("sentiment_market_result") or risk.get("sentiment_market", {})

    reasons: list[str] = []
    counterfactual: list[str] = []

    dec_action = decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)
    dec_action = dec_action.lower()
    dec_mode = decision.get("decision_mode", "proceed") if isinstance(decision, dict) else "proceed"
    watch_prio = decision.get("watch_priority", "low") if isinstance(decision, dict) else "low"
    init_dec = decision.get("initial_decision", dec_action) if isinstance(decision, dict) else dec_action
    rev_applied = decision.get("revision_applied", False) if isinstance(decision, dict) else False
    critic_score = decision.get("critic_score", 70) if isinstance(decision, dict) else 70

    if rev_applied and init_dec != dec_action:
        reasons.append(f"初始决策为 {init_dec.upper()}，经 Critic Agent 审查后修订为 {dec_action.upper()}。")
    elif rev_applied:
        reasons.append(f"Critic Agent 建议保持 {dec_action.upper()}，但调整了仓位和监控优先级。")

    top = strategy_scores[0] if strategy_scores else None
    if top:
        top_name = top.get("name", "?")
        top_score = top.get("blended_score", top.get("adjusted_score", top.get("score", 0)))
        if top_score > 70:
            reasons.append(f"候选策略 {top_name} 得分 {top_score}，策略信号较强。")
        else:
            reasons.append(f"候选策略 {top_name} 得分 {top_score}，信号强度仍需确认。")

    risk_score = risk.get("risk_score", 40) if isinstance(risk, dict) else 40
    if risk_score >= 50:
        reasons.append(f"当前风险分数 {risk_score}/100 较高，对仓位形成明显限制。")
    elif risk_score >= 40:
        reasons.append(f"当前风险分数 {risk_score}/100，新增仓位需要更强确认。")
    elif risk_score < 30:
        reasons.append(f"当前风险分数 {risk_score}/100 较低，风险环境相对友好。")

    sentiment_risk = sentiment_market.get("sentiment_risk_score", risk.get("sentiment_market_risk", 0))
    sentiment_zone = sentiment_market.get("risk_zone", risk.get("sentiment_market_zone", "calm"))
    sentiment_summary = sentiment_market.get("summary_zh") or risk.get("sentiment_market_summary")
    if sentiment_summary:
        reasons.append(sentiment_summary)
    if sentiment_risk >= 65:
        reasons.append(f"情绪市场风险 {sentiment_risk}/100（{sentiment_zone}），说明社交热度、传闻、拥挤度或流动性正在放大交易风险。")
    elif sentiment_risk >= 35:
        reasons.append(f"情绪市场处于观察区，风险为 {sentiment_risk}/100，需要等待订单簿和价格反馈确认。")

    trend = regime.get("trend_regime", "range_bound")
    if trend == "range_bound":
        reasons.append("市场处于震荡状态，趋势确认不足。")
    elif trend == "downtrend":
        reasons.append("市场处于下降趋势，不适合激进追高。")
    elif trend == "uptrend":
        reasons.append("市场处于上升趋势，但仍需结合风险与情绪链确认。")

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

    if critic_score < 50:
        reasons.append(f"Critic Agent 评分较低（{critic_score}），建议谨慎。")
    elif critic_score < 65:
        reasons.append(f"Critic Agent 保留意见较多（评分 {critic_score}），决策仍有不确定性。")
    else:
        reasons.append(f"Critic Agent 对决策较为认可（评分 {critic_score}）。")

    if dec_action == "hold":
        if dec_mode == "wait_for_confirmation":
            counterfactual.append("如果 MACD 确认转强且风险分数下降到 35 以下，系统可能转为 BUY。")
        elif dec_mode == "risk_off":
            counterfactual.append("如果情绪市场风险和最大回撤显著下降，系统会从防守状态恢复到正常评估。")
        else:
            counterfactual.append("如果风险分数下降、情绪热度回落且价格反馈转强，系统会提高买入倾向。")
    elif dec_action == "buy":
        counterfactual.append("如果传闻热度或拥挤度继续上升，系统会降低仓位或转为 HOLD。")
        counterfactual.append("如果最大回撤突然扩大，风险模块会限制新买入。")
    else:
        counterfactual.append("如果风险分数下降、新闻面改善且订单簿买盘恢复，系统可能重新评估买入。")

    counterfactual.append("如果市场进入 downtrend 且波动率上升，系统会进一步降低风险敞口。")

    mode_label = {
        "proceed": "",
        "proceed_with_caution": " / 谨慎执行",
        "wait_for_confirmation": " / 等待确认",
        "risk_off": " / 防守状态",
        "watchlist": " / 重点监控",
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
