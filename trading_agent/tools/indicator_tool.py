import pandas as pd
import numpy as np


def calculate_rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()

    rs = avg_gain / avg_loss
    return 100 - 100 / (1 + rs)


def add_technical_indicators(data: pd.DataFrame) -> pd.DataFrame:
    data = data.copy()

    data["daily_return"] = data["close"].pct_change()
    data["ma20"] = data["close"].rolling(20).mean()
    data["ma60"] = data["close"].rolling(60).mean()

    data["rsi"] = calculate_rsi(data["close"], 14)

    ema12 = data["close"].ewm(span=12, adjust=False).mean()
    ema26 = data["close"].ewm(span=26, adjust=False).mean()
    data["macd"] = ema12 - ema26
    data["macd_signal"] = data["macd"].ewm(span=9, adjust=False).mean()

    data["volatility_20d"] = data["daily_return"].rolling(20).std() * np.sqrt(252)
    data["return_20d"] = data["close"].pct_change(20)

    return data.dropna().reset_index(drop=True)
