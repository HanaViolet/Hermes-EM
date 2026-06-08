def make_final_decision(latest_signal: int, result: dict) -> dict:
    sharpe = result["sharpe_ratio"]
    max_dd = result["max_drawdown"]
    total_ret = result["total_return"]
    bench_ret = result["benchmark_total_return"]

    if latest_signal == 1 and sharpe > 1.0 and max_dd > -0.25 and total_ret > bench_ret:
        return {"decision": "Buy", "confidence": "High"}

    if latest_signal == 1 and sharpe > 0.5 and max_dd > -0.35:
        return {"decision": "Buy", "confidence": "Medium"}

    return {"decision": "Hold", "confidence": "Low"}


def generate_report(ticker, strategy_name, latest_signal, result, decision_result) -> str:
    latest_position = "Long" if latest_signal == 1 else "Cash"

    return f"""# Trading Agent Report: {ticker}

## Final Decision
- Decision: {decision_result["decision"]}
- Confidence: {decision_result["confidence"]}

## Strategy
- Selected Strategy: {strategy_name}
- Latest Signal: {latest_position}

## Backtest
- Total Return: {result["total_return"]:.2%}
- Benchmark Total Return: {result["benchmark_total_return"]:.2%}
- Annual Return: {result["annual_return"]:.2%}
- Annual Volatility: {result["annual_volatility"]:.2%}
- Sharpe Ratio: {result["sharpe_ratio"]:.2f}
- Max Drawdown: {result["max_drawdown"]:.2%}
- Benchmark Max Drawdown: {result["benchmark_max_drawdown"]:.2%}
- Win Rate: {result["win_rate"]:.2%}
- Number of Trades: {result["number_of_trades"]}

## Risk Notice
This result is based on historical backtesting and is for educational use only. It is not financial advice.
"""
