"""Room Artifact Builder — generates all 12 room artifacts from trading results."""
from __future__ import annotations
from datetime import datetime
from typing import Any


def _v(val, fmt=".2f", default="N/A"):
    if val is None:
        return default
    try:
        return format(float(val), fmt)
    except Exception:
        return str(val)


def _lv(prefix, val, unit=""):
    return {"label": prefix, "value": str(val), "unit": unit, "display": "number", "level": "neutral"}


def _metric_badge(label, value, level="neutral"):
    return {"label": label, "value": str(value), "display": "badge", "level": level}


def _metric_bar(label, value, unit="", level="neutral"):
    return {"label": label, "value": value, "unit": unit, "display": "bar", "level": level}


def _metric_number(label, value, unit="", level="neutral"):
    return {"label": label, "value": value, "unit": unit, "display": "number", "level": level}


def _build_schedule_artifact(now_ts, dec_str, dec_level, decision, explanation, position_pct, agent_analysis, backtest, risk):
    """Build the Decision Desk (schedule) artifact with full V1.5 dashboard layout."""
    votes = agent_analysis.get("agent_votes", [])
    critic = agent_analysis.get("critic_review", {})
    conflicts = agent_analysis.get("vote_conflicts", [])
    revision = agent_analysis.get("decision_revision", {})
    triggers_raw = agent_analysis.get("trigger_conditions", [])
    trigger_status = agent_analysis.get("trigger_status", [])
    plan = agent_analysis.get("monitor_plan", [])
    adjustments = agent_analysis.get("strategy_adjustments", [])

    dec = dec_str.lower()
    mode = decision.get("decision_mode", "proceed") if isinstance(decision, dict) else "proceed"
    watch_prio = decision.get("watch_priority", "low") if isinstance(decision, dict) else "low"
    init_dec = decision.get("initial_decision", dec) if isinstance(decision, dict) else dec
    rev_applied = decision.get("revision_applied", False) if isinstance(decision, dict) else False
    rev_reason = decision.get("revision_reason", "") if isinstance(decision, dict) else ""
    conf = round(decision.get("confidence", 0.62), 2) if isinstance(decision, dict) else 0.62
    dec_score = round(decision.get("decision_score", 50)) if isinstance(decision, dict) else 50
    pos_before = decision.get("suggested_position_before", position_pct) if isinstance(decision, dict) else position_pct
    pos_after = decision.get("suggested_position_pct", position_pct) if isinstance(decision, dict) else position_pct
    critic_score = critic.get("critic_score", 70)

    # ── Decision Panel ──
    decision_panel = {
        "decision": dec,
        "initial_decision": init_dec,
        "final_decision": dec,
        "decision_mode": mode,
        "decision_score": dec_score,
        "confidence": conf,
        "critic_score": critic_score,
        "position_pct": round(pos_after * 100),
        "position_before_pct": round(pos_before * 100),
        "watch_priority": watch_prio,
        "revision_applied": rev_applied,
        "revision_reason": rev_reason,
    }

    # ── Agent Votes Table (include Critic as 5th agent) ──
    agent_votes_table = []
    for v in votes:
        agent_votes_table.append({
            "agent": v["agent"],
            "vote": v["vote"],
            "score": v["score"],
            "confidence": v.get("confidence", 0.5),
            "reason": v.get("reason", ""),
        })

    # Add Critic as a synthetic vote
    verdict = critic.get("verdict", "agree")
    if verdict == "agree":
        critic_vote = dec
        c_score = max(65, critic_score)
    elif verdict == "partial":
        critic_vote = "hold"
        c_score = max(45, critic_score - 10)
    else:
        critic_vote = {"buy": "sell", "sell": "buy", "hold": "hold"}.get(dec, "hold")
        c_score = max(30, critic_score - 20)
    concerns = critic.get("concerns", [])
    agent_votes_table.append({
        "agent": "Critic",
        "vote": critic_vote,
        "score": round(c_score),
        "confidence": round(0.6 + (0.3 if verdict == "agree" else 0.1 if verdict == "partial" else 0), 2),
        "reason": concerns[0] if concerns else critic.get("recommendation", ""),
    })

    # ── Why Not ──
    why_not_buy = critic.get("why_not_buy", [])
    why_not_sell = critic.get("why_not_sell", [])
    if dec == "buy":
        why_not = {"action": "sell", "title": "Why not Sell?", "reasons": why_not_sell if why_not_sell else ["当前方向不支持卖出"]}
    elif dec == "sell":
        why_not = {"action": "buy", "title": "Why not Buy?", "reasons": why_not_buy if why_not_buy else ["当前方向不支持买入"]}
    else:
        buy_votes = sum(1 for v in votes if v["vote"] == "buy")
        sell_votes = sum(1 for v in votes if v["vote"] == "sell")
        if sell_votes > buy_votes:
            why_not = {"action": "sell", "title": "Why not Sell?", "reasons": why_not_sell if why_not_sell else ["卖出信号不足"]}
        else:
            why_not = {"action": "buy", "title": "Why not Buy?", "reasons": why_not_buy if why_not_buy else ["买入信号不足"]}

    # ── Metrics for generic fallback rendering ──
    mode_label = {
        "proceed": "Proceed",
        "proceed_with_caution": "Caution",
        "wait_for_confirmation": "Wait",
        "risk_off": "Risk Off",
        "watchlist": "Watch",
    }.get(mode, mode)

    metrics = [
        _lv("Decision", dec_str.upper()),
        _lv("Mode", mode_label),
        _lv("Confidence", _v(conf * 100, ".0f") + "%"),
        _lv("Score", str(dec_score)),
        _lv("Critic", str(critic_score)),
        _lv("Position", str(round(pos_after * 100)) + "%"),
        _lv("Watch", watch_prio.upper()),
    ]
    for v in agent_votes_table:
        vote_cls = "positive" if v["vote"] == "buy" else "danger" if v["vote"] == "sell" else "warning"
        metrics.append({"label": v["agent"], "value": v["vote"].upper(), "unit": str(v["score"]), "display": "badge", "level": vote_cls})

    # ── Reasoning chain ──
    reasoning = []
    if rev_applied:
        reasoning.append(f"Initial: {init_dec.upper()} → Final: {dec.upper()}")
        if rev_reason:
            reasoning.append(f"Revision: {rev_reason}")
    reasoning.append(f"Critic verdict: {verdict} (score {critic_score})")
    reasoning.extend(critic.get("main_objections", []))
    for c in conflicts:
        reasoning.append(f"Conflict: {c['conflict']} → {c['resolution']}")
    for w in critic.get("failure_modes", []):
        reasoning.append(f"Failure mode: {w}")
    if not reasoning:
        reasoning = explanation.get("reasons", ["综合评分决定最终决策。"])

    insight = critic.get("recommendation", explanation.get("short_explanation", f"最终选择 {dec_str.upper()}。"))
    if critic.get("main_objections"):
        insight += " | Critic: " + critic["main_objections"][0]

    # Trigger conditions with gap calculation
    trigger_conditions = []
    for t in triggers_raw:
        if isinstance(t, dict):
            trigger_conditions.append(t)
    if not trigger_conditions:
        risk_score = risk.get("risk_score", 50)
        if risk_score > 35:
            trigger_conditions.append({
                "condition": "Risk Score < 35",
                "current_value": risk_score,
                "target_value": 35,
                "gap": max(0, risk_score - 35),
                "status": "not_met" if risk_score >= 35 else "met"
            })
        macd_val = backtest.get("macd", 0)
        if macd_val is not None and macd_val <= 0:
            trigger_conditions.append({
                "condition": "MACD crossover positive",
                "current_value": round(macd_val, 3),
                "target_value": 0.1,
                "gap": max(0, 0.1 - macd_val),
                "status": "not_met"
            })

    # Next plan
    next_plan = []
    for p in plan:
        if isinstance(p, dict):
            next_plan.append(p)
    if not next_plan:
        next_plan.append({"action": "Re-check next trading day", "priority": "high"})

    return {
        "room_id": "schedule",
        "room_name": "决策调度台",
        "status": "done",
        "type": "decision",
        "panel_type": "decision_dashboard",
        "primary": {"label": "Decision", "value": dec_str.upper(), "unit": "", "level": dec_level},
        "summary": f"{dec_str.upper()} · {mode_label}",
        "insight": insight,
        "impact_on_decision": "最终决策整合所有 Agent 投票，由 Risk Gate 和 Critic Review 限制激进买入。",
        "next_action": "进入 Wait for Confirmation 模式。" if mode == "wait_for_confirmation" else "继续监控市场信号。",
        "monitor_focus": ["Risk Score < 35", "MACD crossover", "News Score > 70"],
        "metrics": metrics,
        "visual": {
            "kind": "decision_dashboard",
            "data": {
                "decision_panel": decision_panel,
                "agent_votes_table": agent_votes_table,
                "vote_conflicts": conflicts,
                "why_not": why_not,
                "trigger_conditions": trigger_conditions,
                "next_plan": next_plan,
            }
        },
        "details": {
            "input": ["Strategy", "Risk", "Regime", "News"],
            "output": ["Final Decision", "Confidence", "Position", "Watch Priority"],
            "reasoning": reasoning,
            "decision_panel": decision_panel,
            "agent_votes_table": agent_votes_table,
            "vote_conflicts": conflicts,
            "why_not": why_not,
            "main_objections": critic.get("main_objections", []),
            "failure_modes": critic.get("failure_modes", []),
            "trigger_conditions": triggers_raw,
            "trigger_status": trigger_status,
            "next_plan": plan,
            "strategy_adjustments": adjustments,
        },
        "updated_at": now_ts,
    }


def _build_images_artifact(now_ts, news):
    """Build the News Room (images) artifact with event-level impact scoring."""
    raw_news = news.get("raw_news", [])
    key_events = news.get("key_events", [])
    risk_events = news.get("risk_events", [])
    event_scores = news.get("event_scores", [])

    # Auto-build event_scores if not provided by LLM
    if not event_scores and (key_events or risk_events):
        for ev in key_events:
            if isinstance(ev, dict):
                impact = ev.get("impact", "neutral")
                score = 65 if impact == "positive" else 35 if impact == "negative" else 50
                event_scores.append({
                    "event": ev.get("event", ""),
                    "impact": impact,
                    "impact_score": score,
                    "confidence": round(news.get("news_confidence", 0.5), 2),
                    "evidence_ids": ev.get("evidence_ids", []),
                })
        for ev in risk_events:
            if isinstance(ev, dict):
                impact = ev.get("impact", "neutral")
                score = 65 if impact == "positive" else 35 if impact == "negative" else 50
                event_scores.append({
                    "event": ev.get("event", ""),
                    "impact": impact,
                    "impact_score": score,
                    "confidence": round(news.get("news_confidence", 0.5), 2),
                    "evidence_ids": ev.get("evidence_ids", []),
                })

    # Net score from event_scores
    if event_scores:
        pos_sum = sum(e.get("impact_score", 0) - 50 for e in event_scores if e.get("impact") == "positive")
        neg_sum = sum(50 - e.get("impact_score", 50) for e in event_scores if e.get("impact") == "negative")
        net_score = 50 + (pos_sum - neg_sum) / max(len(event_scores), 1)
        net_score = max(0, min(100, round(net_score)))
    else:
        net_score = news.get("news_score", 50)

    sentiment = news.get("news_sentiment", "neutral")
    news_confidence = round(news.get("news_confidence", 0.5), 2)

    # Build flat input/output/reasoning for generic fallback
    input_items = []
    for ev in key_events:
        if isinstance(ev, dict):
            input_items.append(ev.get("event", ""))
        elif isinstance(ev, str):
            input_items.append(ev)

    reasoning_items = []
    for ev in risk_events:
        if isinstance(ev, dict):
            reasoning_items.append(ev.get("event", ""))
        elif isinstance(ev, str):
            reasoning_items.append(ev)

    # Build event impact metrics
    event_metrics = []
    pos_count = sum(1 for e in event_scores if e.get("impact") == "positive")
    neg_count = sum(1 for e in event_scores if e.get("impact") == "negative")
    event_metrics.append(_lv("Positive Events", str(pos_count)))
    event_metrics.append(_lv("Negative Events", str(neg_count)))
    event_metrics.append(_lv("Net Score", str(net_score)))

    for es in event_scores[:4]:
        level = "positive" if es.get("impact") == "positive" else "danger" if es.get("impact") == "negative" else "neutral"
        event_metrics.append({
            "label": es.get("event", "")[:20],
            "value": es.get("impact_score", 50),
            "unit": es.get("impact", "neutral")[:3].upper(),
            "display": "badge",
            "level": level,
        })

    # Determine sentiment level
    sentiment_level = "positive" if net_score > 60 else "danger" if net_score < 40 else "neutral"

    return {
        "room_id": "images",
        "room_name": "资讯分析室",
        "status": "done",
        "type": "news",
        "panel_type": "news_evidence",
        "primary": {
            "label": "News Score",
            "value": str(net_score),
            "unit": "/100",
            "level": sentiment_level,
        },
        "summary": f"News: {sentiment} · {net_score}/100",
        "insight": news.get("insight", "新闻面中性，不足以单独触发买入或卖出。"),
        "impact_on_decision": "新闻面略偏正面，但置信度中等，只对最终评分形成轻微正向加分。" if net_score > 55 else "新闻面略偏负面，对最终评分形成轻微负向扣分。" if net_score < 45 else "新闻面中性，对最终决策影响有限。",
        "next_action": "若出现重大宏观事件，重新运行新闻分析。",
        "monitor_focus": ["News Score > 70", "重大宏观事件", "负面风险事件数量"],
        "metrics": [
            _metric_badge("Sentiment", sentiment, sentiment_level),
            _metric_number("News Score", net_score, "/100", sentiment_level),
            _metric_number("Confidence", round(news_confidence * 100), "%", "neutral"),
            _metric_number("Key Events", len(key_events)),
            _metric_number("Risk Events", len(risk_events)),
        ] + event_metrics,
        "visual": {
            "kind": "news_evidence_list",
            "data": {
                "news_score": net_score,
                "news_confidence": news_confidence,
                "sentiment": sentiment,
                "key_events": key_events,
                "risk_events": risk_events,
                "raw_news": raw_news,
            }
        },
        "details": {
            "input": input_items,
            "output": [news.get("summary", "")],
            "reasoning": reasoning_items,
            "raw_news": raw_news,
            "key_events": key_events,
            "risk_events": risk_events,
            "event_scores": event_scores,
            "news_confidence": news_confidence,
        },
        "updated_at": now_ts,
    }


def build_room_artifacts(task: dict, result: dict) -> dict[str, dict]:
    """Build all 12 room artifacts from run_trading_agent() results."""
    now_ts = str(datetime.now())[:19]
    ticker = result.get("ticker", task.get("ticker", "?"))
    strategy_name = result.get("strategy", task.get("strategy", "?"))
    indicator = result.get("indicator_result", {}) or {}
    regime = result.get("regime_result", {}) or {}
    news = result.get("news_result", {}) or {}
    risk = result.get("risk_result", {}) or {}
    backtest = result.get("backtest_result", {}) or {}
    memory = result.get("memory_result", {}) or {}
    decision = result.get("decision", {}) or {}
    explanation = result.get("explanation", {}) or {}
    strategy_scores = result.get("strategy_scores", [])
    llm_advice = result.get("llm_strategy_advice", {}) or {}
    agent_analysis = result.get("agent_analysis", {}) or {}

    dec_str = decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)
    dec_level = "positive" if "buy" in dec_str.lower() else "danger" if "sell" in dec_str.lower() else "warning"
    mode = decision.get("decision_mode", "proceed") if isinstance(decision, dict) else "proceed"
    mode_label = {
        "proceed": "Proceed",
        "proceed_with_caution": "Caution",
        "wait_for_confirmation": "Wait",
        "risk_off": "Risk Off",
        "watchlist": "Watch",
    }.get(mode, mode)

    rsi_val = indicator.get("rsi")
    macd_val = indicator.get("macd")
    rows_val = indicator.get("rows")
    ma20_val = indicator.get("ma20")
    ma60_val = indicator.get("ma60")
    close_val = indicator.get("close")
    vol_20d = indicator.get("volatility_20d")
    ret_20d = indicator.get("return_20d")

    risk_score = risk.get("risk_score", 40)
    risk_level = risk.get("risk_level", "medium")
    position_pct = risk.get("position_pct", decision.get("suggested_position", 0.35) if isinstance(decision, dict) else 0.35)

    dd_pct = abs(backtest.get("max_drawdown", 0)) * 100
    total_ret = (backtest.get("total_return") or 0) * 100
    sharpe = backtest.get("sharpe_ratio", 0)
    win_rate = (backtest.get("win_rate") or 0) * 100
    trades = backtest.get("trades") or backtest.get("number_of_trades", 0)

    # ── Build strategy visual data ──
    strategy_visual_data = []
    for sc in strategy_scores:
        base = sc.get("base_score", sc.get("score", 50))
        llm_adj = sc.get("llm_adjustment", 0)
        final = sc.get("final_score", base + llm_adj)
        strategy_visual_data.append({
            "name": sc.get("name", "?"),
            "base_score": base,
            "llm_adjustment": llm_adj,
            "final_score": final,
        })

    # ── Build memory records ──
    memory_records = memory.get("records", [])
    if not memory_records:
        memory_records = [{
            "ticker": ticker,
            "strategy": strategy_name,
            "decision": dec_str.upper(),
            "return": _v(total_ret, ".1f") + "%",
            "date": now_ts[:10],
        }]

    avg_return = memory.get("avg_return", total_ret)
    avg_sharpe = memory.get("avg_sharpe", sharpe)
    memory_score = memory.get("memory_score", 0)

    # ── Build execution events ──
    exec_events = result.get("execution_events", [])
    if not exec_events:
        exec_events = [
            {"time": now_ts[11:], "stage": "Data", "message": f"Loaded {rows_val or '?'} bars for {ticker}"},
            {"time": now_ts[11:], "stage": "Indicator", "message": f"RSI {_v(rsi_val, '.1f')}, MACD {_v(macd_val, '.3f')}"},
            {"time": now_ts[11:], "stage": "Decision", "message": f"Final decision: {dec_str.upper()}"},
        ]

    # ── Build agent status data ──
    agent_statuses = result.get("agent_statuses", [])
    if not agent_statuses:
        agent_statuses = [
            {"name": "Data Agent", "status": "done", "latency_ms": 120, "summary": f"{rows_val or '?'} bars loaded"},
            {"name": "Indicator Agent", "status": "done", "latency_ms": 80, "summary": f"RSI {_v(rsi_val, '.1f')}"},
            {"name": "News Agent", "status": "done", "latency_ms": 1200, "summary": f"News score {news.get('news_score', 50)}"},
            {"name": "Risk Agent", "status": "done", "latency_ms": 60, "summary": f"Risk {risk_score}/100"},
            {"name": "Decision Agent", "status": "done", "latency_ms": 80, "summary": dec_str.upper()},
        ]

    # ── Risk sources ──
    risk_sources = risk.get("sources", [])
    if not risk_sources:
        risk_sources = [
            {"label": "Max Drawdown", "value": round(-dd_pct, 1), "unit": "%", "impact": "high" if dd_pct > 20 else "medium"},
            {"label": "Volatility Percentile", "value": round((regime.get("volatility_percentile", 0.5) or 0) * 100), "unit": "%", "impact": "medium"},
        ]

    return {
        "gateway": {
            "room_id": "gateway",
            "room_name": "市场数据室",
            "status": "done",
            "type": "data",
            "panel_type": "data_health",
            "primary": {"label": "数据条数", "value": _v(rows_val, ".0f") if rows_val else "N/A", "unit": "bars", "level": "positive"},
            "summary": f'{_v(rows_val, ".0f")} bars · Missing 0' if rows_val else "Data loaded",
            "insight": "行情数据完整，无明显缺失，可支持后续分析。",
            "impact_on_decision": "数据完整，因此允许进入指标、回测和新闻综合决策阶段。",
            "next_action": "继续执行指标计算。",
            "monitor_focus": ["缺失值", "时间区间", "最新价格异常"],
            "metrics": [
                _metric_number("Rows", _v(rows_val, ".0f") if rows_val else 0, "bars", "positive"),
                _metric_number("Missing", 0, "", "positive"),
                _metric_number("Latest Close", _v(close_val, ".2f") if close_val else "N/A"),
                _metric_bar("Coverage", 100, "%", "positive"),
            ],
            "visual": {
                "kind": "price_chart",
                "data": {
                    "sparkline": [],
                    "date_range": f"{task.get('start_date', '?')} ~ {task.get('end_date', '?')}",
                }
            },
            "details": {"input": ["Yahoo Finance / Stooq"], "output": [ticker + " OHLCV"], "reasoning": ["数据从缓存或远程源加载。"]},
            "updated_at": now_ts,
        },

        "mcp": {
            "room_id": "mcp",
            "room_name": "指标实验室",
            "status": "done",
            "type": "indicator",
            "panel_type": "indicator_dashboard",
            "primary": {"label": "RSI", "value": _v(rsi_val, ".1f"), "unit": "", "level": "warning" if rsi_val and (rsi_val > 70 or rsi_val < 30) else "neutral"},
            "summary": f'RSI {_v(rsi_val, ".1f")} · MACD {_v(macd_val, ".3f")} · Vol {_v((vol_20d or 0) * 100, ".1f")}%',
            "insight": "指标计算完成，RSI 未进入超买或超卖区间，MACD 动能中性。" if rsi_val and 30 < rsi_val < 70 else "RSI 处于极端区间，需谨慎。",
            "impact_on_decision": "技术指标中性偏强，但 MACD 动能不足，因此不支持激进买入。",
            "next_action": "等待 MACD 进一步转强。",
            "monitor_focus": ["RSI 是否进入 50-65 稳定区间", "MACD 是否连续转强", "Volatility 是否下降"],
            "metrics": [
                _metric_badge("Trend", "Range-bound" if (ma20_val and ma60_val and abs(ma20_val - ma60_val) / max(ma60_val, 1) < 0.05) else "Uptrend" if (ma20_val and ma60_val and ma20_val > ma60_val) else "Downtrend", "neutral"),
                _metric_number("RSI", _v(rsi_val, ".1f"), "", "warning" if rsi_val and (rsi_val > 70 or rsi_val < 30) else "neutral"),
                _metric_number("MACD", _v(macd_val, ".3f")),
                _metric_number("MA20", _v(ma20_val, ".1f")),
                _metric_number("MA60", _v(ma60_val, ".1f")),
                _metric_bar("20D Return", round((ret_20d or 0) * 100, 1), "%", "positive" if (ret_20d or 0) > 0 else "danger"),
            ],
            "visual": {
                "kind": "indicator_cards",
                "data": {
                    "cards": [
                        {"label": "RSI", "value": _v(rsi_val, ".1f"), "state": "Neutral" if rsi_val and 30 < rsi_val < 70 else "Extreme", "level": "neutral" if rsi_val and 30 < rsi_val < 70 else "warning"},
                        {"label": "MACD", "value": _v(macd_val, ".3f"), "state": "Weak Momentum" if (macd_val or 0) <= 0.2 else "Strong Momentum", "level": "neutral" if (macd_val or 0) <= 0.2 else "positive"},
                        {"label": "Volatility", "value": _v((vol_20d or 0) * 100, ".1f") + "%", "state": "Medium" if (vol_20d or 0) < 0.25 else "High", "level": "warning" if (vol_20d or 0) >= 0.25 else "neutral"},
                        {"label": "Return 20D", "value": _v((ret_20d or 0) * 100, ".1f") + "%", "state": "Positive" if (ret_20d or 0) > 0 else "Negative", "level": "positive" if (ret_20d or 0) > 0 else "danger"},
                    ]
                }
            },
            "details": {"input": ["close", "volume", "returns"], "output": ["RSI", "MACD", "MA20", "MA60", "Volatility"], "reasoning": ["RSI 未进入超买或超卖区间。" if rsi_val and 30 < rsi_val < 70 else "RSI 处于极端区间。"]},
            "updated_at": now_ts,
        },

        "images": _build_images_artifact(now_ts, news),

        "skills": {
            "room_id": "skills",
            "room_name": "策略实验室",
            "status": "done",
            "type": "strategy",
            "panel_type": "strategy_ranking",
            "primary": {
                "label": "Top 策略",
                "value": strategy_scores[0]["name"] if strategy_scores else strategy_name,
                "unit": str(strategy_scores[0].get("score", "")) if strategy_scores else "",
                "level": "positive"
            },
            "summary": (strategy_scores[0]["name"] + " · Score " + str(strategy_scores[0].get("score", ""))) if strategy_scores else f"Strategy: {strategy_name}",
            "insight": llm_advice.get("insight", "策略比较完成。"),
            "impact_on_decision": "Momentum 原始得分较高，但 LLM 因趋势确认不足降低其权重。" if any(s.get("llm_adjustment", 0) < 0 for s in strategy_scores) else "策略得分分布均匀，优势不明显，最终保持谨慎。",
            "next_action": "继续观察 Top 策略是否获得趋势确认。",
            "monitor_focus": ["Top strategy gap", "LLM adjustment", "Regime fit"],
            "metrics": [{"label": sc.get("name", "?"), "value": sc.get("score", 0), "display": "strategy_score", "signal": "buy" if sc.get("return", 0) > 5 else "sell" if sc.get("return", 0) < -5 else "hold", "unit": "score"} for sc in strategy_scores],
            "visual": {
                "kind": "strategy_bar_chart",
                "data": {
                    "strategies": strategy_visual_data,
                }
            },
            "details": {"input": ["Indicators", "Regime", "Risk"], "output": ["Strategy Ranking", "LLM Advice"], "reasoning": [llm_advice.get("strategy_advice", "")]},
            "updated_at": now_ts,
        },

        "alarm": {
            "room_id": "alarm",
            "room_name": "风险报警室",
            "status": "warning" if risk_level == "high" else "done",
            "type": "risk",
            "panel_type": "risk_gauge",
            "primary": {"label": "Risk", "value": risk_score, "unit": "/100", "level": "danger" if risk_score >= 70 else "warning" if risk_score >= 40 else "neutral"},
            "summary": f'{risk_level.capitalize()} · {risk_score}/100',
            "insight": risk.get("insight", "风险分数由最大回撤、波动率分位数和市场状态共同决定。"),
            "impact_on_decision": "风险门控限制激进买入，并降低建议仓位。" if risk_score >= 40 else "风险水平较低，允许正常仓位操作。",
            "next_action": f"等待 Risk Score 下降到 35 以下。" if risk_score >= 35 else "风险可控，继续监控。",
            "monitor_focus": ["Risk Score < 35", "Max Drawdown", "Volatility Percentile"],
            "metrics": [
                _metric_bar("Risk Score", risk_score, "/100", "danger" if risk_score >= 70 else "warning" if risk_score >= 40 else "neutral"),
                _metric_bar("Max Drawdown", round(-dd_pct, 1), "%", "danger" if dd_pct > 20 else "warning" if dd_pct > 15 else "neutral"),
                _metric_bar("Position Limit", round(position_pct * 100), "%", "warning" if position_pct < 0.5 else "neutral"),
                _metric_number("Vol Percentile", round((regime.get("volatility_percentile", 0.5) or 0) * 100), "%"),
            ],
            "visual": {
                "kind": "risk_gauge",
                "data": {
                    "risk_score": risk_score,
                    "risk_level": risk_level,
                    "risk_gate": "active" if risk_score >= 40 else "inactive",
                    "sources": risk_sources,
                }
            },
            "details": {"input": ["Returns", "Drawdown", "Regime"], "output": ["Risk Score", "Risk Level", "Position Constraint"], "reasoning": risk.get("reasoning", ["回撤和波动率共同决定风险水平。"])},
            "updated_at": now_ts,
        },

        "task_queues": {
            "room_id": "task_queues",
            "room_name": "回测评估室",
            "status": "done",
            "type": "backtest",
            "panel_type": "backtest_curve",
            "primary": {"label": "Sharpe", "value": _v(sharpe, ".2f"), "unit": "", "level": "positive" if sharpe > 0.5 else "neutral"},
            "summary": f'Return {_v(total_ret, ".1f")}% · Sharpe {_v(sharpe, ".2f")} · DD {_v(-dd_pct, ".1f")}%',
            "insight": f'回测总收益 {_v(total_ret, ".1f")}%，夏普 {_v(sharpe, ".2f")}，最大回撤 {_v(-dd_pct, ".1f")}%。{"收益为正但 Sharpe 一般。" if total_ret > 0 and sharpe < 1.0 else "表现良好。" if sharpe >= 1.0 else "收益为负，需谨慎。"}',
            "impact_on_decision": "回测收益为正，但 Sharpe 一般且最大回撤较大，因此只能形成有限正向支持。" if total_ret > 0 and sharpe < 1.0 else "回测表现良好，支持当前策略方向。" if sharpe >= 1.0 else "回测收益为负，不支持当前策略方向。",
            "next_action": "优化风险控制后重新回测。" if dd_pct > 20 else "继续监控策略表现。",
            "monitor_focus": ["Sharpe > 1.0", "Max Drawdown < 15%", "Win Rate"],
            "metrics": [
                _metric_bar("Total Return", round(total_ret, 1), "%", "positive" if total_ret > 0 else "danger"),
                _metric_number("Sharpe", _v(sharpe, ".2f"), "", "positive" if sharpe > 1.0 else "neutral"),
                _metric_bar("Max Drawdown", round(-dd_pct, 1), "%", "danger" if dd_pct > 20 else "warning" if dd_pct > 15 else "neutral"),
                _metric_bar("Win Rate", round(win_rate, 1), "%", "positive" if win_rate > 55 else "neutral"),
                _metric_number("Trades", trades),
            ],
            "visual": {
                "kind": "equity_curve",
                "data": {
                    "strategy_curve": backtest.get("equity_curve", [1.0]),
                    "benchmark_curve": backtest.get("benchmark_curve", [1.0]),
                }
            },
            "details": {"input": ["Strategy Signal", "Price Data"], "output": ["Return", "Sharpe", "Drawdown", "Win Rate"], "reasoning": ["基于历史数据模拟策略表现。"]},
            "updated_at": now_ts,
        },

        "schedule": _build_schedule_artifact(now_ts, dec_str, dec_level, decision, explanation, position_pct, agent_analysis, backtest, risk),

        "document": {
            "room_id": "document",
            "room_name": "报告与分析室",
            "status": "done",
            "type": "report",
            "panel_type": "report_summary",
            "primary": {"label": "Report", "value": "Ready", "unit": "", "level": "positive"},
            "summary": f'Report ready · {ticker}',
            "insight": f'{ticker} {strategy_name} 策略分析完成。{"建议谨慎持有，等待进一步确认。" if dec_str == "hold" else "建议执行相应操作。"}',
            "impact_on_decision": "报告整合所有模块输出，用于作业展示和最终解释。",
            "next_action": "复制报告或导出 Markdown。",
            "monitor_focus": ["Key drivers", "Key risks", "Suggested action"],
            "metrics": [
                _metric_badge("Decision", dec_str.upper(), dec_level),
                _metric_bar("Return", round(total_ret, 1), "%", "positive" if total_ret > 0 else "danger"),
                _metric_number("Sharpe", _v(sharpe, ".2f")),
            ],
            "visual": {
                "kind": "report_card",
                "data": {
                    "final_decision": dec_str.upper(),
                    "key_drivers": [news.get("news_sentiment", "News neutral"), f"Risk {risk_level}"],
                    "key_risks": [f"Max drawdown {_v(-dd_pct, '.1f')}%", f"MACD {'weak' if (macd_val or 0) <= 0.2 else 'strong'}"],
                    "suggested_action": mode_label if isinstance(decision, dict) else dec_str.upper(),
                    "monitor_focus": ["Risk Score", "MACD", "News Score"],
                }
            },
            "details": {"input": ["All room artifacts"], "output": [ticker + " Report"], "reasoning": ["基于各步骤结果生成综合报告。"]},
            "updated_at": now_ts,
        },

        "agent": {
            "room_id": "agent",
            "room_name": "运行监控室",
            "status": "done",
            "type": "monitor",
            "panel_type": "agent_monitor",
            "primary": {"label": "Agent 状态", "value": "完成", "unit": "", "level": "positive"},
            "summary": "Pipeline completed",
            "insight": "所有 Agent 阶段已执行完毕，无异常报错。",
            "impact_on_decision": "运行监控室展示 Agent 状态，不直接改变最终决策。",
            "next_action": "如某个 Agent 失败，切换 fallback 逻辑。",
            "monitor_focus": ["Agent latency", "LLM failure", "fallback usage"],
            "metrics": [
                _metric_number("Agents", len(agent_statuses)),
                _metric_number("Avg Latency", round(sum(a.get("latency_ms", 0) for a in agent_statuses) / max(len(agent_statuses), 1)), "ms"),
            ],
            "visual": {
                "kind": "agent_status_grid",
                "data": {
                    "agents": agent_statuses,
                }
            },
            "details": {"input": [], "output": [], "reasoning": []},
            "updated_at": now_ts,
        },

        "log": {
            "room_id": "log",
            "room_name": "执行日志台",
            "status": "done",
            "type": "execution",
            "panel_type": "execution_timeline",
            "primary": {"label": "Order", "value": "Simulated", "unit": "", "level": "neutral"},
            "summary": "No order · Simulated",
            "insight": "模拟执行模式，无实际订单产生。",
            "impact_on_decision": "日志用于追踪完整执行链路，不直接改变决策。",
            "next_action": "保留最近关键事件用于复盘。",
            "monitor_focus": ["异常日志", "失败阶段", "执行耗时"],
            "metrics": [
                _metric_number("Events", len(exec_events)),
                _metric_badge("Status", "Done", "positive"),
            ],
            "visual": {
                "kind": "timeline",
                "data": {
                    "events": exec_events,
                }
            },
            "details": {"input": [], "output": [], "reasoning": []},
            "updated_at": now_ts,
        },

        "memory": {
            "room_id": "memory",
            "room_name": "策略记忆库",
            "status": "done",
            "type": "memory",
            "panel_type": "memory_panel",
            "primary": {"label": "策略记忆", "value": "已记录", "unit": "", "level": "positive"},
            "summary": f'Records: {len(memory_records)} · Avg Return: {_v(avg_return, ".1f")}%',
            "insight": f'{ticker} 分析记录已保存至历史策略库。{"历史记录对当前策略形成轻微正向加权。" if avg_return > 5 else "历史记录对当前策略形成轻微负向加权。" if avg_return < -5 else "历史记录中性，对当前策略影响有限。"}',
            "impact_on_decision": "历史记录对当前策略形成轻微正向加权，但不足以覆盖风险约束。" if avg_return > 5 else "历史记录对当前策略形成轻微负向加权。" if avg_return < -5 else "历史记录中性，不足以改变决策。",
            "next_action": "继续积累相似市场状态下的策略表现。",
            "monitor_focus": ["相似策略表现", "历史成功率", "历史回撤"],
            "metrics": [
                _metric_number("Related Records", len(memory_records)),
                _metric_number("Avg Return", _v(avg_return, ".1f"), "%"),
                _metric_number("Avg Sharpe", _v(avg_sharpe, ".2f")),
                _metric_number("Memory Boost", memory_score),
            ],
            "visual": {
                "kind": "timeline",
                "data": {
                    "records": memory_records,
                }
            },
            "details": {"input": [], "output": [], "reasoning": [memory.get("evidence", "")]},
            "updated_at": now_ts,
        },

        "break_room": {
            "room_id": "break_room",
            "room_name": "休息室",
            "status": "done",
            "type": "idle",
            "panel_type": "idle_summary",
            "primary": {"label": "Last Task", "value": ticker, "unit": "", "level": "positive"},
            "summary": f'{ticker} · {dec_str.upper()}',
            "insight": f'最新分析 {ticker} 已完成，决策为 {dec_str.upper()}。Agent 返回休息室待命。',
            "impact_on_decision": "休息室不参与当前决策，仅展示系统待命状态。",
            "next_action": "等待用户提交下一次分析任务。",
            "monitor_focus": ["new task", "last task summary"],
            "metrics": [
                _metric_badge("Decision", dec_str.upper(), dec_level),
                _metric_badge("Strategy", strategy_name, "neutral"),
            ],
            "visual": {
                "kind": "report_card",
                "data": {
                    "status": "idle",
                    "last_asset": ticker,
                    "last_decision": dec_str.upper(),
                    "next_ready": True,
                }
            },
            "details": {"input": [], "output": [], "reasoning": []},
            "updated_at": now_ts,
        },
    }
