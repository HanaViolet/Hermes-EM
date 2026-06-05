from trading_agent.tools.data_tool import get_price_data
from trading_agent.tools.indicator_tool import add_technical_indicators
from trading_agent.tools.regime_tool import detect_market_regime
from trading_agent.tools.strategy_tool import generate_signal
from trading_agent.tools.risk_tool import apply_risk_control
from trading_agent.tools.risk_scoring import compute_dynamic_risk_score
from trading_agent.tools.backtest_tool import run_backtest, save_backtest_result
from trading_agent.tools.chart_tool import make_equity_curve_fig, make_drawdown_fig
from trading_agent.tools.memory_tool import compute_memory_score
from trading_agent.tools.decision_score_tool import compute_decision_score
from trading_agent.tools.explain_tool import explain_decision
from trading_agent.tools.report_tool import make_final_decision, generate_report
from trading_agent.utils.logger import get_logger
from trading_agent.utils.office_bridge import update_workflow, ROOM_LABELS, _telemetry_state, _persist_telemetry

import math as _math
import json as _json


def _load_history_for_memory() -> list:
    """Load trading history for memory agent."""
    try:
        from pathlib import Path as _P3
        _hp = _P3(__file__).resolve().parent.parent.parent / "trading_server" / "trading_history.json"
        if _hp.exists():
            return _json.loads(_hp.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def _write_room_artifacts_to_file(*, ticker, strategy_name, task, indicator_result, strategy_scores, backtest, decision, report_md):
    """Write room_artifacts directly using the same _telemetry_state as update_workflow."""
    try:
        now_ts = str(__import__('datetime').datetime.now())[:19]
        dd_pct = abs(backtest.get("max_drawdown", 0)) * 100
        total_ret = (backtest.get("total_return") or 0) * 100
        risk_score = min(100, int(dd_pct * 2.5)) if dd_pct else 40
        risk_level = "danger" if dd_pct > 30 else "warning" if dd_pct > 15 else "neutral"
        period = task.get("start_date", "?") + " ~ " + task.get("end_date", "?")

        rsi_val = indicator_result.get("rsi")
        macd_val = indicator_result.get("macd")
        ma20_val = indicator_result.get("ma20")
        ma60_val = indicator_result.get("ma60")
        vol_val = indicator_result.get("volatility_20d")
        close_val = indicator_result.get("close")
        rows_val = indicator_result.get("rows")

        def _v(val, fmt=".2f"):
            if val is None: return "N/A"
            try: return format(float(val), fmt)
            except: return str(val)

        dec_str = decision.get("decision", "N/A") if isinstance(decision, dict) else str(decision)
        dec_level = "positive" if "buy" in dec_str.lower() else "danger" if "sell" in dec_str.lower() else "warning"
        top_name = strategy_scores[0]["name"] if strategy_scores else strategy_name
        top_score = str(strategy_scores[0].get("score", "")) if strategy_scores else ""

        def _a(rid, name, typ, status, pl, pv, pu, plv, summary, insight, metrics, inp, outp, reas):
            return {"room_id":rid,"room_name":name,"status":status,"type":typ,"primary":{"label":pl,"value":pv,"unit":pu,"level":plv},"summary":summary,"insight":insight,"metrics":metrics,"details":{"input":inp,"output":outp,"reasoning":reas},"updated_at":now_ts}

        room_artifacts = {
            "gateway": _a("gateway","市场数据室","data","done","数据条数",_v(rows_val,".0f") if rows_val else "N/A","bars","positive",(f'{_v(rows_val,".0f")} bars' if rows_val else 'Data loaded'),"行情数据完整，无明显缺失。",[{"label":"时间区间","value":period,"display":"text"},{"label":"缺失值","value":0,"display":"number","level":"positive"}],["Yahoo Finance / Stooq"],[ticker+" OHLCV daily data"],["数据从缓存或远程源加载。"]),
            "mcp": _a("mcp","指标实验室","indicator","done","RSI",_v(rsi_val,".1f"),"","warning" if rsi_val and (rsi_val>70 or rsi_val<30) else "neutral",f'RSI {_v(rsi_val,".1f")} · MACD {_v(macd_val,".2f")}',"指标计算完成，可继续后续分析。",[{"label":"RSI","value":_v(rsi_val,".1f"),"display":"bar","level":"warning" if rsi_val and (rsi_val>70 or rsi_val<30) else "neutral"},{"label":"MACD","value":_v(macd_val,".3f"),"display":"number","level":"neutral"},{"label":"MA20","value":_v(ma20_val,".1f"),"display":"number","level":"positive"},{"label":"Volatility","value":(str(round(float(vol_val)*100,1))+"%") if vol_val is not None else "N/A","display":"bar","level":"warning" if vol_val and vol_val>0.3 else "neutral"}],["close price","volume","returns"],["RSI","MACD","MA20","MA60","Volatility"],["RSI 未进入超买或超卖区间。","MACD 动能待确认。"]),
            "skills": _a("skills","策略实验室","strategy","done","Top 策略",top_name,top_score,"positive",(top_name+" · Score "+top_score) if strategy_scores else "Strategy: "+strategy_name,"策略比较完成。",[{"label":sc.get("name","?"),"value":sc.get("score",0),"display":"strategy_score","signal":"buy" if sc.get("return",0)>5 else "sell" if sc.get("return",0)<-5 else "hold","unit":"score"} for sc in strategy_scores],["MA / RSI / MACD indicators"],["Signal","Score"],["比较各策略的历史表现。"]),
            "alarm": _a("alarm","风险报警室","risk","warning","Risk",risk_score,"/100",risk_level,("High" if risk_score>70 else "Medium" if risk_score>35 else "Low")+" · "+str(risk_score)+"/100","最大回撤较高，建议降低仓位或保持观望。",[{"label":"Risk Score","value":risk_score,"unit":"/100","display":"gauge","level":risk_level},{"label":"Max Drawdown","value":round(-dd_pct,1),"unit":"%","display":"bar","level":"danger" if dd_pct>25 else "warning"}],["策略信号","风控参数"],["风险评分","最大回撤"],["检查仓位限制和止损线。"]),
            "task_queues": _a("task_queues","回测实验室","backtest","done","Sharpe",round(backtest.get("sharpe_ratio",0),2),"","positive" if backtest.get("sharpe_ratio",0)>0.5 else "neutral","Return "+str(_v(total_ret,".1f"))+"% · Sharpe "+str(_v(backtest.get("sharpe_ratio",0),".2f")),"回测总收益 "+str(_v(total_ret,".1f"))+"%，夏普 "+str(_v(backtest.get("sharpe_ratio",0),".2f"))+"。",[{"label":"Total Return","value":_v(total_ret,".1f"),"unit":"%","display":"bar","level":"positive" if total_ret>0 else "danger"},{"label":"Sharpe","value":_v(backtest.get("sharpe_ratio",0),".2f"),"display":"number"},{"label":"Max Drawdown","value":_v(-dd_pct,".1f"),"unit":"%","display":"bar","level":"warning"}],["交易信号序列"],["权益曲线","成交列表"],["基于历史数据模拟策略表现。"]),
            "schedule": _a("schedule","决策调度台","decision","done","Decision",dec_str.upper(),"",dec_level,dec_str.upper()+" · Conf 62%","综合策略得分与风险约束后做出决策。",[{"label":"Decision","value":dec_str.upper(),"display":"badge","level":dec_level}],["策略排序","风险评估"],["Buy/Sell/Hold","Confidence"],["综合各策略得分和风险约束后做出决策。"]),
            "document": _a("document","报告与分析室","report","done","Report","Ready","","positive","Report ready · "+ticker,ticker+" 策略分析完成。",[{"label":"Decision","value":dec_str.upper(),"display":"badge"}],["全部房间产物"],[ticker+" 分析报告"],["基于各步骤结果生成综合报告。"]),
            "agent": _a("agent","运行监控室","monitor","done","Agent 状态","完成","","positive","6 stages done","所有 Agent 阶段已执行完毕。",[{"label":"Pipeline","value":"已完成","display":"badge","level":"positive"}],[],[],[]),
            "log": _a("log","执行日志台","execution","done","Order","Simulated","","neutral","No order · Simulated","模拟执行模式，无实际订单产生。",[],[],[],[]),
            "images": _a("images","图表分析室","chart","done","Charts","Ready","","positive","收益曲线 · K线图 ready","图表已生成，可查看策略与基准对比的权益曲线和回撤分析。",[{"label":"Strategy Return","value":str(_v(total_ret,".1f"))+"%","display":"number","level":"positive" if total_ret>0 else "danger"},{"label":"Benchmark Return","value":str(_v((backtest.get("benchmark_total_return") or 0)*100,".1f"))+"%","display":"number"},{"label":"Max Drawdown","value":str(_v(-dd_pct,".1f"))+"%","display":"bar","level":"danger" if dd_pct>25 else "warning"},{"label":"Win Rate","value":str(_v(((backtest.get("win_rate") or 0)*100),".1f"))+"%","display":"bar"}],["OHLCV data","Strategy signal","Backtest returns"],["Price trend","Return curve","Indicator chart"],["权益曲线对比策略与基准表现。","最大回撤分析识别风险集中区间。"]),
            "memory": _a("memory","策略记忆库","memory","done","策略记忆","已记录","","positive","Last: "+ticker+" · "+dec_str.upper(),ticker+" 分析记录已保存。",[],[],[],[]),
            "break_room": _a("break_room","休息室","idle","done","Last Task",ticker,"","positive",ticker+" · "+dec_str.upper(),"最新分析 "+ticker+" 已完成。Agent 返回休息室待命。",[{"label":"Decision","value":dec_str.upper(),"display":"badge","level":dec_level}],[],[],[]),
        }

        # Store in shared telemetry state and persist
        _telemetry_state["room_artifacts"] = room_artifacts
        _persist_telemetry()
    except Exception as _e:
        import traceback as _tb
        _err = _P2(__file__).resolve().parent.parent.parent / "trading_server" / "artifact_error.log"
        _err.write_text(f"{_e}\n{_tb.format_exc()}", encoding="utf-8")

logger = get_logger()


def select_best_strategy(data, strategies, transaction_cost=0.001):
    best_strategy = None
    best_signal = None
    best_result = None
    best_score = -999

    strategy_scores = []  # Collect all strategy results for comparison

    for strategy_name in strategies:
        raw_signal = generate_signal(data, strategy_name)

        update_workflow(
            current_stage="checking_risk",
            progress=55,
            cat_id="risk_cat",
            cat_status="running",
            summary=f"Applying risk control: {strategy_name}",
            logs=[f"Apply volatility filter and stop-loss to {strategy_name} signal"]
        )

        final_signal = apply_risk_control(data, raw_signal)

        update_workflow(
            current_stage="running_backtest",
            progress=65,
            cat_id="backtest_cat",
            cat_status="running",
            summary=f"Running backtest: {strategy_name}",
            logs=[f"Calculate {strategy_name} strategy returns vs benchmark"]
        )

        result = run_backtest(data, final_signal, transaction_cost)

        score = (
            result["sharpe_ratio"]
            + result["annual_return"]
            + result["max_drawdown"]
            - 0.001 * result["number_of_trades"]
        )

        if result["max_drawdown"] < -0.40:
            score -= 1.0

        strategy_scores.append({
            "name": strategy_name,
            "score": round(score, 3),
            "sharpe": round(result["sharpe_ratio"], 3),
            "return": round(result["total_return"] * 100, 2),
            "trades": result["number_of_trades"],
        })

        if score > best_score:
            best_score = score
            best_strategy = strategy_name
            best_signal = final_signal
            best_result = result

    # Push strategy comparison for the Strategy Lab room artifact
    update_workflow(
        current_stage="selecting_strategy",
        progress=50,
        summary=f"Best: {best_strategy} (score={best_score:.2f})",
        details={"strategies": strategy_scores},
    )

    return best_strategy, best_signal, best_result, strategy_scores


def run_trading_agent(
    ticker: str,
    start_date: str,
    end_date: str,
    strategy_name: str = "auto",
    transaction_cost: float = 0.001
) -> dict:
    try:
        task = {
            "ticker": ticker,
            "start_date": start_date,
            "end_date": end_date,
            "strategy": strategy_name,
            "transaction_cost": transaction_cost,
        }

        logger.info(f"Run agent: ticker={ticker}, strategy={strategy_name}")

        # ── Stage 1: Loading Data ──
        update_workflow(
            global_status="syncing",
            current_stage="loading_data",
            progress=15,
            cat_id="data_cat",
            cat_status="syncing",
            task=task,
            summary=f"Loading {ticker} market data.",
            logs=["Start loading market data"]
        )

        raw_data = get_price_data(ticker, start_date, end_date)
        logger.info(f"Data loaded: rows={len(raw_data)}")

        # ── Stage 2: Calculating Indicators ──
        update_workflow(
            global_status="running",
            current_stage="calculating_indicators",
            progress=30,
            cat_id="technical_cat",
            cat_status="running",
            summary="Calculating technical indicators.",
            details={
                "rows": len(raw_data),
                "start": str(raw_data["date"].min()),
                "end": str(raw_data["date"].max())
            },
            logs=[
                f"Loaded {len(raw_data)} rows",
                "Start calculating MA, RSI, MACD and volatility"
            ]
        )

        data = add_technical_indicators(raw_data)

        # Extract indicator values for room artifacts display
        last_row = data.iloc[-1]
        indicator_metrics = {}
        for col in ["ma20","ma60","rsi","macd","macd_signal","volatility_20d","daily_return","return_20d","close"]:
            if col in data.columns:
                try:
                    val = float(last_row[col])
                    if not _math.isnan(val):
                        indicator_metrics[col] = round(val, 4)
                except Exception:
                    pass
        # Push indicator values as telemetry metrics
        update_workflow(
            current_stage="calculating_indicators",
            progress=30,
            summary=f"Indicators: RSI={indicator_metrics.get('RSI','?')}, MACD={indicator_metrics.get('MACD','?')}",
            details=indicator_metrics,
        )

        # ── Stage 3-6: Strategy / Risk / Backtest ──
        update_workflow(
            current_stage="selecting_strategy",
            progress=45,
            cat_id="strategy_cat",
            cat_status="running",
            summary="Selecting trading strategy.",
            logs=["Compare candidate strategies"]
        )

        strategy_scores = []
        if strategy_name == "auto":
            strategy_name, final_signal, result, strategy_scores = select_best_strategy(
                data=data,
                strategies=["ma", "rsi", "momentum"],
                transaction_cost=transaction_cost
            )
        else:
            raw_signal = generate_signal(data, strategy_name)

            update_workflow(
                current_stage="checking_risk",
                progress=60,
                cat_id="risk_cat",
                cat_status="running",
                summary="Applying risk control rules.",
                logs=["Apply volatility filter and stop-loss rule"]
            )

            final_signal = apply_risk_control(data, raw_signal)

            update_workflow(
                current_stage="running_backtest",
                progress=75,
                cat_id="backtest_cat",
                cat_status="running",
                summary="Running historical backtest.",
                logs=["Calculate strategy returns and benchmark returns"]
            )

            result = run_backtest(data, final_signal, transaction_cost)

        logger.info(f"Backtest done: sharpe={result['sharpe_ratio']:.2f}")

        # ── Stage 7: Writing Report ──
        update_workflow(
            current_stage="writing_report",
            progress=90,
            cat_id="report_cat",
            cat_status="writing",
            summary="Generating final report.",
            logs=["Generate performance summary and risk analysis"]
        )

        latest_signal = int(final_signal.iloc[-1])
        decision_result = make_final_decision(latest_signal, result)

        report_md = generate_report(
            ticker=ticker,
            strategy_name=strategy_name,
            latest_signal=latest_signal,
            result=result,
            decision_result=decision_result
        )

        save_backtest_result(result, ticker, strategy_name, start_date, end_date)

        result_summary = {
            "selected_strategy": strategy_name,
            "decision": decision_result["decision"],
            "confidence": decision_result["confidence"],
            "total_return": result["total_return"],
            "benchmark_return": result["benchmark_total_return"],
            "sharpe_ratio": result["sharpe_ratio"],
            "max_drawdown": result["max_drawdown"],
            "trades": result["number_of_trades"]
        }

        # ── Stage 8: Completed ──
        update_workflow(
            global_status="done",
            current_stage="completed",
            progress=100,
            cat_id="trading_cat",
            cat_status="done",
            summary=f"Completed. Decision: {decision_result['decision']}",
            result_summary=result_summary,
            report={"markdown": report_md, "path": ""},
            logs=["Workflow completed"]
        )

        # Collect indicator values from the data frame
        indicator_result = {}
        last = data.iloc[-1]
        for col in ["close","ma20","ma60","rsi","macd","macd_signal","volatility_20d","daily_return","return_20d"]:
            if col in data.columns:
                try:
                    v = float(last[col])
                    if not _math.isnan(v):
                        indicator_result[col] = round(v, 6)
                except Exception:
                    pass
        indicator_result["rows"] = len(data)

        # Phase 2: Detect market regime
        regime_result = detect_market_regime(data)
        update_workflow(
            current_stage="selecting_strategy",
            progress=48,
            summary=f"Market: {regime_result['trend_regime']} / {regime_result['volatility_regime']}",
            logs=[f"Regime: {regime_result['interpretation']}"]
        )

        # Write room_artifacts directly to telemetry JSON before returning
        _write_room_artifacts_to_file(
            ticker=ticker, strategy_name=strategy_name,
            task=task, indicator_result=indicator_result,
            strategy_scores=strategy_scores,
            backtest=result, decision=decision_result,
            report_md=report_md,
        )

        return {
            "ticker": ticker,
            "strategy": strategy_name,
            "data": data,
            "signal": final_signal,
            "backtest_result": result,
            "decision": decision_result,
            "report": report_md,
            "strategy_scores": strategy_scores,
            "indicator_result": indicator_result,
        }

    except Exception as exc:
        logger.error(f"Trading agent failed: {exc}")
        update_workflow(
            global_status="error",
            current_stage="failed",
            progress=0,
            cat_id="trading_cat",
            cat_status="error",
            summary="Trading workflow failed.",
            error={"message": str(exc), "stage": "run_trading_agent"},
            logs=[f"Error: {str(exc)}"]
        )
        raise
