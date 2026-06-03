from agent.trading_agent import run_trading_agent

output = run_trading_agent(
    ticker="QQQ",
    start_date="2020-01-01",
    end_date="2024-12-31",
    strategy_name="auto",
    transaction_cost=0.001,
)

print(output["strategy"])
print(output["decision"])
print(output["backtest_result"]["sharpe_ratio"])
print(output["report"])
