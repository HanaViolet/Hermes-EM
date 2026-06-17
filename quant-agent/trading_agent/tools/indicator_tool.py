import pandas as pd
import numpy as np


def calculate_rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()

    avg_loss = avg_loss.replace(0, np.nan)
    rs = avg_gain / avg_loss
    rsi = 100 - 100 / (1 + rs)
    return rsi.fillna(50)


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

    data = data.dropna().reset_index(drop=True)
    if data.empty:
        raise ValueError("Not enough data after indicator calculation. Please use at least 90 trading days.")
    return data


def compute_multi_factor_score(indicator: dict) -> float:
    """Compute a simplified multi-factor score inspired by Carhart (1997).

    Carhart four-factor model: Market, Size (SMB), Value (HML), Momentum (MOM).
    With single-asset daily data we use observable proxies:
      - Market premium proxy   : 20-day return vs zero benchmark
      - Momentum proxy         : sign/magnitude of 20-day return
      - Risk-adjustment proxy  : inverse of 20-day volatility
      - Trend proxy            : MA20 vs MA60 cross-over
    Score is normalized to 0-100, 50 = neutral.
    """
    ret_20d = indicator.get("return_20d")
    vol_20d = indicator.get("volatility_20d")
    ma20 = indicator.get("ma20")
    ma60 = indicator.get("ma60")

    # Momentum factor (MOM): annualized-ish, capped
    mom = 0.0
    if ret_20d is not None:
        mom = max(-1, min(1, float(ret_20d) * 12))  # ~ annualized, capped ±100%

    # Market factor: same proxy, milder weight
    mkt = mom * 0.6

    # Risk-adjustment factor: lower volatility is better
    risk_adj = 0.0
    if vol_20d is not None and float(vol_20d) > 0:
        risk_adj = max(-0.5, min(0.5, 0.15 / float(vol_20d) - 0.6))

    # Trend factor: dual-MA cross-over
    trend = 0.0
    if ma20 is not None and ma60 is not None and float(ma60) != 0:
        trend = max(-0.5, min(0.5, (float(ma20) - float(ma60)) / float(ma60) * 10))

    # Equal-weighted composite, then map [-2, 2] -> [0, 100]
    composite = mkt * 0.25 + mom * 0.25 + risk_adj * 0.25 + trend * 0.25
    score = 50 + composite * 25
    return float(round(max(0, min(100, score)), 2))
