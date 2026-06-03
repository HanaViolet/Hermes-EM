import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from tools.indicator_tool import add_technical_indicators


def test_add_technical_indicators():
    data = pd.DataFrame({
        "date": pd.date_range("2022-01-01", periods=200),
        "open": 100.0,
        "high": 101.0,
        "low": 99.0,
        "close": [100.0 + i * 0.5 for i in range(200)],
        "volume": 1000000,
    })

    result = add_technical_indicators(data)

    for col in ["ma20", "ma60", "rsi", "macd", "macd_signal", "volatility_20d", "return_20d"]:
        assert col in result.columns, f"Missing column: {col}"

    assert not result.isnull().any().any()


if __name__ == "__main__":
    test_add_technical_indicators()
    print("test_indicator_tool: PASSED")
