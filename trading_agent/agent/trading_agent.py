from tools.data_tool import get_price_data
from tools.indicator_tool import add_technical_indicators
from tools.strategy_tool import generate_signal
from tools.risk_tool import apply_risk_control
from tools.backtest_tool import run_backtest, save_backtest_result
from tools.report_tool import make_final_decision, generate_report
from utils.logger import get_logger
from utils.office_bridge import update_workflow

logger = get_logger()


def select_best_strategy(data, strategies, transaction_cost=0.001):
    best_strategy = None
    best_signal = None
    best_result = None
    best_score = -999

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

        if score > best_score:
            best_score = score
            best_strategy = strategy_name
            best_signal = final_signal
            best_result = result

    return best_strategy, best_signal, best_result


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

        # ── Stage 3-6: Strategy / Risk / Backtest ──
        update_workflow(
            current_stage="selecting_strategy",
            progress=45,
            cat_id="strategy_cat",
            cat_status="running",
            summary="Selecting trading strategy.",
            logs=["Compare candidate strategies"]
        )

        if strategy_name == "auto":
            strategy_name, final_signal, result = select_best_strategy(
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
