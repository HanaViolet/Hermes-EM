from trading_agent.tools.data_tool import get_price_data
from trading_agent.tools.indicator_tool import add_technical_indicators
from trading_agent.tools.strategy_tool import generate_signal
from trading_agent.tools.risk_tool import apply_risk_control
from trading_agent.tools.backtest_tool import run_backtest, save_backtest_result
from trading_agent.tools.report_tool import make_final_decision, generate_report
from trading_agent.utils.logger import get_logger
from trading_agent.utils.office_bridge import update_workflow

import math as _math

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

        return {
            "ticker": ticker,
            "strategy": strategy_name,
            "data": data,
            "signal": final_signal,
            "backtest_result": result,
            "decision": decision_result,
            "report": report_md,
            "strategy_scores": strategy_scores,
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
