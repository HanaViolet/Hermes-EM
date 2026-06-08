import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from tools.strategy_tool import generate_signal


def test_generate_signal():
    data = pd.DataFrame({
        "ma20": [100.0, 101.0, 102.0, 103.0, 104.0],
        "ma60": [99.0, 100.0, 101.0, 102.0, 103.0],
        "rsi": [50.0, 25.0, 50.0, 75.0, 50.0],
        "return_20d": [0.01, 0.02, -0.01, 0.03, -0.02],
    })

    for strategy in ["ma", "rsi", "momentum"]:
        signal = generate_signal(data, strategy)
        assert len(signal) == len(data)
        assert signal.isin([0, 1]).all()


if __name__ == "__main__":
    test_generate_signal()
    print("test_strategy_tool: PASSED")
