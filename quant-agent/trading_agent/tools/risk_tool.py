import pandas as pd


def apply_volatility_filter(
    data: pd.DataFrame,
    signal: pd.Series,
    volatility_threshold: float = 0.45
) -> pd.Series:
    signal = signal.copy()
    signal[data["volatility_20d"] > volatility_threshold] = 0
    return signal


def apply_stop_loss(
    data: pd.DataFrame,
    signal: pd.Series,
    stop_loss: float = -0.08
) -> pd.Series:
    signal = signal.copy()
    position = 0
    entry_price = None

    for i in range(len(data)):
        price = data.loc[i, "close"]

        if signal.iloc[i] == 1 and position == 0:
            position = 1
            entry_price = price

        elif position == 1 and entry_price is not None:
            current_return = price / entry_price - 1
            if current_return <= stop_loss:
                position = 0
                signal.iloc[i] = 0
                entry_price = None

        if signal.iloc[i] == 0:
            position = 0
            entry_price = None

    return signal


def apply_risk_control(
    data: pd.DataFrame,
    signal: pd.Series,
    volatility_threshold: float = 0.45,
    stop_loss: float = -0.08
) -> pd.Series:
    signal = apply_volatility_filter(data, signal, volatility_threshold)
    signal = apply_stop_loss(data, signal, stop_loss)
    return signal
