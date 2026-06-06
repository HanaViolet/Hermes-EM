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
from trading_agent.tools.report_tool import generate_report
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

        raw_score = (
            result["sharpe_ratio"]
            + result["annual_return"]
            + result["max_drawdown"]
            - 0.001 * result["number_of_trades"]
        )
        if result["max_drawdown"] < -0.40:
            raw_score -= 1.0
        normalized_score = max(0, min(100, 50 + raw_score * 20))

        strategy_scores.append({
            "name": strategy_name,
            "raw_score": round(raw_score, 4),
            "score": round(normalized_score, 2),
            "sharpe": round(result["sharpe_ratio"], 3),
            "return": round(result["total_return"] * 100, 2),
            "trades": result["number_of_trades"],
        })

        if normalized_score > best_score:
            best_score = normalized_score
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
        indicator_result = {}
        for col in ["close","ma20","ma60","rsi","macd","macd_signal","volatility_20d","daily_return","return_20d"]:
            if col in data.columns:
                try:
                    v = float(last_row[col])
                    if not _math.isnan(v):
                        indicator_result[col] = round(v, 6)
                except Exception: pass
        indicator_result["rows"] = len(data)
        update_workflow(current_stage="calculating_indicators", progress=30, summary=f"Indicators: RSI={indicator_result.get('rsi','?')}, MACD={indicator_result.get('macd','?')}", details=indicator_result)

        # ── Stage 3: Regime Detection ──
        regime_result = detect_market_regime(data)
        update_workflow(current_stage="detecting_regime", progress=35, summary=f"Regime: {regime_result['trend_regime']} + {regime_result['volatility_regime']}", logs=[regime_result.get("interpretation","")])

        # ── Stage 4: News LLM Agent ──
        from trading_agent.tools.news_tool import run_news_agent
        news_result = run_news_agent(asset=ticker, indicators=indicator_result, regime=regime_result)
        update_workflow(current_stage="analyzing_news", progress=42, summary=f"News: {news_result.get('news_sentiment','neutral')} ({news_result.get('news_score',50)}/100)", logs=[news_result.get("summary","")])

        # ── Stage 5-7: Strategy / Risk / Backtest ──
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

        # ── Stage 7: Dynamic Risk ──
        risk_result = compute_dynamic_risk_score(backtest=result, indicators=indicator_result, regime=regime_result)
        update_workflow(current_stage="checking_risk", progress=72, summary=f"Risk: {risk_result['risk_level']} ({risk_result['risk_score']}/100)")

        # ── Stage 8: Memory ──
        history_data = _load_history_for_memory()
        memory_result = compute_memory_score(history_data, ticker, strategy_name)
        update_workflow(current_stage="using_memory", progress=78, summary=f"Memory: {memory_result.get('memory_score',0)} boost", logs=[memory_result.get("evidence","")])

        # ── Stage 9: Score-based Decision ──
        decision_result = compute_decision_score(regime=regime_result, risk=risk_result, strategy_scores=strategy_scores, memory=memory_result, indicators=indicator_result, backtest=result, news_result=news_result)
        update_workflow(current_stage="making_decision", progress=88, summary=f"Decision: {decision_result['decision'].upper()} (score={decision_result['decision_score']})")

        # ── Stage 10: Explain ──
        explanation = explain_decision({"decision_result": decision_result, "risk_result": risk_result, "regime_result": regime_result, "strategy_scores": strategy_scores, "indicator_result": indicator_result})
        update_workflow(current_stage="explaining_decision", progress=94, summary=explanation.get("short",""))

        # ── Stage 11: Report ──
        latest_signal = int(final_signal.iloc[-1])
        report_md = generate_report(ticker=ticker, strategy_name=strategy_name, latest_signal=latest_signal, result=result, decision_result=decision_result)
        save_backtest_result(result, ticker, strategy_name, start_date, end_date)

        # ── Stage 12: Completed (MUST be last update_workflow) ──
        result_summary = {"selected_strategy": strategy_name, "decision": decision_result["decision"], "confidence": decision_result["confidence"], "total_return": result["total_return"], "benchmark_return": result["benchmark_total_return"], "sharpe_ratio": result["sharpe_ratio"], "max_drawdown": result["max_drawdown"], "trades": result["number_of_trades"], "decision_score": decision_result["decision_score"], "risk_score": risk_result["risk_score"]}
        update_workflow(global_status="done", current_stage="completed", progress=100, cat_id="trading_cat", cat_status="done", summary=f"Completed. Decision: {decision_result['decision']}", result_summary=result_summary, report={"markdown": report_md, "path": ""}, logs=["Workflow completed"])

        full_result = {
            "ticker": ticker,
            "strategy": strategy_name,
            "data": data,
            "signal": final_signal,
            "backtest_result": result,
            "decision": decision_result,
            "report": report_md,
            "strategy_scores": strategy_scores,
            "indicator_result": indicator_result,
            "regime_result": regime_result,
            "news_result": news_result,
            "risk_result": risk_result,
            "memory_result": memory_result,
            "explanation": explanation,
        }

        return full_result

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
