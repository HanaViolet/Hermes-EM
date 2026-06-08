import pandas as pd


def moving_average_strategy(data: pd.DataFrame) -> pd.Series:
    return (data["ma20"] > data["ma60"]).astype(int)


def rsi_strategy(data: pd.DataFrame) -> pd.Series:
    signal = pd.Series(index=data.index, data=0)
    position = 0

    for i in range(len(data)):
        if data.loc[i, "rsi"] < 30:
            position = 1
        elif data.loc[i, "rsi"] > 70:
            position = 0
        signal.iloc[i] = position

    return signal


def momentum_strategy(data: pd.DataFrame) -> pd.Series:
    return (data["return_20d"] > 0).astype(int)


def generate_signal(data: pd.DataFrame, strategy_name: str) -> pd.Series:
    if strategy_name == "ma":
        return moving_average_strategy(data)
    if strategy_name == "rsi":
        return rsi_strategy(data)
    if strategy_name == "momentum":
        return momentum_strategy(data)
    raise ValueError(f"Unsupported strategy: {strategy_name}")
