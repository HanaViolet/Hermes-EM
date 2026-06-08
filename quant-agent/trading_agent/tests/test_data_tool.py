import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tools.data_tool import get_price_data


def test_get_price_data():
    data = get_price_data("QQQ", "2020-01-01", "2024-12-31")

    assert data is not None
    assert not data.empty
    assert "date" in data.columns
    assert "open" in data.columns
    assert "high" in data.columns
    assert "low" in data.columns
    assert "close" in data.columns
    assert "volume" in data.columns


if __name__ == "__main__":
    test_get_price_data()
    print("test_data_tool: PASSED")
