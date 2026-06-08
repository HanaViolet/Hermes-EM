import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import numpy as np
from tools.backtest_tool import run_backtest


def test_run_backtest():
    np.random.seed(42)
    n = 500

    returns = np.random.normal(0.0005, 0.02, n)
    close = 100 * np.cumprod(1 + returns)
    signal = pd.Series(np.random.choice([0, 1], n))

    data = pd.DataFrame({"close": close})

    result = run_backtest(data, signal, transaction_cost=0.001)

    assert "total_return" in result
    assert "sharpe_ratio" in result
    assert "max_drawdown" in result
    assert result["data"]["strategy_curve"].iloc[-1] is not None

    # Check position is derived from signal.shift(1)
    # After dropna (first row NaN in daily_return), verify internal consistency
    bt = result["data"]
    # Position values should only be 0 or 1
    assert bt["position"].isin([0, 1]).all()
    # Signal values should only be 0 or 1
    assert bt["signal"].isin([0, 1]).all()
    # Position should equal signal.shift(1).fillna(0) on the pre-dropna data
    # Verify on backtest data: position[i] should match signal[i-1] for i>0
    for i in range(1, len(bt)):
        assert bt["position"].iloc[i] == bt["signal"].iloc[i - 1], (
            f"Position mismatch at index {i}"
        )


if __name__ == "__main__":
    test_run_backtest()
    print("test_backtest_tool: PASSED")
