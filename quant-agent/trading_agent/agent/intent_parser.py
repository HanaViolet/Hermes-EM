def parse_user_query(query: str) -> dict:
    q = query.upper()
    tickers = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"]

    ticker = next((t for t in tickers if t in q), "QQQ")

    if "RSI" in q:
        strategy = "rsi"
    elif "MOMENTUM" in q:
        strategy = "momentum"
    elif "MA" in q or "MOVING" in q:
        strategy = "ma"
    else:
        strategy = "auto"

    return {
        "ticker": ticker,
        "strategy": strategy,
        "start_date": "2020-01-01",
        "end_date": "2024-12-31"
    }
