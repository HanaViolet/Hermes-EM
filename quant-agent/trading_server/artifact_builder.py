"""Room Artifact Builder — generates all 12 room artifacts from trading results."""
from __future__ import annotations
from datetime import datetime
from typing import Any
import json
import os
import threading


TELEMETRY_PATH = os.path.join(os.path.dirname(__file__), "..", "ClawLibrary", "src", "data", "trading-telemetry.json")


def _v(val, fmt=".2f", default="N/A"):
    if val is None:
        return default
    try:
        return format(float(val), fmt)
    except Exception:
        return str(val)


def _lv(prefix, val, unit="", prefix_zh=None):
    item = {"label": prefix, "value": str(val), "unit": unit, "display": "number", "level": "neutral"}
    if prefix_zh is not None:
        item["label_zh"] = prefix_zh
    return item


def _metric_badge(label, value, level="neutral", label_zh=None):
    item = {"label": label, "value": value if isinstance(value, dict) else str(value), "display": "badge", "level": level}
    if label_zh is not None:
        item["label_zh"] = label_zh
    return item


def _metric_bar(label, value, unit="", level="neutral", label_zh=None):
    item = {"label": label, "value": value, "unit": unit, "display": "bar", "level": level}
    if label_zh is not None:
        item["label_zh"] = label_zh
    return item


def _metric_number(label, value, unit="", level="neutral", label_zh=None):
    item = {"label": label, "value": value, "unit": unit, "display": "number", "level": level}
    if label_zh is not None:
        item["label_zh"] = label_zh
    return item


def _load_trading_history():
    """Load historical trading records from trading_history.json."""
    path = os.path.join(os.path.dirname(__file__), "trading_history.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


def _stage_latency_map(stage_timestamps):
    """Build {stage: {'time': str, 'latency_ms': int}} from real transition timestamps."""
    if not stage_timestamps:
        return {}
    from datetime import datetime, timezone
    parsed = []
    for entry in stage_timestamps:
        if not isinstance(entry, dict):
            continue
        ts = entry.get("timestamp")
        if not ts:
            continue
        try:
            # Handle ISO strings with or without timezone
            if ts.endswith("Z"):
                ts = ts[:-1] + "+00:00"
            dt = datetime.fromisoformat(ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            parsed.append((entry.get("stage"), dt))
        except Exception:
            continue
    if not parsed:
        return {}
    out = {}
    for i, (stage, dt) in enumerate(parsed):
        if i + 1 < len(parsed):
            latency_ms = max(1, int((parsed[i + 1][1] - dt).total_seconds() * 1000))
        else:
            latency_ms = max(1, int((datetime.now(timezone.utc) - dt).total_seconds() * 1000))
        out[stage] = {"time": dt.strftime("%H:%M:%S"), "latency_ms": latency_ms}
    return out


def _build_exec_events(now_ts, ticker, rows_val, rsi_val, macd_val, news_score, news_sentiment, risk_score,
                       gate_status, gate_label_en, gate_label_zh, backtest, dec_str, decision_zh, position_pct,
                       stage_timestamps=None):
    """Build execution timeline events with real timestamps when available."""
    bt_return = round((backtest.get("total_return") or 0) * 100, 1)
    bt_sharpe = round(backtest.get("sharpe_ratio", 0), 2)
    bt_maxdd = round(abs(backtest.get("max_drawdown", 0)) * 100, 1)
    _news_score_num = news_score if news_score is not None else 50
    _sentiment_en = str(news_sentiment) if news_sentiment != "N/A" else "neutral"
    _sentiment_zh_map = {"positive": "正面", "negative": "负面", "neutral": "中性"}
    _sentiment_zh = _sentiment_zh_map.get(_sentiment_en, _sentiment_en)
    _decision_en = dec_str.upper()
    _position_pct = round(position_pct * 100)

    latency_map = _stage_latency_map(stage_timestamps)

    # Ordered event descriptors with their corresponding stage key
    event_specs = [
        ("start", "info", f"Analysis started for {ticker}", f"开始分析 {ticker}"),
        ("data", "success", f"Loaded {rows_val or '?'} bars for {ticker}", f"已加载 {ticker} 的 {rows_val or '?'} 根 K 线"),
        ("indicator", "info", f"RSI {_v(rsi_val, '.1f')}, MACD {_v(macd_val, '.3f')}", f"RSI {_v(rsi_val, '.1f')}，MACD {_v(macd_val, '.3f')}"),
        ("news", "info", f"News sentiment {_sentiment_en} (score {_news_score_num})", f"新闻情绪 {_sentiment_zh}（分数 {_news_score_num}）"),
        ("risk", "warning" if gate_status != "pass" else "success", f"Risk gate {gate_label_en} (score {risk_score})", f"风险闸门 {gate_label_zh}（分数 {risk_score}）"),
        ("backtest", "success" if bt_return > 0 else "warning", f"Backtest return {bt_return}%, Sharpe {bt_sharpe}, Max DD {bt_maxdd}%", f"回测收益 {bt_return}%，夏普 {bt_sharpe}，最大回撤 {bt_maxdd}%"),
        ("decision", "success" if _decision_en == "BUY" else "warning" if _decision_en == "SELL" else "info", f"Final decision: {_decision_en} at {_position_pct}% position", f"最终决策：{decision_zh}，仓位 {_position_pct}%"),
        ("report", "success", "Report generated and agents returned to idle", "报告已生成，Agent 返回待命"),
    ]

    # Stage key mapping for timestamp lookup
    stage_key_map = {
        "start": "loading_data",
        "data": "loading_data",
        "indicator": "calculating_indicators",
        "news": "analyzing_news",
        "risk": "checking_risk",
        "backtest": "running_backtest",
        "decision": "making_decision",
        "report": "writing_report",
    }

    base_time = datetime.strptime(now_ts[:19], "%Y-%m-%d %H:%M:%S") if len(now_ts) >= 19 else datetime.now()
    events = []
    for i, (stage, level, msg_en, msg_zh) in enumerate(event_specs):
        mapped_stage = stage_key_map.get(stage)
        info = latency_map.get(mapped_stage, {}) if mapped_stage else {}
        if info.get("time"):
            time_str = info["time"]
        else:
            # Fallback: realistic staggered timestamps
            time_str = (base_time.fromtimestamp(base_time.timestamp() + i)).strftime("%H:%M:%S")
        events.append({
            "time": time_str,
            "stage": stage,
            "level": level,
            "message": {"en": msg_en, "zh": msg_zh},
        })
    return events


def _build_agent_statuses(now_ts, ticker, rows_val, rsi_val, macd_val, news_score, news_sentiment, risk_score, dec_str, stage_timestamps=None):
    """Build richer agent status cards for the Agent Monitor room.

    Each agent exposes role, task, input/output, health and progress so the
    frontend can render a meaningful monitoring dashboard. Latency is computed
    from real stage transition timestamps when available.
    """
    rows = rows_val if rows_val is not None else "?"
    rsi = _v(rsi_val, ".1f") if rsi_val is not None else "N/A"
    macd = _v(macd_val, ".3f") if macd_val is not None else "N/A"
    sentiment = news_sentiment if news_sentiment else "neutral"
    decision = dec_str.upper() if dec_str else "HOLD"

    latency_map = _stage_latency_map(stage_timestamps)

    def _agent(role, stage, default_latency, task_en, task_zh, input_en, input_zh, output_en, output_zh, summary_en, summary_zh):
        info = latency_map.get(stage, {})
        latency = info.get("latency_ms", default_latency)
        time_str = info.get("time", now_ts[11:])
        healthy = stage in latency_map
        return {
            "name_key": role,
            "role_key": role,
            "status": "done" if healthy else "idle",
            "latency_ms": latency,
            "task": {"en": task_en, "zh": task_zh},
            "input": {"en": input_en, "zh": input_zh},
            "output": {"en": output_en, "zh": output_zh},
            "summary": {"en": summary_en, "zh": summary_zh},
            "progress_pct": 100 if healthy else 0,
            "health": "healthy" if healthy else "degraded",
            "error_count": 0,
            "last_seen": time_str,
        }

    return [
        _agent(
            "data", "loading_data", 120,
            "Load market data", "加载市场数据",
            f"{ticker} OHLCV", f"{ticker} 行情数据",
            f"{rows} daily bars", f"{rows} 条日线数据",
            f"{rows} bars loaded", f"已加载 {rows} 条数据",
        ),
        _agent(
            "indicator", "calculating_indicators", 80,
            "Compute technical indicators", "计算技术指标",
            "Price & volume series", "价格与成交量序列",
            f"RSI {rsi}, MACD {macd}", f"RSI {rsi}, MACD {macd}",
            f"RSI {rsi}, MACD {macd}", f"RSI {rsi}, MACD {macd}",
        ),
        _agent(
            "news", "analyzing_news", 1200,
            "Fetch and score news", "获取并评分新闻",
            f"{ticker} news feed", f"{ticker} 新闻流",
            f"Sentiment {sentiment}, score {news_score}", f"情绪 {sentiment}，评分 {news_score}",
            f"News score {news_score}", f"新闻评分 {news_score}",
        ),
        _agent(
            "risk", "checking_risk", 60,
            "Evaluate risk constraints", "评估风险约束",
            "Returns & drawdown series", "收益与回撤序列",
            f"Risk score {risk_score}/100", f"风险分数 {risk_score}/100",
            f"Risk {risk_score}/100", f"风险 {risk_score}/100",
        ),
        _agent(
            "decision", "making_decision", 80,
            "Aggregate signals into decision", "汇总信号生成决策",
            "Strategy + risk + backtest + news", "策略 + 风险 + 回测 + 新闻",
            f"Final decision {decision}", f"最终决策 {decision}",
            decision, decision,
        ),
    ]


def _build_current_strategy_detail(strategy_name, strategy_scores, indicator, decision, llm_advice):
    """Build current strategy detail card for the Strategy Lab room."""
    signal = (decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)).upper()

    current_score = None
    for sc in strategy_scores:
        if sc.get("name") == strategy_name:
            current_score = sc.get("score")
            break

    params = []
    reasoning = ""
    description = ""

    if strategy_name == "ma":
        params = [
            {"label": "短期均线", "value": "20"},
            {"label": "长期均线", "value": "60"},
            {"label": "交易规则", "value": "MA20 > MA60 → 做多"},
        ]
        description = "双均线交叉策略：短期均线上穿长期均线买入，反之卖出。"
        ma20 = indicator.get("ma20")
        ma60 = indicator.get("ma60")
        if ma20 is not None and ma60 is not None:
            if float(ma20) > float(ma60):
                reasoning = f"MA20 ({_v(ma20, '.2f')}) 高于 MA60 ({_v(ma60, '.2f')})，趋势偏多，产生买入信号。"
            else:
                reasoning = f"MA20 ({_v(ma20, '.2f')}) 低于 MA60 ({_v(ma60, '.2f')})，趋势偏空，产生卖出/观望信号。"
        else:
            reasoning = "均线数据不足，无法生成具体信号推理。"
    elif strategy_name == "rsi":
        params = [
            {"label": "超买阈值", "value": "70"},
            {"label": "超卖阈值", "value": "30"},
            {"label": "交易规则", "value": "RSI < 30 买入，> 70 卖出"},
        ]
        description = "RSI 动量策略：超卖买入，超买卖出。"
        rsi = indicator.get("rsi")
        if rsi is not None:
            rsi_f = float(rsi)
            if rsi_f < 30:
                reasoning = f"RSI ({_v(rsi, '.2f')}) 低于 30，处于超卖区间，产生买入信号。"
            elif rsi_f > 70:
                reasoning = f"RSI ({_v(rsi, '.2f')}) 高于 70，处于超买区间，产生卖出信号。"
            else:
                reasoning = f"RSI ({_v(rsi, '.2f')}) 处于 30-70 中性区间，维持观望。"
        else:
            reasoning = "RSI 数据不足，无法生成具体信号推理。"
    elif strategy_name == "momentum":
        params = [
            {"label": "回看周期", "value": "20 日"},
            {"label": "交易规则", "value": "20日收益 > 0 → 做多"},
        ]
        description = "动量策略：20日收益为正买入，为负卖出。"
        ret = indicator.get("return_20d")
        if ret is not None:
            ret_f = float(ret)
            if ret_f > 0:
                reasoning = f"20日收益率 ({_v(ret_f * 100, '.2f')}%) 为正，momentum 偏多，产生买入信号。"
            else:
                reasoning = f"20日收益率 ({_v(ret_f * 100, '.2f')}%) 为负，momentum 偏空，产生卖出/观望信号。"
        else:
            reasoning = "收益率数据不足，无法生成具体信号推理。"
    else:
        params = [{"label": "模式", "value": "自动"}]
        description = "自动模式：系统比较候选策略后选择评分最高者。"
        advice_text = ""
        if isinstance(llm_advice, dict):
            advice_text = llm_advice.get("strategy_advice", "")
        elif isinstance(llm_advice, str):
            advice_text = llm_advice
        if strategy_scores:
            top = strategy_scores[0]
            reasoning = f"自动选择得分最高的策略：{top.get('name', '?')}（评分 {top.get('score', 0)}）。{advice_text}"
        else:
            reasoning = advice_text or "自动选择当前得分最高的策略。"

    return {
        "name": strategy_name,
        "name_zh": {"ma": "均线交叉", "rsi": "RSI 动量", "momentum": "20日动量", "auto": "自动选择"}.get(strategy_name, strategy_name),
        "signal": signal,
        "score": current_score if current_score is not None else 50,
        "params": params,
        "reasoning": reasoning,
        "description": description,
    }


def _rank_news_items(raw_news, key_events, risk_events, news_score=50, news_confidence=0.5):
    """Rank/filter news using a sentiment-and-risk weighted recommendation score.

    Reference: Benhenda (2025), FinRL-DeepSeek — LLM trading recommendation scores
    (1=strong sell, 5=strong buy) and risk scores (1=low, 5=high) are fused to
    modulate trading decisions. We approximate the same idea with the available
    sentiment / impact labels and confidence values.
    """
    items = []
    base_confidence = max(0.0, min(1.0, news_confidence or 0.5))

    def _impact_to_rec(impact):
        impact = str(impact).lower()
        if impact == "positive":
            return 5
        if impact == "negative":
            return 1
        return 3

    def _impact_to_risk(impact):
        impact = str(impact).lower()
        if impact == "negative":
            return 4
        if impact == "positive":
            return 2
        return 3

    # Raw news: derive rec/risk from any available sentiment or impact field
    for item in raw_news:
        if not isinstance(item, dict):
            continue
        sentiment = str(item.get("sentiment", item.get("impact", "neutral"))).lower()
        rec = {"positive": 5, "buy": 5, "bullish": 5, "negative": 1, "sell": 1, "bearish": 1}.get(sentiment, 3)
        risk = {"positive": 2, "buy": 2, "negative": 4, "sell": 4}.get(sentiment, 3)
        conf = max(0.0, min(1.0, float(item.get("confidence", base_confidence))))
        # Fuse rec and risk: high risk dampens the recommendation
        final = rec * (1 - (risk - 1) / 8.0) * (0.5 + 0.5 * conf)
        items.append({
            "type": "news",
            "title": item.get("title", "Untitled"),
            "source": item.get("source", ""),
            "published_at": item.get("published_at", ""),
            "summary": item.get("summary", ""),
            "url": item.get("url", ""),
            "rec_score": rec,
            "risk_score": risk,
            "confidence": conf,
            "final_score": round(final, 2),
        })

    # Key events: higher weight because they are distilled market events
    for ev in key_events:
        text = ev.get("event", ev) if isinstance(ev, dict) else str(ev)
        impact = ev.get("impact", "neutral") if isinstance(ev, dict) else "neutral"
        rec = _impact_to_rec(impact)
        risk = _impact_to_risk(impact)
        conf = max(0.0, min(1.0, float(ev.get("confidence", base_confidence)) if isinstance(ev, dict) else base_confidence))
        final = rec * (1 - (risk - 1) / 8.0) * (0.5 + 0.5 * conf) * 1.2  # key-event boost
        items.append({
            "type": "key_event",
            "title": text,
            "source": "",
            "published_at": "",
            "summary": "",
            "url": "",
            "rec_score": rec,
            "risk_score": risk,
            "confidence": conf,
            "final_score": round(final, 2),
        })

    # Risk events: risk score is elevated, used as a warning filter
    for ev in risk_events:
        text = ev.get("event", ev) if isinstance(ev, dict) else str(ev)
        impact = ev.get("impact", "negative") if isinstance(ev, dict) else "negative"
        rec = _impact_to_rec(impact)
        risk = min(5, _impact_to_risk(impact) + 1)
        conf = max(0.0, min(1.0, float(ev.get("confidence", base_confidence)) if isinstance(ev, dict) else base_confidence))
        final = rec * (1 - (risk - 1) / 8.0) * (0.5 + 0.5 * conf) * 1.3  # risk-event boost
        items.append({
            "type": "risk_event",
            "title": text,
            "source": "",
            "published_at": "",
            "summary": "",
            "url": "",
            "rec_score": rec,
            "risk_score": risk,
            "confidence": conf,
            "final_score": round(final, 2),
        })

    # Sort by final recommendation score descending
    items.sort(key=lambda x: x["final_score"], reverse=True)
    return items


def _compute_multi_factor_score(indicator):
    """Compute a simplified multi-factor score inspired by Carhart (1997).

    Carhart four-factor model: Market, Size (SMB), Value (HML), Momentum (MOM).
    With single-asset daily data we use observable proxies:
      - Market premium proxy   : 20-day return vs zero benchmark
      - Momentum proxy         : sign/magnitude of 20-day return
      - Risk-adjustment proxy  : inverse of 20-day volatility
      - Trend proxy            : MA20 vs MA60 cross-over
    Score is normalized to 0-100, 50 = neutral.
    """
    ret_20d = indicator.get("return_20d")
    vol_20d = indicator.get("volatility_20d")
    ma20 = indicator.get("ma20")
    ma60 = indicator.get("ma60")

    # Momentum factor (MOM): annualized-ish, capped
    mom = 0.0
    if ret_20d is not None:
        mom = max(-1, min(1, float(ret_20d) * 12))  # ~ annualized, capped ±100%

    # Market factor: same proxy, milder weight
    mkt = mom * 0.6

    # Risk-adjustment factor: lower volatility is better
    risk_adj = 0.0
    if vol_20d is not None and vol_20d > 0:
        risk_adj = max(-0.5, min(0.5, 0.15 / float(vol_20d) - 0.6))

    # Trend factor: dual-MA cross-over
    trend = 0.0
    if ma20 is not None and ma60 is not None and ma60 != 0:
        trend = max(-0.5, min(0.5, (float(ma20) - float(ma60)) / float(ma60) * 10))

    # Equal-weighted composite, then map [-2, 2] -> [0, 100]
    composite = mkt * 0.25 + mom * 0.25 + risk_adj * 0.25 + trend * 0.25
    score = 50 + composite * 25
    return round(max(0, min(100, score)), 2)


def _reflect_on_history_and_knowledge(history_records, current_strategy, indicator, knowledge_base):
    """RAG-style reflection over historical runs + strategy knowledge base.

    Returns bilingual reflection (zh/en) and literature-backed recommendations.
    """
    def _parse_num(v):
        if v is None or v == "N/A":
            return None
        try:
            return float(str(v).replace("%", ""))
        except Exception:
            return None

    rsi = indicator.get("rsi")
    ret_20d = indicator.get("return_20d")
    vol_20d = indicator.get("volatility_20d")
    ma20 = indicator.get("ma20")
    ma60 = indicator.get("ma60")

    # Retrieval: same-strategy runs (limited to records that have numeric returns)
    matches = [
        r for r in history_records
        if r.get("strategy") == current_strategy and _parse_num(r.get("return")) is not None
    ]
    match_count = len(matches)
    avg_return = sum(_parse_num(r.get("return")) for r in matches) / match_count if match_count else None

    # Build reflection in both languages
    parts_zh = []
    parts_en = []
    if ret_20d is not None:
        if float(ret_20d) > 0:
            parts_zh.append("当前 20 日收益为正，依据 Jegadeesh & Titman (1993) 的动量效应，短期趋势偏多。")
            parts_en.append("The current 20-day return is positive; per Jegadeesh & Titman (1993), short-term momentum is bullish.")
        else:
            parts_zh.append("当前 20 日收益为负，依据 Jegadeesh & Titman (1993) 的动量效应，短期趋势偏空。")
            parts_en.append("The current 20-day return is negative; per Jegadeesh & Titman (1993), short-term momentum is bearish.")
    if vol_20d is not None and float(vol_20d) > 0.25:
        parts_zh.append("波动率偏高，参考 Benhenda (2025) 的风险敏感框架，应降低仓位并提高风险惩罚。")
        parts_en.append("Elevated volatility; referencing Benhenda (2025), reduce position size and increase risk penalty.")
    if rsi is not None:
        rsi_f = float(rsi)
        if rsi_f > 70:
            parts_zh.append("RSI 超买，依据 Wilder (1978) 的均值回归逻辑，需警惕回调。")
            parts_en.append("RSI is overbought; per Wilder (1978) mean-reversion logic, watch for a pullback.")
        elif rsi_f < 30:
            parts_zh.append("RSI 超卖，依据 Wilder (1978) 的均值回归逻辑，可能存在反弹机会。")
            parts_en.append("RSI is oversold; per Wilder (1978) mean-reversion logic, a rebound opportunity may exist.")
    if ma20 is not None and ma60 is not None:
        if float(ma20) > float(ma60):
            parts_zh.append("MA20 上穿 MA60，符合 Edwards & Magee (1948) 的趋势跟踪原则。")
            parts_en.append("MA20 is above MA60, consistent with Edwards & Magee (1948) trend-following principles.")
        else:
            parts_zh.append("MA20 位于 MA60 下方，趋势信号偏空。")
            parts_en.append("MA20 is below MA60; trend signal is bearish.")

    if match_count >= 2 and avg_return is not None:
        parts_zh.append(f"历史记录中该策略共有 {match_count} 条可计算收益记录，平均收益 {avg_return:.2f}%。")
        parts_en.append(f"Historical records contain {match_count} return-calculable runs for this strategy, with an average return of {avg_return:.2f}%.")
    elif match_count == 1:
        parts_zh.append(f"历史记录中该策略仅有 1 条可计算收益记录（{avg_return:.2f}%），样本不足，应谨慎外推。")
        parts_en.append(f"Only 1 return-calculable record ({avg_return:.2f}%) exists for this strategy; sample is too small to extrapolate.")
    else:
        parts_zh.append("历史记录中缺少该策略的收益数据，反思主要依赖文献方法论而非历史统计。")
        parts_en.append("No return data for this strategy in history; reflection relies mainly on literature methodology rather than historical statistics.")

    reflection_zh = " ".join(parts_zh) if parts_zh else "暂无足够指标和历史记录进行反思。"
    reflection_en = " ".join(parts_en) if parts_en else "Insufficient indicators and historical records for reflection."

    # Recommend strategies from knowledge base that fit the current regime
    recommendations = []
    if ret_20d is not None and float(ret_20d) > 0:
        recommendations.append({
            "id": "momentum_20d",
            "reason": "动量因子在当前为正收益环境下有文献支持。",
            "reason_en": "Momentum factor is supported by literature in the current positive-return environment.",
            "paper": "Jegadeesh & Titman (1993)",
        })
    if rsi is not None and float(rsi) < 30:
        recommendations.append({
            "id": "rsi_momentum",
            "reason": "RSI 超卖区符合均值反转条件。",
            "reason_en": "RSI oversold zone matches mean-reversion conditions.",
            "paper": "Wilder (1978)",
        })
    if ma20 is not None and ma60 is not None and float(ma20) > float(ma60):
        recommendations.append({
            "id": "ma_crossover",
            "reason": "均线金叉支持趋势跟踪。",
            "reason_en": "Moving-average golden cross supports trend following.",
            "paper": "Edwards & Magee (1948)",
        })
    if vol_20d is not None and float(vol_20d) > 0.25:
        recommendations.append({
            "id": "finrl_deepseek",
            "reason": "高波动环境下风险敏感 RL 可 penalize 高风险路径。",
            "reason_en": "Risk-sensitive RL can penalize high-risk paths in a high-volatility environment.",
            "paper": "Benhenda (2025)",
        })
    if not recommendations:
        recommendations.append({
            "id": "ma_crossover",
            "reason": "默认趋势跟踪基准。",
            "reason_en": "Default trend-following benchmark.",
            "paper": "Edwards & Magee (1948)",
        })

    return {
        "match_count": match_count,
        "avg_return": avg_return,
        "reflection": reflection_zh,
        "reflection_en": reflection_en,
        "recommendations": recommendations,
        "paper_refs": ["Carhart (1997)", "Jegadeesh & Titman (1993)", "Edwards & Magee (1948)", "Wilder (1978)", "Benhenda (2025)"],
    }


# ── Strategy Knowledge Base (literature + built-in) ──
STRATEGY_KNOWLEDGE_BASE = [
    {
        "id": "ma_crossover",
        "name": "MA Crossover",
        "name_zh": "均线交叉策略",
        "type": "classic",
        "source": "built-in",
        "paper": "Edwards & Magee (1948), Technical Analysis of Stock Trends",
        "paper_url": "https://archive.org/details/technicalanalysi00edwa",
        "description": "双均线（短期/长期）交叉产生买卖信号。金叉买入，死叉卖出。",
        "description_en": "Dual moving-average (short/long) crossover generates buy/sell signals: golden cross to buy, death cross to sell.",
        "adopted": True,
        "tags": ["趋势跟踪", "技术分析"],
    },
    {
        "id": "rsi_momentum",
        "name": "RSI Momentum",
        "name_zh": "RSI 动量策略",
        "type": "classic",
        "source": "built-in",
        "paper": "Wilder (1978), New Concepts in Technical Trading Systems",
        "paper_url": "https://archive.org/details/newconceptsinite00wild",
        "description": "利用 RSI 超买（>70）超卖（<30）区域判断反转时机。",
        "description_en": "Uses RSI overbought (>70) and oversold (<30) zones to identify reversal timing.",
        "adopted": True,
        "tags": ["均值回归", "技术分析"],
    },
    {
        "id": "macd_signal",
        "name": "MACD Signal",
        "name_zh": "MACD 信号策略",
        "type": "classic",
        "source": "built-in",
        "paper": "Appel (1979), The Stock Option and No-Load Switch Fund Scalper's Manual",
        "paper_url": "https://www.cmtassociation.org/presenter/gerald-appel/",
        "description": "MACD 线与信号线交叉 + 柱状图背离确认趋势方向。",
        "description_en": "MACD line/signal-line crossovers plus histogram divergence confirm trend direction.",
        "adopted": True,
        "tags": ["趋势跟踪", "技术分析"],
    },
    {
        "id": "momentum_20d",
        "name": "Momentum (20D)",
        "name_zh": "20日动量策略",
        "type": "classic",
        "source": "built-in",
        "paper": "Jegadeesh & Titman (1993), Returns to Buying Winners and Selling Losers",
        "paper_url": "https://doi.org/10.1111/j.1540-6261.1993.tb04703.x",
        "description": "以过去 20 日收益率为动量代理变量，正收益做多，负收益离场。",
        "description_en": "Uses past 20-day return as a momentum proxy: go long on positive return, exit on negative.",
        "adopted": True,
        "tags": ["动量", "技术分析"],
    },
    {
        "id": "multi_agent_llm",
        "name": "Multi-Agent LLM Voting",
        "name_zh": "多Agent LLM投票框架",
        "type": "llm",
        "source": "paper",
        "paper": "Xiao et al. (2025), TradingAgents: Multi-Agents LLM Financial Trading Framework, AAAI",
        "paper_url": "https://arxiv.org/abs/2412.20138",
        "description": "Data/News/Technical/Risk/Decision 五个Agent协作，通过投票+辩论达成共识决策。",
        "description_en": "Five agents (Data/News/Technical/Risk/Decision) collaborate and reach consensus via voting and debate.",
        "adopted": True,
        "tags": ["LLM智能体", "多智能体", "投票"],
    },
    {
        "id": "finrl_deepseek",
        "name": "FinRL-DeepSeek RL",
        "name_zh": "FinRL-DeepSeek 强化学习",
        "type": "rl",
        "source": "paper",
        "paper": "Benhenda (2025), FinRL-DeepSeek: LLM-Infused Risk-Sensitive RL for Trading Agents",
        "paper_url": "https://arxiv.org/abs/2502.07393",
        "description": "LLM 注入的 PPO/A2C 强化学习框架，带有风险敏感机制。",
        "description_en": "LLM-infused PPO/A2C reinforcement learning framework with risk-sensitive mechanisms.",
        "adopted": False,
        "tags": ["强化学习", "LLM", "PPO", "A2C", "风险敏感"],
    },
    {
        "id": "finrl_ensemble",
        "name": "FinRL Ensemble (5-Agent)",
        "name_zh": "FinRL 集成策略（5-Agent）",
        "type": "rl",
        "source": "literature",
        "paper": "Liu et al. (2020), FinRL: A Deep Reinforcement Learning Library for Automated Stock Trading",
        "paper_url": "https://arxiv.org/abs/2011.09607",
        "description": "A2C + PPO + DDPG + SAC + TD3 五算法集成，通过Sharpe比率加权投票。",
        "description_en": "Ensemble of A2C, PPO, DDPG, SAC and TD3 algorithms weighted by Sharpe-ratio voting.",
        "adopted": False,
        "tags": ["强化学习", "集成", "PPO", "A2C", "SAC"],
    },
    {
        "id": "maddqn_timesnet",
        "name": "MADDQN + TimesNet",
        "name_zh": "MADDQN + TimesNet",
        "type": "rl",
        "source": "literature",
        "paper": "Huang et al. (2024), A multi-agent reinforcement learning framework for optimizing financial trading strategies based on TimesNet",
        "paper_url": "https://doi.org/10.1016/j.eswa.2023.121502",
        "description": "多Agent Double DQN 配 TimesNet 时序网络，一Agent追收益一Agent管风险。",
        "description_en": "Multi-agent Double DQN with TimesNet temporal network: one agent targets returns, another manages risk.",
        "adopted": False,
        "tags": ["强化学习", "多智能体", "TimesNet", "风险控制"],
    },
    {
        "id": "marl_hft",
        "name": "MARL for HFT",
        "name_zh": "多Agent强化学习高频交易",
        "type": "rl",
        "source": "literature",
        "paper": "Wei et al. (2024), Multi-Agent Reinforcement Learning for High-Frequency Trading Strategy Optimization",
        "paper_url": "https://doi.org/10.60087/vol2iissue1.p008",
        "description": "VDN + MAPPO 协调高频交易Agent，Sharpe 2.87，最大回撤 12.3%。",
        "description_en": "VDN + MAPPO coordinate high-frequency trading agents; reported Sharpe 2.87, max drawdown 12.3%.",
        "adopted": False,
        "tags": ["强化学习", "多智能体", "高频交易", "VIX"],
    },
    {
        "id": "multi_timeframe_madrl",
        "name": "Multi-Timeframe MADRL",
        "name_zh": "多时间框架MADRL",
        "type": "rl",
        "source": "literature",
        "paper": "López Figueroa (2025), A multi-agent deep reinforcement learning framework using multiple timeframe data for algorithmic trading",
        "paper_url": "https://upcommons.upc.edu/entities/publication/2b83f758-56df-44d7-8121-6fa3e8185c50",
        "description": "分层 MADRL 架构：小时/日/周专用 Agent 输入 Meta-Agent 决策，S&P 500 上收益 21.58%，Sharpe 1.69。",
        "description_en": "Hierarchical MADRL with hour/day/week specialist agents feeding a meta-agent; reported S&P 500 return 21.58%, Sharpe 1.69.",
        "adopted": False,
        "tags": ["强化学习", "多智能体", "多时间框架", "元智能体"],
    },
    {
        "id": "multi_asset_marl",
        "name": "Multi-Asset MARL",
        "name_zh": "多资产MARL自适应交易",
        "type": "rl",
        "source": "literature",
        "paper": "Cheng & Sun (2024), Multiagent-based deep reinforcement learning framework for multi-asset adaptive trading and portfolio management",
        "paper_url": "https://doi.org/10.1016/j.neucom.2024.127800",
        "description": "合作式 MARL 系统同时管理多资产，动态调整配置，提升 Sharpe 和下行保护。",
        "description_en": "Cooperative MARL system manages multiple assets simultaneously, dynamically adjusting allocation to improve Sharpe and downside protection.",
        "adopted": False,
        "tags": ["强化学习", "多智能体", "投资组合", "多资产"],
    },
    {
        "id": "flag_trader",
        "name": "FLAG-TRADER",
        "name_zh": "FLAG-TRADER",
        "type": "llm",
        "source": "literature",
        "paper": "Xiong et al. (2025), FLAG-TRADER: Fusion LLM-Agent with Gradient-based Reinforcement Learning for Financial Trading",
        "paper_url": "https://arxiv.org/abs/2502.11433",
        "description": "LLM Agent 与梯度强化学习融合，自然语言推理 + 可微分策略优化。",
        "description_en": "Fuses LLM agents with gradient-based reinforcement learning, combining natural-language reasoning and differentiable policy optimization.",
        "adopted": False,
        "tags": ["LLM", "强化学习", "梯度优化", "自然语言"],
    },
]


def _build_schedule_artifact(
    now_ts,
    ticker,
    strategy_name,
    strategy_name_zh,
    current_strategy_detail,
    dec_str,
    dec_level,
    decision,
    explanation,
    position_pct,
    agent_analysis,
    backtest,
    risk,
    indicator,
    news,
):
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

    # ── Input Summary: upstream room conclusions feeding this decision ──
    rsi_val = indicator.get("rsi")
    macd_val = indicator.get("macd")
    ma20_val = indicator.get("ma20")
    ma60_val = indicator.get("ma60")
    ret_20d = indicator.get("return_20d")
    vol_20d = indicator.get("volatility_20d")
    news_sentiment = news.get("news_sentiment", "N/A") if isinstance(news, dict) else "N/A"
    news_score = news.get("news_score") if isinstance(news, dict) else None
    risk_gate_status = risk.get("gate_status", "pass") if isinstance(risk, dict) else "pass"
    risk_position_limit = risk.get("position_limit_pct", round(position_pct * 100)) if isinstance(risk, dict) else round(position_pct * 100)
    risk_score = risk.get("risk_score", 40) if isinstance(risk, dict) else 40
    bt_total_return = (backtest.get("total_return") or 0) * 100
    bt_sharpe = backtest.get("sharpe_ratio", 0)
    bt_max_dd = abs(backtest.get("max_drawdown", 0)) * 100

    if bt_total_return > 0 and bt_sharpe > 0.5 and bt_max_dd < 20:
        validation_en, validation_zh = "Cautious Pass", "谨慎通过"
    elif bt_total_return > 0:
        validation_en, validation_zh = "Pass", "通过"
    else:
        validation_en, validation_zh = "Fail", "不通过"

    if ma20_val is not None and ma60_val is not None:
        ma_gap_ratio = abs(ma20_val - ma60_val) / max(ma60_val, 1)
        if ma_gap_ratio < 0.05:
            trend_en, trend_zh = "Range-bound", "震荡盘整"
        elif ma20_val > ma60_val:
            trend_en, trend_zh = "Uptrend", "上升趋势"
        else:
            trend_en, trend_zh = "Downtrend", "下降趋势"
    else:
        trend_en, trend_zh = "Unknown", "未知"

    rsi_state_en = "Neutral" if rsi_val is not None and 30 < rsi_val < 70 else "Extreme" if rsi_val is not None else "N/A"
    rsi_state_zh = "中性" if rsi_val is not None and 30 < rsi_val < 70 else "极端" if rsi_val is not None else "暂无"

    gate_label_map = {
        "blocked": {"en": "Entry Blocked", "zh": "禁止进场"},
        "limited": {"en": "Position Limited", "zh": "限制仓位"},
        "pass": {"en": "Cleared", "zh": "可放行"},
    }
    gate_label = gate_label_map.get(risk_gate_status, gate_label_map["pass"])

    input_summary = {
        "strategy": {
            "room": "skills",
            "room_label": {"en": "Strategy Lab", "zh": "策略实验室"},
            "signal": current_strategy_detail.get("signal", "HOLD"),
            "strategy": strategy_name,
            "strategy_zh": strategy_name_zh,
            "score": current_strategy_detail.get("score", dec_score),
        },
        "risk": {
            "room": "alarm",
            "room_label": {"en": "Risk Alert", "zh": "风险报警室"},
            "gate_status": risk_gate_status,
            "gate_label": gate_label,
            "position_limit_pct": risk_position_limit,
            "risk_score": risk_score,
        },
        "backtest": {
            "room": "task_queues",
            "room_label": {"en": "Backtest Lab", "zh": "回测实验室"},
            "validation": validation_en,
            "validation_label": {"en": validation_en, "zh": validation_zh},
            "total_return_pct": round(bt_total_return, 1),
            "sharpe": round(bt_sharpe, 2),
            "max_drawdown_pct": round(bt_max_dd, 1),
        },
        "market": {
            "room": "gateway",
            "room_label": {"en": "Market Data", "zh": "市场数据室"},
            "ticker": ticker,
            "news_sentiment": news_sentiment,
            "news_sentiment_zh": {"positive": "正面", "negative": "负面", "neutral": "中性"}.get(news_sentiment, news_sentiment),
            "news_score": news_score if news_score is not None else 50,
            "data_quality": "ok",
        },
        "indicator": {
            "room": "mcp",
            "room_label": {"en": "Indicator Lab", "zh": "指标实验室"},
            "trend": {"en": trend_en, "zh": trend_zh},
            "rsi_state": {"en": rsi_state_en, "zh": rsi_state_zh},
            "macd_signal": "Weak" if (macd_val or 0) <= 0.2 else "Strong",
            "macd_signal_zh": "偏弱" if (macd_val or 0) <= 0.2 else "偏强",
            "return_20d_pct": round((ret_20d or 0) * 100, 1),
            "volatility_20d_pct": round((vol_20d or 0) * 100, 1),
        },
    }

    final_strategy = {
        "name": strategy_name,
        "name_zh": strategy_name_zh,
        "signal": current_strategy_detail.get("signal", "HOLD"),
        "score": current_strategy_detail.get("score", dec_score),
    }

    # ── Metrics for generic fallback rendering ──
    mode_labels = {
        "proceed": {"en": "Proceed", "zh": "执行"},
        "proceed_with_caution": {"en": "Caution", "zh": "谨慎"},
        "wait_for_confirmation": {"en": "Wait", "zh": "等待确认"},
        "risk_off": {"en": "Risk Off", "zh": "风险规避"},
        "watchlist": {"en": "Watch", "zh": "观察"},
    }
    mode_label_obj = mode_labels.get(mode, {"en": mode, "zh": mode})
    mode_label_en = mode_label_obj["en"]
    mode_label_zh = mode_label_obj["zh"]

    metrics = [
        _lv("Decision", dec_str.upper(), "", "决策"),
        _lv("Mode", mode_label_en, "", mode_label_zh),
        _lv("Confidence", _v(conf * 100, ".0f") + "%", "", "置信度"),
        _lv("Score", str(dec_score), "", "评分"),
        _lv("Critic", str(critic_score), "", "Critic"),
        _lv("Position", str(round(pos_after * 100)) + "%", "", "仓位"),
        _lv("Watch", watch_prio.upper(), "", "观察优先级"),
    ]
    _agent_name_zh = {
        "Indicator": "指标 Agent",
        "News": "新闻 Agent",
        "Risk": "风险 Agent",
        "Backtest": "回测 Agent",
        "Critic": "Critic",
    }
    for v in agent_votes_table:
        vote_cls = "positive" if v["vote"] == "buy" else "danger" if v["vote"] == "sell" else "warning"
        metrics.append({"label": v["agent"], "label_zh": _agent_name_zh.get(v["agent"], v["agent"]), "value": v["vote"].upper(), "unit": str(v["score"]), "display": "badge", "level": vote_cls})

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

    raw_insight = critic.get("recommendation", explanation.get("short_explanation", f"最终选择 {dec_str.upper()}。"))
    if critic.get("main_objections"):
        raw_insight += " | Critic: " + critic["main_objections"][0]

    insight = {
        "en": raw_insight if any(ord(c) < 128 for c in raw_insight) else f"Final decision: {dec_str.upper()}.",
        "zh": raw_insight if any('一' <= c <= '鿿' for c in raw_insight) else f"最终选择 {dec_str.upper()}，等待进一步确认。",
    }

    # Mode reason: explain why Auto chose this action
    mode_reason = {
        "en": f"Auto selected {dec_str.upper()} based on strategy signal, risk gate, backtest validation, and agent consensus.",
        "zh": f"Auto 模式综合策略信号、风险闸门、回测验证和 Agent 共识，最终选择 {dec_str.upper()} 动作。",
    }

    impact_on_decision = {
        "en": "The final decision integrates all agent votes, constrained by the risk gate and Critic review to avoid aggressive entries.",
        "zh": "最终决策整合所有 Agent 投票，由风险闸门和 Critic Review 限制激进买入。",
    }

    next_action = {
        "en": "Enter Wait for Confirmation mode." if mode == "wait_for_confirmation" else "Continue monitoring market signals.",
        "zh": "进入等待确认模式。" if mode == "wait_for_confirmation" else "继续监控市场信号。",
    }

    monitor_focus = [
        {"en": "Risk score falls below 35", "zh": "风险分数低于 35"},
        {"en": "MACD crossover turns positive", "zh": "MACD 转强"},
        {"en": "News score rises above 70", "zh": "新闻评分高于 70"},
    ]

    def _translate_condition(cond):
        cond_zh = cond
        replacements = [
            ("Risk Score < 35 (current: ", "风险分数 < 35（当前："),
            ("Risk Score > 60 (current: ", "风险分数 > 60（当前："),
            ("RSI < 30 (current: ", "RSI < 30（当前："),
            ("RSI > 75 (overbought warning, current: ", "RSI > 75（超买预警，当前："),
            ("RSI < 25 (oversold bounce, current: ", "RSI < 25（超卖反弹，当前："),
            ("Volatility drops below 25% (current: ", "波动率下降至 25% 以下（当前："),
            ("MACD > signal for 3 consecutive days", "MACD 连续 3 天高于信号线"),
            ("MACD crosses above signal", "MACD 上穿信号线"),
            ("News Score > 70", "新闻评分 > 70"),
            ("Max drawdown < -10%", "最大回撤 < -10%"),
        ]
        for en_part, zh_part in replacements:
            if en_part in cond:
                cond_zh = cond_zh.replace(en_part, zh_part)
        if cond_zh.endswith(")") and "（" in cond_zh:
            cond_zh = cond_zh[:-1] + "）"
        return cond_zh

    # Trigger conditions with gap calculation
    trigger_conditions = []
    for t in triggers_raw:
        if isinstance(t, dict):
            trigger_conditions.append(t)
    if not trigger_conditions:
        current_risk_score = risk.get("risk_score", 50)
        if current_risk_score > 35:
            trigger_conditions.append({
                "condition": "Risk Score < 35",
                "current_value": current_risk_score,
                "target_value": 35,
                "gap": max(0, current_risk_score - 35),
                "status": "not_met" if current_risk_score >= 35 else "met"
            })
        bt_macd = backtest.get("macd", 0)
        if bt_macd is not None and bt_macd <= 0:
            trigger_conditions.append({
                "condition": "MACD crossover positive",
                "current_value": round(bt_macd, 3),
                "target_value": 0.1,
                "gap": max(0, 0.1 - bt_macd),
                "status": "not_met"
            })

    for t in trigger_conditions:
        t["condition_zh"] = _translate_condition(t.get("condition", ""))

    _plan_action_zh = {
        "Re-check next trading day": "下个交易日复检",
        "Monitor MACD crossover closely": "密切关注 MACD 交叉",
        "Monitor MACD divergence": "关注 MACD 背离",
        "Watch volatility expansion": "关注波动率扩张",
        "Re-run news sentiment if major macro event appears": "若出现重大宏观事件，重新运行新闻情绪分析",
        "Wait for trigger condition fulfillment before entry": "等待触发条件满足后再进场",
    }

    # Next plan
    next_plan = []
    for p in plan:
        if isinstance(p, dict):
            next_plan.append(p)
    if not next_plan:
        next_plan.append({"action": "Re-check next trading day", "priority": "high"})

    for p in next_plan:
        p["action_zh"] = _plan_action_zh.get(p.get("action", ""), p.get("action", ""))

    # Bilingual why_not title and reasons
    why_not_title_map = {
        "Why not Sell?": {"en": "Why not Sell?", "zh": "为什么不卖出？"},
        "Why not Buy?": {"en": "Why not Buy?", "zh": "为什么不买入？"},
    }
    why_not_title_obj = why_not_title_map.get(why_not["title"], {"en": why_not["title"], "zh": why_not["title"]})
    why_not["title"] = why_not_title_obj

    _why_not_reason_zh = {
        "RSI is not oversold — no deep-value entry signal": "RSI 未超卖，没有深度价值入场信号",
        "MACD is negative — momentum does not support entry": "MACD 为负，动能不支持入场",
        "Risk gate blocks aggressive entry": "风险闸门阻止激进入场",
        "Historical max drawdown exceeds -20% — caution warranted": "历史最大回撤超过 -20%，需谨慎",
        "RSI is not overbought — no momentum exhaustion signal": "RSI 未超买，没有动能衰竭信号",
        "MACD is positive — upward momentum intact": "MACD 为正，上升动能完整",
        "Backtest Sharpe and return are favorable — selling may forego gains": "回测夏普与收益良好，卖出可能错失收益",
        "当前方向不支持卖出": "Current direction does not support selling",
        "当前方向不支持买入": "Current direction does not support buying",
        "买入信号不足": "Insufficient buy signals",
        "卖出信号不足": "Insufficient sell signals",
    }
    def _bilingual_why_not_reason(text):
        if isinstance(text, dict):
            return text
        mapped = _why_not_reason_zh.get(text, text)
        # If original is Chinese, mapped is the English translation (or itself if unknown)
        if any('一' <= c <= '鿿' for c in text):
            return {"en": mapped, "zh": text}
        return {"en": text, "zh": mapped}

    why_not["reasons"] = [_bilingual_why_not_reason(r) for r in why_not["reasons"]]

    summary_en = f"{dec_str.upper()} · {mode_label_en}"
    summary_zh = f"{dec_str.upper()} · {mode_label_zh}"

    return {
        "room_id": "schedule",
        "room_name": "决策调度台",
        "status": "done",
        "type": "decision",
        "panel_type": "decision_dashboard",
        "primary": {"label": "Decision", "label_zh": "决策", "value": dec_str.upper(), "unit": "", "level": dec_level},
        "summary": {"en": summary_en, "zh": summary_zh},
        "insight": insight,
        "impact_on_decision": impact_on_decision,
        "next_action": next_action,
        "monitor_focus": monitor_focus,
        "metrics": metrics,
        "visual": {
            "kind": "decision_dashboard",
            "data": {
                "decision_panel": decision_panel,
                "input_summary": input_summary,
                "final_strategy": final_strategy,
                "mode_reason": mode_reason,
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
            "input_summary": input_summary,
            "final_strategy": final_strategy,
            "mode_reason": mode_reason,
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


def _build_document_artifact(
    now_ts,
    ticker,
    schedule_artifact,
    memory,
    risk,
    backtest,
    current_strategy_detail,
    knowledge_base,
):
    """Build the Report & Analysis room artifact.

    First returns a deterministic fallback with llm_status='pending', then spawns
    a background thread that calls the shared LLM client and updates the telemetry
    file when the LLM result is ready.
    """
    decision_panel = schedule_artifact.get("details", {}).get("decision_panel", {})
    input_summary = schedule_artifact.get("details", {}).get("input_summary", {})
    final_strategy = schedule_artifact.get("details", {}).get("final_strategy", {})
    mode_reason = schedule_artifact.get("details", {}).get("mode_reason", {})

    dec = decision_panel.get("decision", "hold")
    dec_level = "positive" if dec == "buy" else "danger" if dec == "sell" else "neutral"
    dec_upper = dec.upper()

    strategy_name = final_strategy.get("name") or current_strategy_detail.get("name", "?")
    strategy_name_zh = final_strategy.get("name_zh") or current_strategy_detail.get("name_zh", strategy_name)
    signal = final_strategy.get("signal") or current_strategy_detail.get("signal", "HOLD")
    score = final_strategy.get("score") or current_strategy_detail.get("score", 50)

    risk_summary = input_summary.get("risk", {}) or risk
    backtest_summary = input_summary.get("backtest", {}) or backtest
    market_summary = input_summary.get("market", {}) or {}
    indicator_summary = input_summary.get("indicator", {}) or {}

    risk_gate = risk_summary.get("gate_label", risk_summary.get("gate_status", "pass"))
    if isinstance(risk_gate, dict):
        risk_gate_en = risk_gate.get("en", "pass")
        risk_gate_zh = risk_gate.get("zh", "可放行")
    else:
        risk_gate_en = risk_gate
        risk_gate_zh = risk_gate

    validation = backtest_summary.get("validation_label", backtest_summary.get("validation", "Pass"))
    if isinstance(validation, dict):
        validation_en = validation.get("en", "Pass")
        validation_zh = validation.get("zh", "通过")
    else:
        validation_en = validation
        validation_zh = validation

    total_return_pct = backtest_summary.get("total_return_pct", round((backtest.get("total_return") or 0) * 100, 1))
    sharpe = backtest_summary.get("sharpe", backtest.get("sharpe_ratio", 0))
    max_dd_pct = backtest_summary.get("max_drawdown_pct", abs(backtest.get("max_drawdown", 0)) * 100)
    risk_score = risk_summary.get("risk_score", risk.get("risk_score", 40))
    position_limit_pct = risk_summary.get("position_limit_pct", round((risk.get("position_pct") or 0.35) * 100))

    news_sentiment = market_summary.get("news_sentiment", "neutral")
    news_score = market_summary.get("news_score", 50)

    trend = indicator_summary.get("trend", {"en": "Uptrend", "zh": "上升趋势"})
    rsi_state = indicator_summary.get("rsi_state", {"en": "Neutral", "zh": "中性"})
    macd_signal = indicator_summary.get("macd_signal", "Weak")
    ret_20d_pct = indicator_summary.get("return_20d_pct", 0)
    vol_20d_pct = indicator_summary.get("volatility_20d_pct", 0)

    # Bilingual display values for fallback report
    _decision_zh_map = {"BUY": "买入", "SELL": "卖出", "HOLD": "观望"}
    _decision_zh = _decision_zh_map.get(dec_upper, dec_upper)
    _signal_zh = _decision_zh_map.get(signal, signal)
    _macd_signal_zh = indicator_summary.get("macd_signal_zh", {"Weak": "偏弱", "Strong": "偏强"}.get(macd_signal, macd_signal))
    _news_sentiment_zh = market_summary.get("news_sentiment_zh", {"positive": "正面", "negative": "负面", "neutral": "中性"}.get(news_sentiment, news_sentiment))

    references = []
    for kb in knowledge_base:
        if kb.get("adopted") and kb.get("paper"):
            references.append({
                "paper": kb.get("paper", ""),
                "paper_url": kb.get("paper_url", ""),
                "why_zh": f"策略库：{kb.get('name_zh', kb.get('name', ''))}",
                "why_en": f"Strategy knowledge: {kb.get('name', '')}",
            })

    # ── Deterministic fallback content (strategy C) ──
    fallback_report = {
        "executive_summary": {
            "zh": f"对 {ticker} 的最终决策为 {_decision_zh}。{strategy_name_zh} 策略发出 {_signal_zh} 信号，风险闸门为 {risk_gate_zh}，回测验证为 {validation_zh}。",
            "en": f"Final decision for {ticker} is {dec_upper}. The {strategy_name} strategy signals {signal}, risk gate is {risk_gate_en}, and backtest validation is {validation_en}.",
        },
        "suggested_action": {
            "zh": f"按 {position_limit_pct}% 仓位上限执行 {_decision_zh} 动作，并持续监控风险分数与新闻情绪。",
            "en": f"Execute {dec_upper} within the {position_limit_pct}% position limit and continue monitoring risk score and news sentiment.",
        },
        "key_drivers": [
            {"zh": f"策略信号：{_signal_zh}（评分 {score}）", "en": f"Strategy signal: {signal} (score {score})"},
            {"zh": f"风险闸门：{risk_gate_zh}（风险分 {risk_score}）", "en": f"Risk gate: {risk_gate_en} (risk score {risk_score})"},
            {"zh": f"回测验证：{validation_zh}（收益 {total_return_pct}% / 夏普 {sharpe}）", "en": f"Backtest: {validation_en} (return {total_return_pct}% / Sharpe {sharpe})"},
        ],
        "key_risks": [
            {"zh": f"20日波动率 {vol_20d_pct}%", "en": f"20D volatility {vol_20d_pct}%"},
            {"zh": f"MACD 信号 {_macd_signal_zh}", "en": f"MACD signal {macd_signal}"},
            {"zh": f"新闻情绪 {_news_sentiment_zh}（评分 {news_score}）", "en": f"News sentiment {news_sentiment} (score {news_score})"},
        ],
        "references": references[:3] if references else [
            {
                "paper": "Edwards & Magee (1948)",
                "paper_url": "https://archive.org/details/technicalanalysi00edwa",
                "why_zh": "经典趋势跟踪方法",
                "why_en": "Classic trend-following methodology",
            }
        ],
    }

    # Traceability: link report back to the rooms that produced its inputs
    traceability = {
        "decision_room": "schedule",
        "backtest_room": "task_queues",
        "risk_room": "alarm",
        "strategy_room": "skills",
        "decision_ref": {
            "decision": dec_upper,
            "confidence": decision_panel.get("confidence", 0.62),
            "position_pct": decision_panel.get("position_pct", 0),
            "mode": decision_panel.get("decision_mode", "proceed"),
        },
        "backtest_ref": {
            "total_return_pct": total_return_pct,
            "sharpe": sharpe,
            "max_drawdown_pct": max_dd_pct,
            "validation": validation_en,
        },
        "risk_ref": {
            "risk_score": risk_score,
            "gate_status": risk_gate_en,
            "position_limit_pct": position_limit_pct,
        },
        "strategy_ref": {
            "name": strategy_name,
            "name_zh": strategy_name_zh,
            "signal": signal,
            "score": score,
        },
    }

    llm_note = {
        "zh": "AI 报告正在后台生成，当前显示规则模板。",
        "en": "AI report is being generated in the background; showing rule-based template.",
    }

    def _update_telemetry_with_llm(llm_result: dict) -> None:
        """Read telemetry JSON, replace document artifact, write back."""
        try:
            path = os.path.abspath(TELEMETRY_PATH)
            if not os.path.exists(path):
                return
            with open(path, "r", encoding="utf-8") as f:
                snap = json.load(f)
            artifacts = snap.get("trading", {}).get("room_artifacts", {})
            if "document" not in artifacts:
                return
            doc = artifacts["document"]

            status = llm_result.get("_llm_status", "ready")
            note = llm_result.get("_llm_note", {
                "zh": "本报告由 AI 生成。" if status == "ready" else "未启用 LLM，显示规则模板。",
                "en": "This report was generated by AI." if status == "ready" else "LLM not enabled; showing rule-based template.",
            })

            # Preserve structure, overwrite content fields
            doc["insight"] = llm_result.get("executive_summary", doc.get("insight"))
            doc["impact_on_decision"] = {
                "zh": f"{'AI 生成' if status == 'ready' else '规则模板'}：{llm_result.get('executive_summary', {}).get('zh', '')}",
                "en": f"{'AI generated' if status == 'ready' else 'Rule template'}: {llm_result.get('executive_summary', {}).get('en', '')}",
            }
            doc["next_action"] = llm_result.get("suggested_action", doc.get("next_action"))
            doc["visual"]["data"]["executive_summary"] = llm_result.get("executive_summary", {})
            doc["visual"]["data"]["suggested_action"] = llm_result.get("suggested_action", {})
            doc["visual"]["data"]["key_drivers"] = llm_result.get("key_drivers", [])
            doc["visual"]["data"]["key_risks"] = llm_result.get("key_risks", [])
            doc["visual"]["data"]["references"] = llm_result.get("references", [])
            doc["visual"]["data"]["llm_status"] = status
            doc["visual"]["data"]["llm_note"] = note
            doc["details"]["executive_summary"] = llm_result.get("executive_summary", {})
            doc["details"]["suggested_action"] = llm_result.get("suggested_action", {})
            doc["details"]["key_drivers"] = llm_result.get("key_drivers", [])
            doc["details"]["key_risks"] = llm_result.get("key_risks", [])
            doc["details"]["references"] = llm_result.get("references", [])
            doc["details"]["llm_status"] = status
            doc["details"]["llm_note"] = note
            doc["updated_at"] = str(datetime.now())[:19]

            with open(path, "w", encoding="utf-8") as f:
                json.dump(snap, f, ensure_ascii=False, indent=2)
        except Exception:
            # Fail silently: frontend keeps showing fallback
            pass

    def _set_llm_timeout() -> None:
        """If LLM is still pending after 30s, mark as timeout and show fallback note."""
        try:
            path = os.path.abspath(TELEMETRY_PATH)
            if not os.path.exists(path):
                return
            with open(path, "r", encoding="utf-8") as f:
                snap = json.load(f)
            artifacts = snap.get("trading", {}).get("room_artifacts", {})
            if "document" not in artifacts:
                return
            doc = artifacts["document"]
            if doc.get("visual", {}).get("data", {}).get("llm_status") != "pending":
                return
            timeout_note = {
                "zh": "AI 报告生成超时，当前显示规则模板。",
                "en": "AI report generation timed out; showing rule-based template.",
            }
            doc["visual"]["data"]["llm_status"] = "timeout"
            doc["visual"]["data"]["llm_note"] = timeout_note
            doc["details"]["llm_status"] = "timeout"
            doc["details"]["llm_note"] = timeout_note
            doc["monitor_focus"] = [
                {"en": "AI report timed out — review rule-based summary", "zh": "AI 报告超时，请查看规则模板摘要"},
            ]
            doc["updated_at"] = str(datetime.now())[:19]
            with open(path, "w", encoding="utf-8") as f:
                json.dump(snap, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def _fetch_llm_report() -> None:
        """Background fetch: call shared LLM client and update telemetry."""
        timer = threading.Timer(30.0, _set_llm_timeout)
        timer.start()
        try:
            # Ensure trading_agent is importable from background thread
            agent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "trading_agent"))
            if agent_dir not in sys.path:
                sys.path.insert(0, agent_dir)
            from trading_agent.tools.report_llm import run_llm_report_writer

            context = {
                "ticker": ticker,
                "decision": dec_upper,
                "decision_score": decision_panel.get("decision_score", 50),
                "confidence": decision_panel.get("confidence", 0.62),
                "position_pct": decision_panel.get("position_pct", 0),
                "strategy_name": strategy_name,
                "strategy_name_zh": strategy_name_zh,
                "signal": signal,
                "score": score,
                "risk_gate_status": risk_gate_en,
                "risk_gate_status_zh": risk_gate_zh,
                "risk_score": risk_score,
                "position_limit_pct": position_limit_pct,
                "validation": validation_en,
                "validation_zh": validation_zh,
                "total_return_pct": total_return_pct,
                "sharpe": sharpe,
                "max_drawdown_pct": max_dd_pct,
                "trend": trend.get("en", ""),
                "trend_zh": trend.get("zh", ""),
                "rsi_state": rsi_state.get("en", ""),
                "rsi_state_zh": rsi_state.get("zh", ""),
                "macd_signal": macd_signal,
                "return_20d_pct": ret_20d_pct,
                "volatility_20d_pct": vol_20d_pct,
                "news_sentiment": news_sentiment,
                "news_score": news_score,
                "references": references[:5] if references else [],
            }

            llm_result = run_llm_report_writer(context)
            _update_telemetry_with_llm(llm_result)
        except Exception:
            pass
        finally:
            timer.cancel()

    # Spawn background thread so the main pipeline is not blocked
    threading.Thread(target=_fetch_llm_report, daemon=True).start()

    return {
        "room_id": "document",
        "room_name": "报告与分析室",
        "status": "done",
        "type": "report",
        "panel_type": "report_summary",
        "primary": {"label": "Decision", "label_zh": "决策", "value": dec_upper, "unit": "", "level": dec_level},
        "summary": fallback_report["executive_summary"],
        "insight": fallback_report["executive_summary"],
        "impact_on_decision": {
            "zh": f"规则模板：{fallback_report['executive_summary']['zh']}",
            "en": f"Rule template: {fallback_report['executive_summary']['en']}",
        },
        "next_action": fallback_report["suggested_action"],
        "monitor_focus": [
            {"en": "Wait for AI report generation", "zh": "等待 AI 报告生成"},
        ],
        "metrics": [
            _lv("Decision", dec_upper, "", "决策"),
            _lv("Strategy", strategy_name, "", strategy_name_zh),
            _lv("Signal", signal, "", "信号"),
            _lv("Confidence", _v(decision_panel.get("confidence", 0.62) * 100, ".0f") + "%", "", "置信度"),
            _lv("Position", str(decision_panel.get("position_pct", 0)) + "%", "", "仓位"),
        ],
        "visual": {
            "kind": "report_summary",
            "data": {
                "final_decision": dec_upper,
                "suggested_action": fallback_report["suggested_action"],
                "executive_summary": fallback_report["executive_summary"],
                "key_drivers": fallback_report["key_drivers"],
                "key_risks": fallback_report["key_risks"],
                "references": fallback_report["references"],
                "llm_status": "pending",
                "llm_note": llm_note,
                "traceability": traceability,
            }
        },
        "details": {
            "input": ["Decision Desk", "Strategy Memory", "Risk Alert", "Backtest Lab"],
            "output": ["Final Report", "Executive Summary", "Key Drivers", "Key Risks", "References"],
            "reasoning": [fallback_report["executive_summary"]],
            "final_decision": dec_upper,
            "suggested_action": fallback_report["suggested_action"],
            "executive_summary": fallback_report["executive_summary"],
            "key_drivers": fallback_report["key_drivers"],
            "key_risks": fallback_report["key_risks"],
            "references": fallback_report["references"],
            "llm_status": "pending",
            "llm_note": llm_note,
            "traceability": traceability,
        },
        "traceability": traceability,
        "updated_at": now_ts,
    }


import sys


def _build_mcp_artifact(now_ts, rsi_val, macd_val, ma20_val, ma60_val, vol_20d, ret_20d):
    """Build the Indicator Lab (mcp) artifact with bilingual labels."""
    rsi_extreme = rsi_val is not None and (rsi_val > 70 or rsi_val < 30)
    rsi_neutral = rsi_val is not None and 30 < rsi_val < 70

    if ma20_val is not None and ma60_val is not None:
        ma_gap_ratio = abs(ma20_val - ma60_val) / max(ma60_val, 1)
        if ma_gap_ratio < 0.05:
            trend_en, trend_zh = "Range-bound", "震荡盘整"
        elif ma20_val > ma60_val:
            trend_en, trend_zh = "Uptrend", "上升趋势"
        else:
            trend_en, trend_zh = "Downtrend", "下降趋势"
    else:
        trend_en, trend_zh = "Unknown", "未知"

    macd_weak = (macd_val or 0) <= 0.2
    macd_state_en = "Weak Momentum" if macd_weak else "Strong Momentum"
    macd_state_zh = "动能偏弱" if macd_weak else "动能偏强"

    vol_high = (vol_20d or 0) >= 0.25
    vol_state_en = "High" if vol_high else "Medium"
    vol_state_zh = "波动较高" if vol_high else "波动中等"

    ret_positive = (ret_20d or 0) > 0
    ret_state_en = "Positive" if ret_positive else "Negative"
    ret_state_zh = "收益为正" if ret_positive else "收益为负"

    if rsi_neutral:
        insight = {
            "en": "Indicators calculated. RSI remains neutral, MACD momentum is moderate.",
            "zh": "指标计算完成，RSI 未进入超买或超卖区间，MACD 动能中性。",
        }
    elif rsi_extreme:
        insight = {
            "en": "RSI is in an extreme zone; proceed with caution.",
            "zh": "RSI 处于极端区间，需谨慎。",
        }
    else:
        insight = {
            "en": "Indicator calculation complete.",
            "zh": "指标计算完成。",
        }

    summary_en = f'RSI {_v(rsi_val, ".1f")} · MACD {_v(macd_val, ".3f")} · Vol {_v((vol_20d or 0) * 100, ".1f")}%'
    summary_zh = f'RSI {_v(rsi_val, ".1f")} · MACD {_v(macd_val, ".3f")} · 波动率 {_v((vol_20d or 0) * 100, ".1f")}%'

    return {
        "room_id": "mcp",
        "room_name": "指标实验室",
        "status": "done",
        "type": "indicator",
        "panel_type": "indicator_dashboard",
        "primary": {
            "label": "RSI",
            "label_zh": "RSI",
            "value": _v(rsi_val, ".1f"),
            "unit": "",
            "level": "warning" if rsi_extreme else "neutral",
        },
        "summary": {"en": summary_en, "zh": summary_zh},
        "insight": insight,
        "impact_on_decision": {
            "en": "Technical indicators are neutral-to-mildly-bullish, but MACD momentum is insufficient for aggressive buying.",
            "zh": "技术指标中性偏强，但 MACD 动能不足，因此不支持激进买入。",
        },
        "next_action": {
            "en": "Wait for MACD momentum to strengthen further.",
            "zh": "等待 MACD 进一步转强。",
        },
        "monitor_focus": [
            {"en": "RSI stabilizes in the 50-65 range", "zh": "RSI 进入 50-65 稳定区间"},
            {"en": "MACD histogram turns positive consecutively", "zh": "MACD 连续转强"},
            {"en": "20D volatility falls below the medium level", "zh": "20日波动率下降至中等以下"},
        ],
        "metrics": [
            _metric_badge("Trend", trend_en, "neutral", label_zh=trend_zh),
            _metric_number("RSI", _v(rsi_val, ".1f"), "", "warning" if rsi_extreme else "neutral", label_zh="RSI"),
            _metric_number("MACD", _v(macd_val, ".3f"), label_zh="MACD"),
            _metric_number("MA20", _v(ma20_val, ".1f"), label_zh="MA20"),
            _metric_number("MA60", _v(ma60_val, ".1f"), label_zh="MA60"),
            _metric_bar("20D Return", round((ret_20d or 0) * 100, 1), "%", "positive" if ret_positive else "danger", label_zh="20日收益"),
        ],
        "visual": {
            "kind": "indicator_cards",
            "data": {
                "cards": [
                    {
                        "label": "RSI",
                        "label_zh": "RSI",
                        "value": _v(rsi_val, ".1f"),
                        "state": "Neutral" if rsi_neutral else "Extreme",
                        "state_zh": "中性" if rsi_neutral else "极端",
                        "level": "neutral" if rsi_neutral else "warning",
                    },
                    {
                        "label": "MACD",
                        "label_zh": "MACD",
                        "value": _v(macd_val, ".3f"),
                        "state": macd_state_en,
                        "state_zh": macd_state_zh,
                        "level": "neutral" if macd_weak else "positive",
                    },
                    {
                        "label": "Volatility",
                        "label_zh": "波动率",
                        "value": _v((vol_20d or 0) * 100, ".1f") + "%",
                        "state": vol_state_en,
                        "state_zh": vol_state_zh,
                        "level": "warning" if vol_high else "neutral",
                    },
                    {
                        "label": "Return 20D",
                        "label_zh": "20日收益",
                        "value": _v((ret_20d or 0) * 100, ".1f") + "%",
                        "state": ret_state_en,
                        "state_zh": ret_state_zh,
                        "level": "positive" if ret_positive else "danger",
                    },
                ]
            }
        },
        "details": {
            "input": ["close", "volume", "returns"],
            "output": ["RSI", "MACD", "MA20", "MA60", "Volatility"],
            "reasoning": [insight],
        },
        "updated_at": now_ts,
    }


def _build_images_artifact(now_ts, ticker, indicator, backtest, decision, current_strategy_detail, price_series=None):
    """Build the Chart Analysis Room (images) artifact from real indicator/backtest data."""
    rsi_val = indicator.get("rsi")
    macd_val = indicator.get("macd")
    ma20_val = indicator.get("ma20")
    ma60_val = indicator.get("ma60")
    close_val = indicator.get("close")
    vol_20d = indicator.get("volatility_20d")
    ret_20d = indicator.get("return_20d")
    rows_val = indicator.get("rows")

    total_ret = (backtest.get("total_return") or 0) * 100
    sharpe = backtest.get("sharpe_ratio", 0)
    dd_pct = abs(backtest.get("max_drawdown", 0)) * 100
    win_rate = (backtest.get("win_rate") or 0) * 100
    trades = backtest.get("trades") or backtest.get("number_of_trades", 0)

    dec_str = decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)
    signal = current_strategy_detail.get("signal", dec_str.upper())
    strategy_name_en = current_strategy_detail.get("name", "current_strategy")
    strategy_name_zh = current_strategy_detail.get("name_zh") or {
        "ma": "均线交叉",
        "rsi": "RSI 动量",
        "momentum": "20日动量",
        "auto": "自动选择",
    }.get(strategy_name_en, strategy_name_en)
    strategy_score = current_strategy_detail.get("score")
    strategy_reasoning = current_strategy_detail.get("reasoning", "")

    # Trend state derived from MA relationship
    has_ma = ma20_val is not None and ma60_val is not None and ma60_val != 0
    if has_ma:
        ma_diff_pct = (ma20_val - ma60_val) / abs(ma60_val) * 100
        if abs(ma_diff_pct) < 1.0:
            trend = "盘整"
            trend_level = "neutral"
        elif ma20_val > ma60_val:
            trend = "多头排列"
            trend_level = "positive"
        else:
            trend = "空头排列"
            trend_level = "danger"
    else:
        trend = "暂无数据"
        trend_level = "neutral"

    # RSI state
    if rsi_val is None:
        rsi_state = "暂无数据"
        rsi_level = "neutral"
    elif rsi_val > 70:
        rsi_state = "超买"
        rsi_level = "danger"
    elif rsi_val < 30:
        rsi_state = "超卖"
        rsi_level = "positive"
    else:
        rsi_state = "中性"
        rsi_level = "neutral"

    # MACD state
    if macd_val is None:
        macd_state = "暂无数据"
        macd_level = "neutral"
    elif macd_val > 0.2:
        macd_state = "偏多"
        macd_level = "positive"
    elif macd_val < -0.2:
        macd_state = "偏空"
        macd_level = "danger"
    else:
        macd_state = "中性"
        macd_level = "neutral"

    # Signal level
    signal_level = "positive" if str(signal).upper() == "BUY" else "danger" if str(signal).upper() == "SELL" else "warning"
    strategy_reasoning_en = (
        f"MA20/MA60 trend is {trend_level}; RSI is {rsi_level}; MACD is {macd_level}. "
        f"The current strategy signal is {str(signal).upper()} with score "
        f"{_v(strategy_score, '.0f') if strategy_score is not None else 'N/A'}."
    )

    # Build metrics in Chinese; use "暂无数据" when source value is missing
    metrics = [
        _metric_number("最新收盘", _v(close_val, ".2f"), ""),
        _metric_badge("均线状态", trend, trend_level),
        _metric_badge("RSI 状态", rsi_state, rsi_level),
        _metric_badge("MACD 状态", macd_state, macd_level),
        _metric_number("20日收益", _v((ret_20d or 0) * 100, ".1f"), "%", "positive" if (ret_20d or 0) > 0 else "danger"),
        _metric_number("20日波动", _v((vol_20d or 0) * 100, ".1f"), "%", "neutral"),
        _metric_badge("策略信号", signal, signal_level),
        _metric_number("策略评分", _v(strategy_score, ".0f") if strategy_score is not None else "暂无数据", "", signal_level),
        _metric_bar("回测收益", round(total_ret, 1), "%", "positive" if total_ret > 0 else "danger"),
        _metric_number("夏普比率", _v(sharpe, ".2f"), ""),
        _metric_number("最大回撤", _v(dd_pct, ".1f"), "%", "danger"),
        _metric_number("胜率", _v(win_rate, ".0f"), "%", "neutral"),
        _metric_number("交易次数", trades if trades else "暂无数据", ""),
    ]

    # Use real price series if provided, otherwise keep summary-only mode
    if price_series and price_series.get("close"):
        dates = price_series.get("dates", [])
        close_series = price_series.get("close", [])
        ma20_series = price_series.get("ma20", [])
        ma60_series = price_series.get("ma60", [])
        date_range = f"{dates[0]} ~ {dates[-1]}" if dates else ""
        has_price_data = True
    else:
        dates = []
        close_series = []
        ma20_series = []
        ma60_series = []
        date_range = ""
        has_price_data = False

    # Visual summary for the chart room
    visual = {
        "kind": "chart_dashboard",
        "data": {
            "ticker": ticker,
            "rows": rows_val,
            "has_price_data": has_price_data,
            "dates": dates,
            "close": close_series,
            "ma20": ma20_series,
            "ma60": ma60_series,
            "price_summary": {
                "latest_close": close_val,
                "ma20": ma20_val,
                "ma60": ma60_val,
                "trend": trend,
                "change_pct_20d": ret_20d,
            },
            "indicator_summary": {
                "rsi": rsi_val,
                "rsi_state": rsi_state,
                "macd": macd_val,
                "macd_state": macd_state,
                "volatility_20d": vol_20d,
            },
            "strategy_signal": {
                "name": strategy_name_zh,
                "name_zh": strategy_name_zh,
                "name_en": strategy_name_en,
                "signal": signal,
                "score": strategy_score,
                "reasoning": strategy_reasoning,
                "reasoning_en": strategy_reasoning_en,
            },
            "backtest_summary": {
                "total_return": total_ret,
                "sharpe": sharpe,
                "max_drawdown": dd_pct,
                "win_rate": win_rate,
                "trades": trades,
            },
            "sparkline": close_series,
            "date_range": date_range,
        }
    }

    # Summary/insight driven by real data
    summary_parts = []
    if close_val is not None:
        summary_parts.append(f"最新收盘 {_v(close_val, '.2f')}")
    if trend != "暂无数据":
        summary_parts.append(trend)
    if signal:
        summary_parts.append(f"信号 {signal}")
    summary = " · ".join(summary_parts) if summary_parts else "暂无图表数据"

    if close_val is None:
        insight = "行情数据未就绪，图表分析室暂无有效价格序列。"
        impact = "缺少价格输入，无法为决策提供图形化依据。"
        next_action = "等待市场数据室完成数据接入后重新运行。"
        monitor_focus = ["价格序列是否加载", "指标计算是否完成", "回测结果是否生成"]
    else:
        insight = f"当前 {ticker} 最新收盘 {_v(close_val, '.2f')}，{trend}，RSI {rsi_state}，MACD {macd_state}，策略信号为 {signal}。"
        impact = "图表摘要为决策调度室提供可视化依据，但最终仓位仍需结合风险报警室综合判断。"
        next_action = "持续观察价格与均线的偏离程度，以及回测夏普比率是否稳定。"
        monitor_focus = ["MA20/MA60 交叉", "RSI 是否进入极值区间", "MACD 方向变化", "夏普比率是否低于 1.0"]

    return {
        "room_id": "images",
        "room_name": "图表分析室",
        "status": "done",
        "type": "chart",
        "panel_type": "chart_panel",
        "primary": {
            "label": "图表摘要",
            "value": _v(close_val, ".2f") if close_val is not None else "暂无数据",
            "unit": "" if close_val is not None else "",
            "level": trend_level,
        },
        "summary": summary,
        "insight": insight,
        "impact_on_decision": impact,
        "next_action": next_action,
        "monitor_focus": monitor_focus,
        "metrics": metrics,
        "visual": visual,
        "details": {
            "input": [ticker, "OHLCV", "技术指标", "回测结果"],
            "output": ["价格走势摘要", "指标可视化摘要", "策略信号摘要", "回测表现摘要"],
            "reasoning": [strategy_reasoning] if strategy_reasoning else ["暂无策略推理"],
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
    decision_zh = {"BUY": "买入", "SELL": "卖出", "HOLD": "观望"}.get(dec_str.upper(), dec_str.upper())
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

    # Propagate alarm-computed risk gate values downstream for consistency
    position_limit_pct = round(position_pct * 100)
    if risk_score >= 70:
        gate_status = "blocked"
    elif risk_score >= 40:
        gate_status = "limited"
    else:
        gate_status = "pass"
    risk["gate_status"] = gate_status
    risk["position_limit_pct"] = position_limit_pct
    risk["risk_score"] = risk_score

    # Propagate backtest validation values downstream for consistency
    _bt_validation_status = "pass" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "caution" if total_ret > 0 and dd_pct < 25 else "fail"
    _bt_validation_en = "Pass" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "Caution" if total_ret > 0 and dd_pct < 25 else "Fail"
    _bt_validation_zh = "通过" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "谨慎通过" if total_ret > 0 and dd_pct < 25 else "不通过"
    backtest["validation"] = _bt_validation_status
    backtest["validation_label"] = {"en": _bt_validation_en, "zh": _bt_validation_zh}
    backtest["total_return_pct"] = round(total_ret, 1)
    backtest["sharpe"] = round(sharpe, 2)
    backtest["max_drawdown_pct"] = round(-dd_pct, 1)
    backtest["win_rate_pct"] = round(win_rate, 1)
    backtest["trades"] = trades

    # ── Build strategy visual data ──
    multi_factor_score = _compute_multi_factor_score(indicator)
    strategy_visual_data = []
    for sc in strategy_scores:
        base = sc.get("base_score", sc.get("score", 50))
        llm_adj = sc.get("llm_adjustment", 0)
        final = sc.get("final_score", base + llm_adj)
        # Blend multi-factor score as a weighted dimension (20% influence)
        blended_final = round(final * 0.8 + multi_factor_score * 0.2, 2)
        strategy_visual_data.append({
            "name": sc.get("name", "?"),
            "base_score": base,
            "llm_adjustment": llm_adj,
            "final_score": blended_final,
            "multi_factor_score": multi_factor_score,
        })

    strategy_name_zh = {"ma": "均线交叉", "rsi": "RSI 动量", "momentum": "20日动量", "auto": "自动选择"}.get(strategy_name, strategy_name)

    current_strategy_detail = _build_current_strategy_detail(
        strategy_name, strategy_scores, indicator, decision, llm_advice
    )

    # ── Build memory records ──
    history_records = _load_trading_history()
    history_records = [
        {
            "ticker": r.get("ticker", "?"),
            "strategy": r.get("strategy", "?"),
            "decision": r.get("decision", "HOLD").upper() if r.get("decision") else "HOLD",
            "return": r.get("return", "N/A"),
            "sharpe": r.get("sharpe", "N/A"),
            "date": r.get("completed_at", "")[:10] or r.get("date", ""),
        }
        for r in history_records
        if r.get("ticker")
    ]
    # Add current run record
    current_record = {
        "ticker": ticker,
        "strategy": strategy_name,
        "decision": dec_str.upper(),
        "return": _v(total_ret, ".1f") + "%",
        "sharpe": _v(sharpe, ".2f"),
        "date": now_ts[:10],
    }
    # Merge: dedupe by ticker+date, prefer current run
    seen = set()
    merged = []
    for r in history_records + [current_record]:
        key = f"{r['ticker']}:{r['date']}:{r['strategy']}"
        if key not in seen:
            seen.add(key)
            merged.append(r)
    memory_records = merged

    # Compute avg return / sharpe from records that have numeric values
    def _parse_num(v):
        if v is None or v == "N/A":
            return None
        try:
            return float(str(v).replace("%", ""))
        except Exception:
            return None

    valid_returns = [_parse_num(r.get("return")) for r in memory_records]
    valid_returns = [v for v in valid_returns if v is not None]
    avg_return = sum(valid_returns) / len(valid_returns) if valid_returns else total_ret

    valid_sharpes = [_parse_num(r.get("sharpe")) for r in memory_records]
    valid_sharpes = [v for v in valid_sharpes if v is not None]
    avg_sharpe = sum(valid_sharpes) / len(valid_sharpes) if valid_sharpes else sharpe

    memory_score = memory.get("memory_score", min(len(memory_records) * 5, 100))

    # ── RAG-style reflection over history + knowledge base ──
    reflection_result = _reflect_on_history_and_knowledge(
        memory_records, strategy_name, indicator, STRATEGY_KNOWLEDGE_BASE
    )

    # Pre-compute rankings for memory artifact
    valid_records_for_rank = [r for r in memory_records if _parse_num(r.get("return")) is not None]
    by_return = sorted(valid_records_for_rank, key=lambda r: _parse_num(r.get("return", 0)) or 0, reverse=True)
    by_sharpe = sorted(valid_records_for_rank, key=lambda r: _parse_num(r.get("sharpe", 0)) or 0, reverse=True)

    # ── Risk sources ──
    risk_sources = risk.get("sources", [])
    if not risk_sources:
        risk_sources = [
            {"label": "Max Drawdown", "value": round(-dd_pct, 1), "unit": "%", "impact": "high" if dd_pct > 20 else "medium"},
            {"label": "Volatility Percentile", "value": round((regime.get("volatility_percentile", 0.5) or 0) * 100), "unit": "%", "impact": "medium"},
        ]
    vol_percentile = round((regime.get("volatility_percentile", 0.5) or 0) * 100)
    position_limit_pct = round(position_pct * 100)
    if risk_score >= 70:
        gate_status = "blocked"
        gate_level = "danger"
        gate_label_zh = "禁止进场"
        gate_label_en = "Entry Blocked"
    elif risk_score >= 40:
        gate_status = "limited"
        gate_level = "warning"
        gate_label_zh = "限制仓位"
        gate_label_en = "Position Limited"
    else:
        gate_status = "pass"
        gate_level = "positive"
        gate_label_zh = "可放行"
        gate_label_en = "Cleared"
    risk_source_rows = [
        {
            "key": "max_drawdown",
            "label": "Max Drawdown",
            "label_zh": "最大回撤",
            "value": round(-dd_pct, 1),
            "unit": "%",
            "threshold": "< 15%",
            "status": "blocked" if dd_pct > 20 else "warn" if dd_pct > 15 else "pass",
            "impact": "限制仓位" if dd_pct > 15 else "正常",
        },
        {
            "key": "volatility_percentile",
            "label": "Volatility Percentile",
            "label_zh": "波动率分位",
            "value": vol_percentile,
            "unit": "%",
            "threshold": "< 60%",
            "status": "warn" if vol_percentile >= 60 else "pass",
            "impact": "提高复检频率" if vol_percentile >= 60 else "正常",
        },
        {
            "key": "position_limit",
            "label": "Position Limit",
            "label_zh": "仓位上限",
            "value": position_limit_pct,
            "unit": "%",
            "threshold": ">= 50%",
            "status": "warn" if position_limit_pct < 50 else "pass",
            "impact": "限制最终仓位" if position_limit_pct < 50 else "正常",
        },
    ]
    review_conditions = [
        {"label": "Risk Score < 35", "label_zh": "风险分数 < 35", "current": risk_score, "status": "pass" if risk_score < 35 else "wait"},
        {"label": "Max Drawdown < 15%", "label_zh": "最大回撤 < 15%", "current": round(dd_pct, 1), "status": "pass" if dd_pct < 15 else "wait"},
        {"label": "Volatility Percentile < 60%", "label_zh": "波动率分位 < 60%", "current": vol_percentile, "status": "pass" if vol_percentile < 60 else "wait"},
    ]

    raw_news = news.get("raw_news", []) if isinstance(news, dict) else []
    key_events = news.get("key_events", []) if isinstance(news, dict) else []
    risk_events = news.get("risk_events", []) if isinstance(news, dict) else []
    news_score = news.get("news_score") if isinstance(news, dict) else None
    news_sentiment = news.get("news_sentiment", "N/A") if isinstance(news, dict) else "N/A"
    news_confidence = news.get("news_confidence") if isinstance(news, dict) else None

    stage_timestamps = result.get("stage_timestamps", [])
    price_series = result.get("price_series", None)

    # ── Build agent status data ──
    agent_statuses = result.get("agent_statuses", [])
    if not agent_statuses:
        agent_statuses = _build_agent_statuses(
            now_ts, ticker, rows_val, rsi_val, macd_val, news_score, news_sentiment, risk_score, dec_str,
            stage_timestamps=stage_timestamps,
        )

    # ── Build execution events ──
    exec_events = result.get("execution_events", [])
    if not exec_events:
        exec_events = _build_exec_events(
            now_ts, ticker, rows_val, rsi_val, macd_val, news_score, news_sentiment, risk_score,
            gate_status, gate_label_en, gate_label_zh, backtest, dec_str, decision_zh, position_pct,
            stage_timestamps=stage_timestamps,
        )

    data_source = "Yahoo Finance / Stooq"
    date_range = f"{task.get('start_date', '?')} ~ {task.get('end_date', '?')}"
    rows_ready = bool(rows_val)
    latest_price_ready = close_val is not None
    news_ready = bool(raw_news or key_events or risk_events or news_score is not None)
    market_data = {
        "ticker": ticker,
        "date_range": date_range,
        "data_source": data_source,
        "rows": rows_val,
        "missing_values": 0 if rows_ready else None,
        "latest_close": close_val,
        "start_price": None,
        "end_price": close_val,
        "cache_status": "cache_or_remote",
        "coverage_pct": 100 if rows_ready else 0,
    }
    news_digest = {
        "score": news_score,
        "sentiment": news_sentiment,
        "confidence": news_confidence,
        "summary": news.get("summary", "") if isinstance(news, dict) else "",
        "key_events": key_events,
        "risk_events": risk_events,
        "raw_news": raw_news,
        "ranked_news": _rank_news_items(raw_news, key_events, risk_events, news_score or 50, news_confidence or 0.5),
    }
    quality_checks = [
        {"label": "Market rows", "status": "pass" if rows_ready else "missing", "detail": f"{rows_val} rows" if rows_ready else "No data"},
        {"label": "Latest close", "status": "pass" if latest_price_ready else "missing", "detail": _v(close_val, ".2f") if latest_price_ready else "No data"},
        {"label": "News input", "status": "pass" if news_ready else "missing", "detail": f"{len(raw_news)} articles" if raw_news else "No news data"},
        {"label": "Next-step readiness", "status": "pass" if rows_ready and latest_price_ready else "missing", "detail": "Ready for indicators, strategy, and backtest" if rows_ready and latest_price_ready else "Market data insufficient"},
    ]

    return {
        "gateway": {
            "room_id": "gateway",
            "room_name": "市场数据室",
            "status": "done",
            "type": "data",
            "panel_type": "data_health",
            "market_data": market_data,
            "news_digest": news_digest,
            "quality_checks": quality_checks,
            "primary": {"label": "数据条数", "value": _v(rows_val, ".0f") if rows_val else "N/A", "unit": "bars", "level": "positive"},
            "summary": f'{_v(rows_val, ".0f")} bars · Missing 0' if rows_val else "Data loaded",
            "insight": "行情数据完整，无明显缺失，可支持后续分析。",
            "impact_on_decision": "数据完整，因此允许进入指标、回测和新闻综合决策阶段。",
            "next_action": "继续执行指标计算。",
            "monitor_focus": ["缺失值", "时间区间", "最新价格异常"],
            "metrics": [
                _metric_number("样本量", _v(rows_val, ".0f") if rows_val else 0, "bars", "positive"),
                _metric_number("缺失值", 0, "", "positive"),
                _metric_number("最新收盘", _v(close_val, ".2f") if close_val else "N/A"),
                _metric_bar("覆盖率", 100, "%", "positive"),
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

        "mcp": _build_mcp_artifact(
            now_ts, rsi_val, macd_val, ma20_val, ma60_val, vol_20d, ret_20d
        ),

        "images": _build_images_artifact(
            now_ts, ticker, indicator, backtest, decision, current_strategy_detail, price_series=price_series
        ),

        "skills": {
            "room_id": "skills",
            "room_name": "策略实验室",
            "status": "done",
            "type": "strategy",
            "panel_type": "strategy_ranking",
            "primary": {
                "label": "当前策略",
                "value": strategy_name_zh,
                "unit": str(current_strategy_detail["score"]),
                "level": "positive" if current_strategy_detail["signal"] == "BUY" else "danger" if current_strategy_detail["signal"] == "SELL" else "warning",
            },
            "summary": f'{strategy_name_zh} · 信号 {current_strategy_detail["signal"]} · 评分 {current_strategy_detail["score"]} · 多因子 {multi_factor_score}',
            "insight": current_strategy_detail["reasoning"],
            "impact_on_decision": "Momentum 原始得分较高，但 LLM 因趋势确认不足降低其权重。" if any(s.get("llm_adjustment", 0) < 0 for s in strategy_scores) else "策略得分分布均匀，优势不明显，最终保持谨慎。",
            "next_action": "继续观察 Top 策略是否获得趋势确认。",
            "monitor_focus": ["当前策略信号", "策略评分", "多因子评分", "趋势匹配度"],
            "metrics": [
                _metric_badge("信号", current_strategy_detail["signal"], "positive" if current_strategy_detail["signal"] == "BUY" else "danger" if current_strategy_detail["signal"] == "SELL" else "neutral"),
                _metric_number("策略评分", current_strategy_detail["score"], "pts"),
                _metric_number("多因子评分", multi_factor_score, "pts"),
                _metric_badge("策略", {"ma": "均线交叉", "rsi": "RSI 动量", "momentum": "20日动量"}.get(current_strategy_detail["name"], current_strategy_detail["name"]), "neutral"),
                *[{"label": {"ma": "均线交叉", "rsi": "RSI 动量", "momentum": "20日动量"}.get(sc.get("name", "?"), sc.get("name", "?")), "value": sc.get("score", 0), "display": "strategy_score", "signal": "buy" if sc.get("return", 0) > 5 else "sell" if sc.get("return", 0) < -5 else "hold", "unit": "score"} for sc in strategy_scores],
            ],
            "visual": {
                "kind": "strategy_lab",
                "data": {
                    "current_strategy": current_strategy_detail,
                    "strategies": strategy_visual_data,
                    "multi_factor_score": multi_factor_score,
                }
            },
            "details": {"input": ["Indicators", "Regime", "Risk"], "output": ["当前策略", "策略排名"], "reasoning": [current_strategy_detail["reasoning"], llm_advice.get("strategy_advice", "")]},
            "updated_at": now_ts,
        },

        "alarm": {
            "room_id": "alarm",
            "room_name": "风险报警室",
            "status": "warning" if risk_level == "high" else "done",
            "type": "risk",
            "panel_type": "risk_gauge",
            "primary": {"label": "Risk Gate", "value": gate_label_zh, "unit": "", "level": gate_level},
            "summary": f'{gate_label_zh} · {risk_score}/100 · 仓位上限 {position_limit_pct}%',
            "insight": risk.get("insight", "风险分数由最大回撤、波动率分位数和市场状态共同决定。"),
            "impact_on_decision": "风险门控限制激进买入，并降低建议仓位。" if risk_score >= 40 else "风险水平较低，允许正常仓位操作。",
            "next_action": f"等待风险分数下降到 35 以下。" if risk_score >= 35 else "风险可控，继续监控。",
            "monitor_focus": ["风险分数 < 35", "最大回撤 < 15%", "波动率分位回落"],
            "metrics": [
                _metric_bar("风险分数", risk_score, "/100", "danger" if risk_score >= 70 else "warning" if risk_score >= 40 else "neutral"),
                _metric_bar("最大回撤", round(-dd_pct, 1), "%", "danger" if dd_pct > 20 else "warning" if dd_pct > 15 else "neutral"),
                _metric_bar("仓位上限", position_limit_pct, "%", "warning" if position_pct < 0.5 else "neutral"),
                _metric_number("波动率分位", vol_percentile, "%"),
            ],
            "visual": {
                "kind": "risk_gauge",
                "data": {
                    "risk_score": risk_score,
                    "risk_level": risk_level,
                    "gate_status": gate_status,
                    "gate_level": gate_level,
                    "gate_label_zh": gate_label_zh,
                    "gate_label_en": gate_label_en,
                    "position_limit_pct": position_limit_pct,
                    "sources": risk_source_rows,
                    "legacy_sources": risk_sources,
                    "review_conditions": review_conditions,
                }
            },
            "details": {"input": ["Returns", "Drawdown", "Regime"], "output": ["Risk Gate", "Position Constraint", "Review Conditions"], "reasoning": risk.get("reasoning", ["回撤和波动率共同决定风险水平。"])},
            "updated_at": now_ts,
        },

        "task_queues": {
            "room_id": "task_queues",
            "room_name": "回测评估室",
            "status": "done",
            "type": "backtest",
            "panel_type": "backtest_curve",
            "primary": {
                "label": "验证结论",
                "value": "通过" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "谨慎通过" if total_ret > 0 and dd_pct < 25 else "不通过",
                "unit": "",
                "level": "positive" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "warning" if total_ret > 0 and dd_pct < 25 else "danger",
            },
            "summary": f'回测收益 {_v(total_ret, ".1f")}% · 夏普 {_v(sharpe, ".2f")} · 最大回撤 {_v(-dd_pct, ".1f")}%',
            "insight": f'回测总收益 {_v(total_ret, ".1f")}%，夏普 {_v(sharpe, ".2f")}，最大回撤 {_v(-dd_pct, ".1f")}%。{"收益为正但 Sharpe 一般。" if total_ret > 0 and sharpe < 1.0 else "表现良好。" if sharpe >= 1.0 else "收益为负，需谨慎。"}',
            "impact_on_decision": "回测收益为正，但 Sharpe 一般且最大回撤较大，因此只能形成有限正向支持。" if total_ret > 0 and sharpe < 1.0 else "回测表现良好，支持当前策略方向。" if sharpe >= 1.0 else "回测收益为负，不支持当前策略方向。",
            "next_action": "优化风险控制后重新回测。" if dd_pct > 20 else "继续监控策略表现。",
            "monitor_focus": ["夏普 > 1.0", "最大回撤 < 15%", "胜率稳定性"],
            "metrics": [
                _metric_bar("总收益", round(total_ret, 1), "%", "positive" if total_ret > 0 else "danger"),
                _metric_number("夏普比率", _v(sharpe, ".2f"), "", "positive" if sharpe > 1.0 else "neutral"),
                _metric_bar("最大回撤", round(-dd_pct, 1), "%", "danger" if dd_pct > 20 else "warning" if dd_pct > 15 else "neutral"),
                _metric_bar("胜率", round(win_rate, 1), "%", "positive" if win_rate > 55 else "neutral"),
                _metric_number("交易次数", trades),
            ],
            "visual": {
                "kind": "equity_curve",
                "data": {
                    "strategy_curve": backtest.get("equity_curve", [1.0]),
                    "benchmark_curve": backtest.get("benchmark_curve", [1.0]),
                    "validation": {
                        "status": "pass" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "caution" if total_ret > 0 and dd_pct < 25 else "fail",
                        "status_zh": "通过" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "谨慎通过" if total_ret > 0 and dd_pct < 25 else "不通过",
                        "status_en": "Pass" if sharpe >= 1.0 and dd_pct < 15 and total_ret > 0 else "Caution" if total_ret > 0 and dd_pct < 25 else "Fail",
                        "total_return": round(total_ret, 1),
                        "sharpe": _v(sharpe, ".2f"),
                        "max_drawdown": round(-dd_pct, 1),
                        "win_rate": round(win_rate, 1),
                        "trades": trades,
                    },
                    "risk_handoff": [
                        {"label": "Max Drawdown", "label_zh": "最大回撤", "value": round(-dd_pct, 1), "unit": "%", "status": "warn" if dd_pct >= 15 else "pass"},
                        {"label": "Sharpe", "label_zh": "夏普比率", "value": _v(sharpe, ".2f"), "unit": "", "status": "pass" if sharpe >= 1.0 else "warn"},
                        {"label": "Win Rate", "label_zh": "胜率", "value": round(win_rate, 1), "unit": "%", "status": "pass" if win_rate >= 50 else "warn"},
                    ],
                    "retest_plan": [
                        {"label": "Parameter sensitivity", "label_zh": "参数敏感性复测", "status": "todo"},
                        {"label": "Segmented market regimes", "label_zh": "市场状态分段复测", "status": "todo"},
                        {"label": "Recent period replay", "label_zh": "近期区间复盘", "status": "todo"},
                    ],
                }
            },
            "details": {"input": ["Strategy Signal", "Price Data"], "output": ["Validation", "Risk Handoff", "Retest Plan"], "reasoning": ["基于历史数据模拟策略表现。"]},
            "updated_at": now_ts,
        },

        "schedule": (schedule_artifact := _build_schedule_artifact(
            now_ts, ticker, strategy_name, strategy_name_zh, current_strategy_detail,
            dec_str, dec_level, decision, explanation, position_pct, agent_analysis,
            backtest, risk, indicator, news
        )),

        "document": _build_document_artifact(
            now_ts, ticker, schedule_artifact, memory, risk, backtest,
            current_strategy_detail, STRATEGY_KNOWLEDGE_BASE
        ),

        "agent": {
            "room_id": "agent",
            "room_name": "运行监控室",
            "status": "done",
            "type": "monitor",
            "panel_type": "agent_monitor",
            "primary": {
                "label": {"en": "Agent Status", "zh": "Agent 状态"},
                "label_zh": "Agent 状态",
                "value": {"en": "Done", "zh": "完成"},
                "unit": "",
                "level": "positive"
            },
            "summary": {"en": "Pipeline completed", "zh": "Pipeline 完成"},
            "insight": {
                "en": "All agent stages completed without errors.",
                "zh": "所有 Agent 阶段已执行完毕，无异常报错。"
            },
            "impact_on_decision": {
                "en": "The monitor room displays agent status and does not directly change the final decision.",
                "zh": "运行监控室展示 Agent 状态，不直接改变最终决策。"
            },
            "next_action": {
                "en": "If any agent fails, switch to fallback logic.",
                "zh": "如某个 Agent 失败，切换 fallback 逻辑。"
            },
            "monitor_focus": [
                {"en": "Agent latency", "zh": "Agent 耗时"},
                {"en": "LLM failure", "zh": "LLM 失败"},
                {"en": "fallback usage", "zh": "fallback 使用情况"}
            ],
            "metrics": [
                _metric_number("Agents", len(agent_statuses), "", "neutral", "Agent 数"),
                _metric_number("Avg Latency", round(sum(a.get("latency_ms", 0) for a in agent_statuses) / max(len(agent_statuses), 1)), "ms", "neutral", "平均耗时"),
                _metric_number("Healthy", sum(1 for a in agent_statuses if a.get("health") == "healthy"), "", "positive", "健康"),
                _metric_number("Errors", sum(a.get("error_count", 0) for a in agent_statuses), "", "danger" if any(a.get("error_count", 0) for a in agent_statuses) else "positive", "错误数"),
            ],
            "visual": {
                "kind": "agent_status_grid",
                "data": {
                    "agents": agent_statuses,
                }
            },
            "details": {
                "input": ["Pipeline stages"],
                "output": ["Agent health", "Latency", "Error count"],
                "reasoning": ["Monitors data, indicator, news, risk and decision agents across the execution pipeline."],
            },
            "updated_at": now_ts,
        },

        "log": {
            "room_id": "log",
            "room_name": "执行日志台",
            "status": "done",
            "type": "execution",
            "panel_type": "execution_timeline",
            "primary": {
                "label": {"en": "Order", "zh": "订单"},
                "value": {"en": "Simulated", "zh": "模拟"},
                "unit": "",
                "level": "neutral"
            },
            "summary": {"en": f"No order · Simulated · {len(exec_events)} events", "zh": f"未下单 · 模拟执行 · {len(exec_events)} 条事件"},
            "insight": {
                "en": "Simulation mode: no real orders were executed. The log records the full execution chain for audit.",
                "zh": "模拟执行模式，未产生实际订单。日志用于审计完整执行链路。"
            },
            "impact_on_decision": {
                "en": "Execution logs trace the full pipeline but do not directly change the decision.",
                "zh": "日志用于追踪完整执行链路，不直接改变决策。"
            },
            "next_action": {
                "en": "Keep recent key events for post-run review.",
                "zh": "保留最近关键事件用于复盘。"
            },
            "monitor_focus": [
                {"en": "Exception logs", "zh": "异常日志"},
                {"en": "Failed stages", "zh": "失败阶段"},
                {"en": "Execution latency", "zh": "执行耗时"},
            ],
            "metrics": [
                _metric_number("Events", len(exec_events), label_zh="事件数"),
                _metric_badge("Status", {"en": "Done", "zh": "完成"}, "positive", label_zh="状态"),
            ],
            "visual": {
                "kind": "timeline",
                "data": {
                    "events": exec_events,
                }
            },
            "details": {
                "input": ["All pipeline stages"],
                "output": ["Execution timeline"],
                "reasoning": ["Records the start, data, indicator, news, risk, backtest, decision and report stages for audit."],
            },
            "updated_at": now_ts,
        },

        "memory": {
            "room_id": "memory",
            "room_name": "策略记忆库",
            "status": "done",
            "type": "memory",
            "panel_type": "memory_panel",
            "primary": {
                "label": {"en": "Strategy Memory", "zh": "策略记忆"},
                "value": {"en": "Recorded", "zh": "已记录"},
                "unit": "",
                "level": "positive"
            },
            "summary": {
                "en": f'Records: {len(memory_records)} · Avg Return: {_v(avg_return, ".1f")}% · Knowledge: {len(STRATEGY_KNOWLEDGE_BASE)}',
                "zh": f'运行记录 {len(memory_records)} 条 · 平均收益 {_v(avg_return, ".1f")}% · 策略知识 {len(STRATEGY_KNOWLEDGE_BASE)} 条'
            },
            "insight": {
                "en": f'Strategy memory has accumulated {len(memory_records)} run records and {len(STRATEGY_KNOWLEDGE_BASE)} strategy knowledge entries ({len([s for s in STRATEGY_KNOWLEDGE_BASE if s["source"] == "paper"])} from literature).',
                "zh": f'策略记忆库已积累 {len(memory_records)} 条运行记录和 {len(STRATEGY_KNOWLEDGE_BASE)} 条策略知识（含文献策略 {len([s for s in STRATEGY_KNOWLEDGE_BASE if s["source"] == "paper"])} 条）。'
            },
            "impact_on_decision": {
                "en": "Historical records exert a slight positive weight on the current strategy, but not enough to override risk constraints." if avg_return > 5 else "Historical records exert a slight negative weight on the current strategy." if avg_return < -5 else "Historical records are neutral and insufficient to change the decision.",
                "zh": "历史记录对当前策略形成轻微正向加权，但不足以覆盖风险约束。" if avg_return > 5 else "历史记录对当前策略形成轻微负向加权。" if avg_return < -5 else "历史记录中性，不足以改变决策。"
            },
            "next_action": {
                "en": "Continue accumulating strategy performance under similar market regimes.",
                "zh": "继续积累相似市场状态下的策略表现。"
            },
            "monitor_focus": [
                {"en": "Similar strategy performance", "zh": "相似策略表现"},
                {"en": "Historical win rate", "zh": "历史成功率"},
                {"en": "Historical drawdown", "zh": "历史回撤"},
            ],
            "metrics": [
                _metric_number("Run Records", len(memory_records), label_zh="运行记录"),
                _metric_number("Knowledge", len(STRATEGY_KNOWLEDGE_BASE), label_zh="策略知识"),
                _metric_number("Avg Return", _v(avg_return, ".1f"), "%", label_zh="平均收益"),
                _metric_number("Avg Sharpe", _v(avg_sharpe, ".2f"), label_zh="平均夏普"),
            ],
            "visual": {
                "kind": "memory_archive",
                "data": {
                    "records": memory_records,
                    "knowledge_base": STRATEGY_KNOWLEDGE_BASE,
                    "selected_strategy": {
                        "id": {"ma": "ma_crossover", "rsi": "rsi_momentum", "momentum": "momentum_20d"}.get(strategy_name, strategy_name),
                        "name": strategy_name,
                        "name_zh": strategy_name_zh,
                        "signal": dec_str.upper(),
                        "score": current_strategy_detail["score"],
                        "date": now_ts[:10],
                    },
                    "rankings": {
                        "by_return": [{"ticker": r["ticker"], "strategy": r["strategy"], "return": r["return"], "date": r["date"]} for r in by_return[:5]],
                        "by_sharpe": [{"ticker": r["ticker"], "strategy": r["strategy"], "sharpe": r["sharpe"], "date": r["date"]} for r in by_sharpe[:5]],
                    },
                    "stats": {
                        "total_runs": len(memory_records),
                        "best_strategy_by_return": by_return[0]["strategy"] if by_return else "N/A",
                        "best_return": by_return[0]["return"] if by_return else "N/A",
                        "best_strategy_by_sharpe": by_sharpe[0]["strategy"] if by_sharpe else "N/A",
                        "best_sharpe": by_sharpe[0]["sharpe"] if by_sharpe else "N/A",
                    },
                    "reflection": reflection_result,
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
            "primary": {
                "label": {"en": "Last Task", "zh": "最近任务"},
                "value": ticker,
                "unit": "",
                "level": "positive"
            },
            "summary": {"en": f'{ticker} · {dec_str.upper()}', "zh": f'{ticker} · {decision_zh}'},
            "insight": {
                "en": f'Latest analysis for {ticker} is complete. Decision: {dec_str.upper()}. Agents have returned to the break room.',
                "zh": f'最新分析 {ticker} 已完成，决策为 {decision_zh}。Agent 返回休息室待命。'
            },
            "impact_on_decision": {
                "en": "The break room does not participate in the current decision; it only shows system standby status.",
                "zh": "休息室不参与当前决策，仅展示系统待命状态。"
            },
            "next_action": {
                "en": "Waiting for the user to submit the next analysis task.",
                "zh": "等待用户提交下一次分析任务。"
            },
            "monitor_focus": [
                {"en": "New task", "zh": "新任务"},
                {"en": "Last task summary", "zh": "最近任务摘要"},
            ],
            "metrics": [
                _metric_badge("Decision", {"en": dec_str.upper(), "zh": decision_zh}, dec_level, label_zh="决策"),
                _metric_badge("Strategy", {"en": strategy_name, "zh": strategy_name_zh}, "neutral", label_zh="策略"),
            ],
            "visual": {
                "kind": "idle_status",
                "data": {
                    "system_status": "idle",
                    "next_ready": True,
                    "last_asset": ticker,
                    "last_decision": dec_str.upper(),
                    "last_decision_zh": decision_zh,
                    "last_run_at": now_ts,
                    "tasks_completed": len(memory_records),
                    "ready_message": {"en": "System ready for next task", "zh": "系统已就绪，等待下一次任务"},
                }
            },
            "details": {
                "input": ["Decision Desk", "Agent Monitor"],
                "output": ["Standby Status", "Next Task Readiness"],
                "reasoning": ["Agents return to idle after the pipeline completes; the break room reflects system readiness."],
            },
            "updated_at": now_ts,
        },
    }
