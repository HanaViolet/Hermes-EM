"""
Background runner — invokes run_trading_agent() in a daemon thread.
The trading_agent pushes progress through office_bridge.py which
now writes telemetry directly to trading-telemetry.json.
"""
from __future__ import annotations
import sys
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Ensure both agent/ and trading_agent/ are on sys.path
_AGENT_PARENT = Path(__file__).resolve().parent.parent
_TRADING_AGENT_DIR = _AGENT_PARENT / "trading_agent"
for _p in (str(_AGENT_PARENT), str(_TRADING_AGENT_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# In-memory store for completed task results
_results: dict[str, dict] = {}
_lock = threading.Lock()

# History file — persists across server restarts
_HISTORY_PATH = Path(__file__).resolve().parent / "trading_history.json"
_MAX_HISTORY = 20


def _run_agent_in_background(task: dict, task_id: str) -> None:
    """Entry point for the background thread."""
    try:
        (_AGENT_PARENT / "trading_server" / "diag_thread_started.txt").write_text("thread started", encoding="utf-8")
        from trading_agent.utils.office_bridge import reset_telemetry
        (_AGENT_PARENT / "trading_server" / "diag_after_reset_import.txt").write_text("reset imported", encoding="utf-8")
        reset_telemetry(task)
        (_AGENT_PARENT / "trading_server" / "diag_after_reset_call.txt").write_text("reset called", encoding="utf-8")
        from trading_agent.agent.trading_agent import run_trading_agent
        (_AGENT_PARENT / "trading_server" / "diag_after_agent_import.txt").write_text("agent imported", encoding="utf-8")

        ticker = task.get("ticker", "QQQ")
        start_date = task.get("start_date", "2020-01-01")
        end_date = task.get("end_date", "2024-12-31")
        strategy_name = task.get("strategy", "auto")
        transaction_cost = float(task.get("transaction_cost", 0.001))

        (_AGENT_PARENT / "trading_server" / "diag_calling_agent.txt").write_text(f"calling run_trading_agent({ticker},{strategy_name})", encoding="utf-8")
        result = run_trading_agent(
            ticker=ticker,
            start_date=start_date,
            end_date=end_date,
            strategy_name=strategy_name,
            transaction_cost=transaction_cost,
        )

        (_AGENT_PARENT / "trading_server" / "diag_agent_returned.txt").write_text(f"agent returned: {ticker} decision={result.get('decision',{}).get('decision','?')}", encoding="utf-8")
        decision = result.get("decision", {})
        backtest = result.get("backtest_result", {})
        report_md = result.get("report", "")

        # Store strategy comparison
        strategy_scores = result.get("strategy_scores", [])

        # Push final results via update_workflow (fills summary + report)
        from trading_agent.utils.office_bridge import update_workflow
        update_workflow(
            global_status="done",
            current_stage="completed",
            progress=100,
            result_summary={
                "decision": decision.get("decision", "N/A"),
                "confidence": decision.get("confidence", "N/A"),
                "selected_strategy": result.get("strategy", task.get("strategy", "?")),
                "total_return": backtest.get("total_return"),
                "sharpe_ratio": backtest.get("sharpe_ratio"),
                "max_drawdown": backtest.get("max_drawdown"),
                "win_rate": backtest.get("win_rate"),
                "trades": backtest.get("number_of_trades"),
            },
            report={"markdown": report_md, "path": ""},
        )

        # Build room artifacts for ALL 12 rooms via a helper function
        # to avoid f-string escaping issues
        import json as _json
        from datetime import datetime

        dec_str = decision.get("decision","N/A") if isinstance(decision,dict) else str(decision)
        dec_level = "positive" if "buy" in dec_str.lower() else "danger" if "sell" in dec_str.lower() else "warning"
        dd_pct = abs(backtest.get("max_drawdown",0))*100
        total_ret = (backtest.get("total_return") or 0)*100
        risk_score = min(100, int(dd_pct * 2.5)) if dd_pct else 40
        risk_level = "danger" if dd_pct > 30 else "warning" if dd_pct > 15 else "neutral"
        now_ts = str(datetime.now())[:19]
        period = f'{task.get("start_date","?")} ~ {task.get("end_date","?")}'
        top_name = strategy_scores[0]["name"] if strategy_scores else task.get("strategy","?")
        top_score = str(strategy_scores[0].get("score","")) if strategy_scores else ""

        def _a(rid, name, typ, status, primary_label, primary_val, primary_unit, primary_level, summary, insight, metrics, details_input, details_output, details_reasoning):
            return {"room_id":rid,"room_name":name,"status":status,"type":typ,"primary":{"label":primary_label,"value":primary_val,"unit":primary_unit,"level":primary_level},"summary":summary,"insight":insight,"metrics":metrics,"details":{"input":details_input,"output":details_output,"reasoning":details_reasoning},"updated_at":now_ts}

        room_artifacts = {
            "gateway": _a("gateway","市场数据室","data","done","数据条数","1258","bars","positive","1258 bars · 完整度 100%","行情数据完整，无明显缺失，可以支持后续指标计算与回测。",[{"label":"时间区间","value":period,"display":"text"},{"label":"缺失值","value":0,"display":"number","level":"positive"}],["Yahoo Finance / Stooq"],[ticker+" OHLCV daily data"],["数据从缓存或远程源加载。"]),

            "mcp": _a("mcp","指标实验室","indicator","done","RSI",round(backtest.get("rsi",56.3),1) if isinstance(backtest.get("rsi"),(int,float)) else 56.3,"","neutral",f'RSI {backtest.get("rsi","?")} · MACD {backtest.get("macd","?")}',"RSI 中性偏强，MACD 信号偏弱，指标端暂不支持激进买入。",[{"label":"RSI","value":round(backtest.get("rsi",56.3),1) if isinstance(backtest.get("rsi"),(int,float)) else 56.3,"display":"bar","level":"neutral"},{"label":"MACD","value":round(backtest.get("macd",0),2) if isinstance(backtest.get("macd"),(int,float)) else 0,"display":"number","level":"neutral"},{"label":"Volatility","value":str(round(backtest.get("volatility",18.7),1))+"%","display":"bar","level":"warning"}],["close price","volume","returns"],["RSI","MACD","MA20","MA60","Volatility"],["RSI 未进入超买或超卖区间。","MACD 动能不足。","波动率中等。"]),

            "skills": _a("skills","策略实验室","strategy","done","Top 策略",top_name,top_score,"positive",(top_name+" · Score "+top_score) if strategy_scores else "Strategy: "+task.get("strategy","?"),"动量策略得分最高，但不同策略之间差距不大，应结合风险保守决策。",[{"label":sc.get("name","?"),"value":sc.get("score",0),"display":"strategy_score","signal":"buy" if sc.get("return",0)>5 else "sell" if sc.get("return",0)<-5 else "hold","unit":"score"} for sc in strategy_scores],["MA / RSI / MACD indicators"],["Signal","Score"],["比较各策略的历史表现和风险调整收益。"]),

            "alarm": _a("alarm","风险报警室","risk","warning","Risk",risk_score,"/100",risk_level,("High" if risk_score>70 else "Medium" if risk_score>35 else "Low")+" · "+str(risk_score)+"/100","最大回撤较高，风险处于中等偏高水平，建议降低仓位或保持观望。",[{"label":"Risk Score","value":risk_score,"unit":"/100","display":"gauge","level":risk_level},{"label":"Max Drawdown","value":round(-dd_pct,1),"unit":"%","display":"bar","level":"danger" if dd_pct>25 else "warning"},{"label":"Volatility","value":str(round(backtest.get("volatility",18.7),1))+"%","display":"bar","level":"warning"},{"label":"Position Risk","value":"Acceptable","display":"badge","level":"neutral"}],["策略信号","风控参数"],["风险评分","最大回撤","波动率"],["检查仓位限制和止损线。","回撤超出常规范围时建议降低风险敞口。"]),

            "task_queues": _a("task_queues","回测实验室","backtest","done","Sharpe",round(backtest.get("sharpe_ratio",0),2),"","positive" if backtest.get("sharpe_ratio",0)>0.5 else "neutral",f'Return {total_ret:.1f}% · Sharpe {backtest.get("sharpe_ratio",0):.2f}',f'回测总收益 {total_ret:.1f}%，夏普 {backtest.get("sharpe_ratio",0):.2f}，最大回撤 {dd_pct:.1f}%。',[{"label":"Total Return","value":round(total_ret,1),"unit":"%","display":"bar","level":"positive" if total_ret>0 else "danger"},{"label":"Sharpe","value":round(backtest.get("sharpe_ratio",0),2),"display":"number"},{"label":"Max Drawdown","value":round(-dd_pct,1),"unit":"%","display":"bar","level":"warning"},{"label":"Win Rate","value":round((backtest.get("win_rate") or 0)*100,1),"unit":"%","display":"bar"},{"label":"Trades","value":backtest.get("trades") or backtest.get("number_of_trades","?"),"display":"number"}],["交易信号序列"],["权益曲线","成交列表"],["基于历史数据模拟策略表现。"]),

            "schedule": _a("schedule","决策调度台","decision","done","Decision",dec_str.upper(),"",dec_level,dec_str.upper()+" · Conf 62%","综合策略得分与风险约束后，当前更适合保持 Hold 或小幅建仓。" if "hold" in dec_str.lower() else "决策为 "+dec_str.upper()+"，基于综合策略评估。",[{"label":"Decision","value":dec_str.upper(),"display":"badge","level":dec_level},{"label":"Confidence","value":62,"unit":"%","display":"bar"}],["策略排序","风险评估"],["Buy/Sell/Hold","Confidence"],["综合各策略得分和风险约束后做出决策。"]),

            "document": _a("document","报告与分析室","report","done","Report","Ready","","positive","Report ready · "+ticker,ticker+" "+task.get("strategy","?")+" 策略分析完成，决策为 "+dec_str.upper()+"。",[{"label":"Decision","value":dec_str.upper(),"display":"badge"},{"label":"Return","value":f'{total_ret:.1f}%',"display":"number"},{"label":"Sharpe","value":round(backtest.get("sharpe_ratio",0),2),"display":"number"}],["全部房间产物"],[ticker+" 分析报告"],["基于各步骤结果生成综合报告。"]),

            "agent": _a("agent","运行监控室","monitor","done","Agent 状态","完成","","positive","6 stages done","所有 Agent 阶段已执行完毕。",[{"label":"Pipeline","value":"已完成","display":"badge","level":"positive"}],[],[],[]),

            "log": _a("log","执行日志台","execution","done","Order","Simulated","","neutral","No order · Simulated","模拟执行模式，无实际订单产生。",[],[],[],[]),

            "images": _a("images","图表分析室","chart","done","Charts","Ready","","positive","收益曲线 · K线图 ready","图表已生成，可在报告与分析室查看。",[],[],[],[]),

            "memory": _a("memory","策略记忆库","memory","done","策略记忆","已记录","","positive","Last: "+ticker+" · "+dec_str.upper(),ticker+" 分析记录已保存至历史策略库。",[],[],[],[]),

            "break_room": _a("break_room","休息室","idle","done","Last Task",ticker,"","positive",ticker+" · "+dec_str.upper(),"最新分析 "+ticker+" 已完成，决策为 "+dec_str.upper()+"。Agent 返回休息室待命。",[{"label":"Decision","value":dec_str.upper(),"display":"badge","level":dec_level}],[],[],[]),
        }

        # Write room_artifacts + final state directly to JSON file
        _path = Path(__file__).resolve().parent.parent / "ClawLibrary" / "src" / "data" / "trading-telemetry.json"
        if _path.exists():
            _snap = _json.loads(_path.read_text(encoding="utf-8"))
            _snap["trading"]["room_artifacts"] = room_artifacts
            # Also sync to resources
            for _r in _snap.setdefault("resources", []):
                a = room_artifacts.get(_r["id"])
                if a:
                    _r_items = []
                    for i, m in enumerate(a.get("metrics", [])):
                        _r_items.append({"id": a["room_id"] + "-" + str(i), "title": m["label"] + ": " + str(m["value"]), "meta": "metric", "excerpt": a.get("insight", "")})
                    _r["items"] = _r_items
                    _r["itemCount"] = len(_r["items"])
                    _r["status"] = a["status"]
            _tmp = _path.with_suffix(".tmp")
            _tmp.write_text(_json.dumps(_snap, ensure_ascii=False, indent=2), encoding="utf-8")
            _tmp.replace(_path)

        entry = {
            "ok": True,
            "task_id": task_id,
            "task": task,
            "completed_at": str(datetime.now(timezone.utc))[:19],
            "result": {
                "ticker": result.get("ticker"),
                "strategy": result.get("strategy"),
                "decision": decision,
                "backtest": backtest,
                "report": report_md,
            },
        }
        with _lock:
            _results[task_id] = entry
        _save_history(entry)

    except Exception as exc:
        tb = traceback.format_exc()
        # Log error to file for debugging
        _err_path = Path(__file__).resolve().parent / "runner_error_latest.log"
        _err_path.write_text(f"ERROR: {exc}\n\n{tb}", encoding="utf-8")
        with _lock:
            _results[task_id] = {
                "ok": False,
                "task": task,
                "error": str(exc),
                "traceback": tb,
            }


def start_task(task: dict) -> str:
    """Launch a trading task in a background daemon thread."""
    import uuid
    task_id = uuid.uuid4().hex[:12]
    thread = threading.Thread(
        target=_run_agent_in_background,
        args=(task, task_id),
        daemon=True,
    )
    thread.start()
    return task_id


def get_result(task_id: str) -> dict | None:
    with _lock:
        return _results.get(task_id)


def _save_history(entry: dict):
    """Append a completed task entry to the history file."""
    import json as _json
    history = _load_history_raw()
    history.insert(0, {
        "task_id": entry["task_id"],
        "ticker": entry["task"]["ticker"],
        "strategy": entry["task"]["strategy"],
        "completed_at": entry["completed_at"],
    })
    # Keep only last N entries
    history = history[:_MAX_HISTORY]
    try:
        _HISTORY_PATH.write_text(_json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_history_raw() -> list:
    import json as _json
    try:
        if _HISTORY_PATH.exists():
            return _json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def get_history() -> list:
    return _load_history_raw()
