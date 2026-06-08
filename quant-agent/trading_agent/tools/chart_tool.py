import plotly.graph_objects as go


def make_equity_curve_fig(backtest_data, ticker):
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=backtest_data["date"],
        y=backtest_data["strategy_curve"],
        mode="lines",
        name="Strategy",
        line={"width": 3},
    ))

    fig.add_trace(go.Scatter(
        x=backtest_data["date"],
        y=backtest_data["benchmark_curve"],
        mode="lines",
        name="Buy-and-Hold",
        line={"width": 2, "dash": "dash"},
        opacity=0.7,
    ))

    fig.update_layout(
        height=480,
        margin={"l": 10, "r": 10, "t": 30, "b": 10},
        title=f"{ticker} Strategy vs Buy-and-Hold",
        hovermode="x unified",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255,255,255,0.92)",
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.02, "x": 0},
        xaxis_title="Date",
        yaxis_title="Cumulative Return",
    )

    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(gridcolor="rgba(17, 36, 58, 0.08)")

    return fig


def make_drawdown_fig(backtest_data, ticker):
    curve = backtest_data["strategy_curve"]
    drawdown = curve / curve.cummax() - 1

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=backtest_data["date"],
        y=drawdown,
        mode="lines",
        name="Drawdown",
        line={"width": 3},
    ))

    fig.update_layout(
        height=420,
        margin={"l": 10, "r": 10, "t": 30, "b": 10},
        title=f"{ticker} Drawdown",
        hovermode="x unified",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255,255,255,0.92)",
        xaxis_title="Date",
        yaxis_title="Drawdown",
    )

    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(gridcolor="rgba(17, 36, 58, 0.08)")

    return fig


def make_price_ma_fig(data, ticker):
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=data["date"],
        y=data["close"],
        mode="lines",
        name="Close",
        line={"width": 2.4},
    ))

    fig.add_trace(go.Scatter(
        x=data["date"],
        y=data["ma20"],
        mode="lines",
        name="MA20",
        line={"width": 1.8},
    ))

    fig.add_trace(go.Scatter(
        x=data["date"],
        y=data["ma60"],
        mode="lines",
        name="MA60",
        line={"width": 1.8, "dash": "dash"},
    ))

    fig.update_layout(
        height=480,
        margin={"l": 10, "r": 10, "t": 30, "b": 10},
        title=f"{ticker} Price with Moving Averages",
        hovermode="x unified",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255,255,255,0.92)",
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.02, "x": 0},
        xaxis_title="Date",
        yaxis_title="Price",
    )

    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(gridcolor="rgba(17, 36, 58, 0.08)")

    return fig
