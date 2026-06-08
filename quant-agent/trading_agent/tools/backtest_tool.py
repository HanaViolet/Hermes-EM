from pathlib import Path

import numpy as np
import pandas as pd


def calculate_max_drawdown(curve: pd.Series) -> float:
    running_max = curve.cummax()
    drawdown = curve / running_max - 1
    return drawdown.min()


def run_backtest(
    data: pd.DataFrame,
    signal: pd.Series,
    transaction_cost: float = 0.001
) -> dict:
    data = data.copy()
    data["signal"] = signal

    data["daily_return"] = data["close"].pct_change()
    data["position"] = data["signal"].shift(1).fillna(0)

    data["trade"] = data["position"].diff().abs().fillna(0)
    data["strategy_return"] = data["position"] * data["daily_return"]
    data["strategy_return"] -= data["trade"] * transaction_cost

    data["benchmark_return"] = data["daily_return"]
    data = data.dropna().reset_index(drop=True)

    data["strategy_curve"] = (1 + data["strategy_return"]).cumprod()
    data["benchmark_curve"] = (1 + data["benchmark_return"]).cumprod()

    total_return = data["strategy_curve"].iloc[-1] - 1
    benchmark_total_return = data["benchmark_curve"].iloc[-1] - 1

    annual_return = data["strategy_curve"].iloc[-1] ** (252 / len(data)) - 1
    annual_volatility = data["strategy_return"].std() * np.sqrt(252)
    sharpe_ratio = 0 if annual_volatility == 0 else annual_return / annual_volatility

    max_drawdown = calculate_max_drawdown(data["strategy_curve"])
    benchmark_max_drawdown = calculate_max_drawdown(data["benchmark_curve"])

    win_rate = (data["strategy_return"] > 0).mean()
    number_of_trades = int(data["trade"].sum())

    return {
        "data": data,
        "total_return": total_return,
        "benchmark_total_return": benchmark_total_return,
        "annual_return": annual_return,
        "annual_volatility": annual_volatility,
        "sharpe_ratio": sharpe_ratio,
        "max_drawdown": max_drawdown,
        "benchmark_max_drawdown": benchmark_max_drawdown,
        "win_rate": win_rate,
        "number_of_trades": number_of_trades
    }


def save_backtest_result(result: dict, ticker: str, strategy: str, start: str, end: str):
    output_dir = Path("outputs/results")
    output_dir.mkdir(parents=True, exist_ok=True)

    result_path = output_dir / f"{ticker}_{strategy}_{start}_{end}.csv"
    result["data"].to_csv(result_path, index=False)

    return result_path
