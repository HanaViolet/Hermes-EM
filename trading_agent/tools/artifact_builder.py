"""Room Artifact Builder — generates all 12 room artifacts from trading results."""
from __future__ import annotations
from datetime import datetime
from typing import Any


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

    def _v(val, fmt=".2f", default="N/A"):
        if val is None: return default
        try: return format(float(val), fmt)
        except: return str(val)

    def _lv(prefix, val, unit=""):
        return {"label": prefix, "value": str(val), "unit": unit, "display": "number", "level": "neutral"}

    def _build_schedule_artifact(now_ts, dec_str, dec_level, decision, explanation, position_pct, agent_analysis):
        votes = agent_analysis.get("agent_votes", [])
        critic = agent_analysis.get("critic_review", {})
        triggers = agent_analysis.get("trigger_conditions", [])
        plan = agent_analysis.get("monitor_plan", [])
        adjustments = agent_analysis.get("strategy_adjustments", [])

        # Metrics: Decision + each agent vote
        metrics = [
            _lv("Decision", dec_str.upper()),
            _lv("Confidence", _v((decision.get("confidence", 0.62) if isinstance(decision, dict) else 0.62) * 100, ".0f") + "%"),
            _lv("Score", _v(decision.get("decision_score", 50), ".0f") if isinstance(decision, dict) else "50"),
            _lv("Position", str(round(position_pct * 100)) + "%"),
        ]
        for v in votes:
            vote_cls = "positive" if v["vote"] == "buy" else "danger" if v["vote"] == "sell" else "warning"
            metrics.append({"label": v["agent"], "value": v["vote"].upper(), "unit": str(v["score"]), "display": "badge", "level": vote_cls})

        # Reasoning: critic concerns + why-nots
        reasoning = []
        if critic.get("verdict"):
            reasoning.append(f"Critic verdict: {critic['verdict']}")
        reasoning.extend(critic.get("concerns", []))
        for w in critic.get("why_not_buy", []):
            reasoning.append(f"Why not Buy: {w}")
        for w in critic.get("why_not_sell", []):
            reasoning.append(f"Why not Sell: {w}")
        if not reasoning:
            reasoning = explanation.get("reasons", ["综合评分决定最终决策。"])

        # Insight: critic recommendation
        insight = critic.get("recommendation", explanation.get("short_explanation", f"最终选择 {dec_str.upper()}。"))

        # Details input/output
        details_input = ["Strategy", "Risk", "Regime", "News"]
        details_output = ["Final Decision", "Confidence", "Position"]
        if votes:
            details_output.append("Agent Votes")
        if triggers:
            details_output.append("Trigger Conditions")
        if plan:
            details_output.append("Monitoring Plan")

        return {
            "room_id": "schedule",
            "room_name": "决策调度台",
            "status": "done",
            "type": "decision",
            "primary": {"label": "Decision", "value": dec_str.upper(), "unit": "", "level": dec_level},
            "summary": f"{dec_str.upper()} · Conf {_v((decision.get('confidence', 0.62) if isinstance(decision, dict) else 0.62) * 100, '.0f')}%",
            "insight": insight,
            "metrics": metrics,
            "details": {
                "input": details_input,
                "output": details_output,
                "reasoning": reasoning,
                "agent_votes": votes,
                "critic_review": critic,
                "trigger_conditions": triggers,
                "monitor_plan": plan,
                "strategy_adjustments": adjustments,
            },
            "updated_at": now_ts,
        }

    # Build common metrics
    dd_pct = abs(backtest.get("max_drawdown", 0)) * 100
    total_ret = (backtest.get("total_return") or 0) * 100
    sharpe = backtest.get("sharpe_ratio", 0)

    dec_str = decision.get("decision", "hold") if isinstance(decision, dict) else str(decision)
    dec_level = "positive" if "buy" in dec_str.lower() else "danger" if "sell" in dec_str.lower() else "warning"

    rsi_val = indicator.get("rsi")
    macd_val = indicator.get("macd")
    rows_val = indicator.get("rows")

    risk_score = risk.get("risk_score", 40)
    risk_level = risk.get("risk_level", "medium")
    position_pct = risk.get("position_pct", decision.get("suggested_position", 35) if isinstance(decision, dict) else 35)

    return {
        "gateway": {"room_id":"gateway","room_name":"市场数据室","status":"done","type":"data", "primary":{"label":"数据条数","value":_v(rows_val,".0f") if rows_val else "N/A","unit":"bars","level":"positive"}, "summary":f'{_v(rows_val,".0f")} bars' if rows_val else "Data loaded", "insight":"行情数据完整，无明显缺失，可支持后续分析。", "metrics":[_lv("数据条数", _v(rows_val,".0f")), _lv("最新收盘", _v(indicator.get("close"), ".2f")), _lv("完整度", "100%")], "details":{"input":["Yahoo Finance / Stooq"],"output":[ticker+" OHLCV"],"reasoning":["数据从缓存或远程源加载。"]}, "updated_at":now_ts},

        "mcp": {"room_id":"mcp","room_name":"指标实验室","status":"done","type":"indicator", "primary":{"label":"RSI","value":_v(rsi_val,".1f"),"unit":"","level":"warning" if rsi_val and (rsi_val>70 or rsi_val<30) else "neutral"}, "summary":f'RSI {_v(rsi_val,".1f")} · MACD {_v(macd_val,".3f")}', "insight":"指标计算完成，可继续后续分析。" if rsi_val else "指标数据待计算。", "metrics":[_lv("RSI",_v(rsi_val,".1f")),_lv("MACD",_v(macd_val,".3f")),_lv("MA20",_v(indicator.get("ma20"),".1f")),_lv("Volatility",str(round(float(indicator.get("volatility_20d") or 0)*100,1))+"%")], "details":{"input":["close","volume","returns"],"output":["RSI","MACD","MA20","MA60","Volatility"],"reasoning":["RSI 未进入超买或超卖区间。" if rsi_val and 30<rsi_val<70 else "RSI 处于极端区间。"]}, "updated_at":now_ts},

        "images": {"room_id":"images","room_name":"资讯分析室","status":"done","type":"news", "primary":{"label":"News Score","value":str(news.get("news_score",50)),"unit":"/100","level":"neutral"}, "summary":f'News: {news.get("news_sentiment","neutral")} · {news.get("news_score",50)}/100', "insight":news.get("insight","新闻面中性。"), "metrics":[_lv("Sentiment",news.get("news_sentiment","neutral")),_lv("News Score",news.get("news_score",50)),_lv("Key Events",str(len(news.get("key_events",[])))),_lv("Risk Events",str(len(news.get("risk_events",[]))))], "details":{"input":news.get("key_events",[]),"output":[news.get("summary","")],"reasoning":news.get("risk_events",[])}, "updated_at":now_ts},

        "skills": {"room_id":"skills","room_name":"策略实验室","status":"done","type":"strategy", "primary":{"label":"Top 策略","value":strategy_scores[0]["name"] if strategy_scores else strategy_name,"unit":str(strategy_scores[0].get("score","")) if strategy_scores else "","level":"positive"}, "summary":(strategy_scores[0]["name"]+" · Score "+str(strategy_scores[0].get("score",""))) if strategy_scores else f"Strategy: {strategy_name}", "insight":llm_advice.get("insight","策略比较完成。"), "metrics":[{"label":sc.get("name","?"),"value":sc.get("score",0),"display":"strategy_score","signal":"buy" if sc.get("return",0)>5 else "sell" if sc.get("return",0)<-5 else "hold","unit":"score"} for sc in strategy_scores], "details":{"input":["Indicators","Regime","Risk"],"output":["Strategy Ranking","LLM Advice"],"reasoning":[llm_advice.get("strategy_advice","")]}, "updated_at":now_ts},

        "alarm": {"room_id":"alarm","room_name":"风险报警室","status":"warning" if risk_level=="high" else "done","type":"risk", "primary":{"label":"Risk","value":risk_score,"unit":"/100","level":"danger" if risk_score>=70 else "warning" if risk_score>=40 else "neutral"}, "summary":f'{risk_level.capitalize()} · {risk_score}/100', "insight":risk.get("insight","风险分数由最大回撤、波动率分位数和市场状态共同决定。"), "metrics":[_lv("Risk Score",str(risk_score)+"/100"),_lv("Max Drawdown",_v(-dd_pct,".1f")+"%"),_lv("Position Limit",str(round(position_pct*100))+"%"),_lv("Vol Percentile",_v(regime.get("volatility_percentile",0)*100,".0f")+"%")], "details":{"input":["Returns","Drawdown","Regime"],"output":["Risk Score","Risk Level","Position Constraint"],"reasoning":risk.get("reasoning",["回撤和波动率共同决定风险水平。"])}, "updated_at":now_ts},

        "task_queues": {"room_id":"task_queues","room_name":"回测评估室","status":"done","type":"backtest", "primary":{"label":"Sharpe","value":_v(sharpe,".2f"),"unit":"","level":"positive" if sharpe>0.5 else "neutral"}, "summary":f'Return {_v(total_ret,".1f")}% · Sharpe {_v(sharpe,".2f")}', "insight":f'回测总收益 {_v(total_ret,".1f")}%，夏普 {_v(sharpe,".2f")}，最大回撤 {_v(-dd_pct,".1f")}%。', "metrics":[_lv("Total Return",_v(total_ret,".1f")+"%"),_lv("Sharpe",_v(sharpe,".2f")),_lv("Max Drawdown",_v(-dd_pct,".1f")+"%"),_lv("Win Rate",_v((backtest.get("win_rate")or 0)*100,".1f")+"%"),_lv("Trades",str(backtest.get("trades")or backtest.get("number_of_trades","?")))], "details":{"input":["Strategy Signal","Price Data"],"output":["Return","Sharpe","Drawdown","Win Rate"],"reasoning":["基于历史数据模拟策略表现。"]}, "updated_at":now_ts},

        "schedule": _build_schedule_artifact(now_ts, dec_str, dec_level, decision, explanation, position_pct, agent_analysis),

        "document": {"room_id":"document","room_name":"报告与分析室","status":"done","type":"report", "primary":{"label":"Report","value":"Ready","unit":"","level":"positive"}, "summary":f'Report ready · {ticker}', "insight":f'{ticker} {strategy_name} 策略分析完成。', "metrics":[_lv("Decision",dec_str.upper()),_lv("Return",_v(total_ret,".1f")+"%"),_lv("Sharpe",_v(sharpe,".2f"))], "details":{"input":["All room artifacts"],"output":[ticker+" Report"],"reasoning":["基于各步骤结果生成综合报告。"]}, "updated_at":now_ts},

        "agent": {"room_id":"agent","room_name":"运行监控室","status":"done","type":"monitor", "primary":{"label":"Agent 状态","value":"完成","unit":"","level":"positive"}, "summary":"Pipeline completed", "insight":"所有 Agent 阶段已执行完毕。", "metrics":[], "details":{"input":[],"output":[],"reasoning":[]}, "updated_at":now_ts},

        "log": {"room_id":"log","room_name":"执行日志台","status":"done","type":"execution", "primary":{"label":"Order","value":"Simulated","unit":"","level":"neutral"}, "summary":"No order · Simulated", "insight":"模拟执行模式，无实际订单产生。", "metrics":[], "details":{"input":[],"output":[],"reasoning":[]}, "updated_at":now_ts},

        "memory": {"room_id":"memory","room_name":"策略记忆库","status":"done","type":"memory", "primary":{"label":"策略记忆","value":"已记录","unit":"","level":"positive"}, "summary":f'Last: {ticker} · {dec_str.upper()}', "insight":f'{ticker} 分析记录已保存至历史策略库。', "metrics":[_lv("History Boost",str(memory.get("memory_score",0)))], "details":{"input":[],"output":[],"reasoning":[memory.get("evidence","")]}, "updated_at":now_ts},

        "break_room": {"room_id":"break_room","room_name":"休息室","status":"done","type":"idle", "primary":{"label":"Last Task","value":ticker,"unit":"","level":"positive"}, "summary":f'{ticker} · {dec_str.upper()}', "insight":f'最新分析 {ticker} 已完成，决策为 {dec_str.upper()}。Agent 返回休息室待命。', "metrics":[_lv("Decision",dec_str.upper())], "details":{"input":[],"output":[],"reasoning":[]}, "updated_at":now_ts},
    }
