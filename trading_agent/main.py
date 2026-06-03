import argparse
from agent.trading_agent import run_trading_agent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", type=str, default="QQQ")
    parser.add_argument("--start", type=str, default="2020-01-01")
    parser.add_argument("--end", type=str, default="2024-12-31")
    parser.add_argument("--strategy", type=str, default="auto")
    parser.add_argument("--cost", type=float, default=0.001)
    args = parser.parse_args()

    output = run_trading_agent(
        ticker=args.ticker,
        start_date=args.start,
        end_date=args.end,
        strategy_name=args.strategy,
        transaction_cost=args.cost
    )

    print(output["report"])


if __name__ == "__main__":
    main()
