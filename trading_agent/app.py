from pathlib import Path
import shutil
import streamlit as st

from agent.trading_agent import run_trading_agent
from tools.chart_tool import (
    make_equity_curve_fig,
    make_drawdown_fig,
    make_price_ma_fig,
)


st.set_page_config(
    page_title="Trading Agent",
    page_icon="📈",
    layout="wide"
)

# ─── CSS ───────────────────────────────────────────────────────────

st.markdown("""
<style>
.stApp {
    background:
        radial-gradient(circle at top left, rgba(38, 84, 124, 0.12), transparent 30%),
        linear-gradient(180deg, #f5f8fc 0%, #edf2f7 100%);
}

.block-container {
    padding-top: 2.2rem;
    padding-left: 3rem;
    padding-right: 3rem;
    max-width: 1280px;
}

.hero {
    background: linear-gradient(135deg, #16324f 0%, #244f77 55%, #3b7ca6 100%);
    color: white;
    padding: 2rem 2.2rem;
    border-radius: 24px;
    margin-bottom: 1.25rem;
    box-shadow: 0 20px 50px rgba(18, 43, 67, 0.18);
}

.hero h1 {
    margin: 0 0 0.35rem 0;
    font-size: 2.2rem;
}

.hero p {
    margin: 0;
    font-size: 1rem;
    opacity: 0.92;
}

.metric-card {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(22, 50, 79, 0.08);
    border-radius: 20px;
    padding: 1rem 1.1rem;
    box-shadow: 0 12px 30px rgba(17, 36, 58, 0.08);
}

.metric-label {
    color: #4f6478;
    font-size: 0.92rem;
    margin-bottom: 0.35rem;
}

.metric-value {
    color: #11243a;
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.15;
}

.metric-note {
    color: #5f7389;
    font-size: 0.85rem;
    margin-top: 0.4rem;
}

.section-title {
    color: #16324f;
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0.5rem 0 0.8rem 0;
}

.stButton > button {
    width: 100%;
    height: 42px;
    border-radius: 12px;
    background-color: #2563EB;
    color: white;
    font-weight: 700;
    border: none;
}

.stButton > button:hover {
    background-color: #1D4ED8;
    color: white;
}
</style>
""", unsafe_allow_html=True)


# ─── Helpers ───────────────────────────────────────────────────────

def metric_card(label: str, value: str, note: str = ""):
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">{label}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-note">{note}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


@st.cache_data(show_spinner=False, ttl=3600)
def cached_run_agent(ticker, start_date, end_date, strategy, cost):
    return run_trading_agent(
        ticker=ticker,
        start_date=start_date,
        end_date=end_date,
        strategy_name=strategy,
        transaction_cost=cost,
    )


# ─── Hero ──────────────────────────────────────────────────────────

st.markdown(
    """
    <div class="hero">
        <h1>Trading Agent for US Stocks and ETFs</h1>
        <p>Tool-based quantitative analysis with cache, fallback data loading, risk control, and backtesting.</p>
    </div>
    """,
    unsafe_allow_html=True,
)


# ─── Sidebar ───────────────────────────────────────────────────────

with st.sidebar:
    st.header("Configuration")

    ticker = st.selectbox("Ticker", ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"])
    start_date = st.text_input("Start Date", "2020-01-01")
    end_date = st.text_input("End Date", "2024-12-31")
    strategy = st.selectbox("Strategy", ["auto", "ma", "rsi", "momentum"])

    cost = st.number_input(
        "Transaction Cost",
        min_value=0.0,
        max_value=0.01,
        value=0.001,
        step=0.0005,
        format="%.4f"
    )

    st.caption("Data cache: data/cache/")
    run_button = st.button("Run Agent")

    if st.button("Clear Data Cache"):
        cache_dir = Path("data/cache")
        if cache_dir.exists():
            shutil.rmtree(cache_dir)
        st.success("Data cache cleared.")


# ─── Main ──────────────────────────────────────────────────────────

if run_button:
    try:
        with st.spinner("Running trading agent..."):
            output = cached_run_agent(
                ticker,
                start_date,
                end_date,
                strategy,
                cost,
            )

        result = output["backtest_result"]
        decision = output["decision"]
        selected_strategy = output["strategy"]
        decision_text = decision["decision"]
        confidence = decision["confidence"]

        st.toast("Agent finished successfully.", icon="✅")

        # Decision summary cards
        st.markdown('<div class="section-title">Decision Summary</div>', unsafe_allow_html=True)
        col1, col2, col3 = st.columns(3)

        with col1:
            metric_card("Decision", decision_text, f"Confidence: {confidence}")

        with col2:
            metric_card("Selected Strategy", selected_strategy.upper(), "Auto-selected by score")

        with col3:
            metric_card("Sharpe Ratio", f"{result['sharpe_ratio']:.2f}", "Risk-adjusted return")

        # Backtest metrics
        st.markdown('<div class="section-title">Backtest Metrics</div>', unsafe_allow_html=True)
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Return", f"{result['total_return']:.2%}")
        c2.metric("Annual Return", f"{result['annual_return']:.2%}")
        c3.metric("Sharpe Ratio", f"{result['sharpe_ratio']:.2f}")
        c4.metric("Max Drawdown", f"{result['max_drawdown']:.2%}")

        c5, c6, c7, c8 = st.columns(4)
        c5.metric("Benchmark Return", f"{result['benchmark_total_return']:.2%}")
        c6.metric("Benchmark MDD", f"{result['benchmark_max_drawdown']:.2%}")
        c7.metric("Win Rate", f"{result['win_rate']:.2%}")
        c8.metric("Trades", f"{result['number_of_trades']}")

        # Charts
        st.markdown("### Charts")

        tab1, tab2, tab3 = st.tabs([
            "Equity Curve",
            "Drawdown",
            "Price & MA",
        ])

        with tab1:
            st.plotly_chart(
                make_equity_curve_fig(result["data"], ticker),
                use_container_width=True,
            )

        with tab2:
            st.plotly_chart(
                make_drawdown_fig(result["data"], ticker),
                use_container_width=True,
            )

        with tab3:
            st.plotly_chart(
                make_price_ma_fig(output["data"], ticker),
                use_container_width=True,
            )

        # Agent Report
        st.markdown("### Agent Report")
        with st.container(border=True):
            st.markdown(output["report"])

    except Exception as exc:
        error_msg = str(exc)

        if "download" in error_msg.lower() or "failed" in error_msg.lower():
            st.error("Price data loading failed.")
            st.info("Check network connection or use cached CSV files in data/cache/.")
        else:
            st.error("Agent failed to run.")

        st.warning(error_msg)
        st.stop()

else:
    st.markdown(
        """
        <div class="metric-card">
            <div class="metric-label">Ready</div>
            <div class="metric-value">Select a ticker and run the agent.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
