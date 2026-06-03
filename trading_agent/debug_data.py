from tools.data_tool import get_price_data

for ticker in ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"]:
    data = get_price_data(ticker, "2020-01-01", "2024-12-31")
    print(ticker, data.shape, data["date"].min(), data["date"].max())
    print(data.head())
