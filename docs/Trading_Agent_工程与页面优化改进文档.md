# Trading Agent 工程与页面优化改进文档

## 1. 改进目标

```text
P0: 数据稳定、错误可控、页面不暴露 traceback
P1: 数据缓存、Agent 流程固定、结果可复现
P2: 页面卡片化、图表化、报告区美化
```

---

# A. 工程改进

## 2. 推荐项目结构

```text
trading_agent/
├── app.py
├── main.py
├── requirements.txt
├── data/
│   └── cache/
│       ├── SPY.csv
│       ├── QQQ.csv
│       └── ...
├── configs/
│   ├── default_config.yaml
│   └── strategy_config.yaml
├── agent/
│   ├── __init__.py
│   ├── trading_agent.py
│   ├── intent_parser.py
│   └── prompt_template.py
├── tools/
│   ├── __init__.py
│   ├── data_tool.py
│   ├── indicator_tool.py
│   ├── strategy_tool.py
│   ├── risk_tool.py
│   ├── backtest_tool.py
│   ├── chart_tool.py
│   └── report_tool.py
├── outputs/
│   ├── reports/
│   ├── charts/
│   ├── results/
│   └── logs/
└── tests/
    ├── test_data_tool.py
    ├── test_indicator_tool.py
    ├── test_strategy_tool.py
    └── test_backtest_tool.py
```

---

## 3. requirements.txt

```txt
pandas
numpy
yfinance
matplotlib
streamlit
pyyaml
scipy
```

暂时不强制接  API。工程版先使用：

```text
Rule-based Agent + Quantitative Tools
```

---

## 4. 配置文件

### configs/default_config.yaml

```yaml
data:
  default_start_date: "2020-01-01"
  default_end_date: "2024-12-31"
  cache_dir: "data/cache"
  supported_tickers: [SPY, QQQ, AAPL, MSFT, NVDA, TSLA]

backtest:
  trading_days: 252
  transaction_cost: 0.001

risk:
  volatility_threshold: 0.45
  stop_loss: -0.08
  max_drawdown_warning: -0.30

strategy:
  default_strategy: auto
  available_strategies: [ma, rsi, momentum]
```

---

## 5. 数据缓存机制

### 5.1 目标逻辑

```text
输入 ticker + start_date + end_date
↓
检查 data/cache/{ticker}.csv
↓
如果缓存覆盖查询区间：直接读取本地
↓
如果缓存不存在：下载完整区间并保存
↓
如果缓存存在但区间不足：只下载缺失部分
↓
合并、去重、排序、保存
↓
返回目标区间数据
```

---

## 6. 替换 tools/data_tool.py

```python
from pathlib import Path
import pandas as pd
import yfinance as yf


def normalize_price_data(data: pd.DataFrame) -> pd.DataFrame:
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    if data.index.name == "Date" or "Date" in data.index.names:
        data = data.reset_index()
    else:
        data = data.copy()

    data.columns = [
        str(c).lower().replace(" ", "_").strip()
        for c in data.columns
    ]

    if "datetime" in data.columns and "date" not in data.columns:
        data = data.rename(columns={"datetime": "date"})

    if "adj_close" in data.columns and "close" not in data.columns:
        data["close"] = data["adj_close"]

    required = ["date", "open", "high", "low", "close", "volume"]
    missing = [c for c in required if c not in data.columns]

    if missing:
        raise ValueError(
            f"Missing columns: {missing}. Current columns: {list(data.columns)}"
        )

    data = data[required].dropna()
    data["date"] = pd.to_datetime(data["date"]).dt.tz_localize(None)
    data = data.sort_values("date").drop_duplicates("date")

    return data.reset_index(drop=True)


def load_cached_data(cache_path: Path) -> pd.DataFrame | None:
    if not cache_path.exists():
        return None

    data = pd.read_csv(cache_path)
    if data.empty:
        return None

    return normalize_price_data(data)


def save_cached_data(data: pd.DataFrame, cache_path: Path) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    data = normalize_price_data(data)
    data.to_csv(cache_path, index=False)


def download_price_data(
    ticker: str,
    start: pd.Timestamp,
    end: pd.Timestamp
) -> pd.DataFrame:
    data = yf.download(
        ticker,
        start=start.strftime("%Y-%m-%d"),
        end=(end + pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
        auto_adjust=True,
        progress=False,
        threads=False
    )

    if data is None or data.empty:
        raise ValueError(
            f"Download failed for {ticker}: {start.date()} to {end.date()}"
        )

    return normalize_price_data(data)


def get_price_data(
    ticker: str,
    start_date: str,
    end_date: str,
    cache_dir: str = "data/cache"
) -> pd.DataFrame:
    ticker = ticker.upper().strip()
    start = pd.to_datetime(start_date).tz_localize(None)
    end = pd.to_datetime(end_date).tz_localize(None)

    if start > end:
        raise ValueError("start_date must be earlier than end_date.")

    cache_path = Path(cache_dir) / f"{ticker}.csv"
    cached = load_cached_data(cache_path)

    if cached is None or cached.empty:
        merged = download_price_data(ticker, start, end)
        save_cached_data(merged, cache_path)
    else:
        cached_start = cached["date"].min()
        cached_end = cached["date"].max()
        parts = [cached]

        if start < cached_start:
            left_end = cached_start - pd.Timedelta(days=1)
            left_data = download_price_data(ticker, start, left_end)
            parts.append(left_data)

        if end > cached_end:
            right_start = cached_end + pd.Timedelta(days=1)
            right_data = download_price_data(ticker, right_start, end)
            parts.append(right_data)

        merged = pd.concat(parts, ignore_index=True)
        merged = normalize_price_data(merged)
        save_cached_data(merged, cache_path)

    final_data = load_cached_data(cache_path)
    result = final_data[
        (final_data["date"] >= start) &
        (final_data["date"] <= end)
    ].copy()

    if result.empty:
        raise ValueError(
            f"No available data for {ticker}: {start_date} to {end_date}"
        )

    return result.reset_index(drop=True)
```

---

## 7. 数据调试脚本

新增 `debug_data.py`：

```python
from tools.data_tool import get_price_data

if __name__ == "__main__":
    data = get_price_data(
        ticker="SPY",
        start_date="2020-01-01",
        end_date="2024-12-31"
    )

    print(data.head())
    print(data.tail())
    print(data.shape)
    print(data.columns)
```

运行：

```bash
python debug_data.py
```

通过标准：

```text
1. 输出非空 DataFrame
2. 字段包含 date/open/high/low/close/volume
3. 自动生成 data/cache/SPY.csv
```

---

## 8. Agent Controller 改进

替换 `agent/trading_agent.py`：

```python
from tools.data_tool import get_price_data
from tools.indicator_tool import add_technical_indicators
from tools.strategy_tool import generate_signal
from tools.risk_tool import apply_risk_control
from tools.backtest_tool import run_backtest
from tools.report_tool import make_final_decision, generate_report


def select_best_strategy(data, strategies, transaction_cost=0.001):
    best_strategy = None
    best_signal = None
    best_result = None
    best_score = -999

    for strategy_name in strategies:
        raw_signal = generate_signal(data, strategy_name)
        final_signal = apply_risk_control(data, raw_signal)
        result = run_backtest(data, final_signal, transaction_cost)

        score = (
            result["sharpe_ratio"]
            + result["annual_return"]
            + result["max_drawdown"]
            - 0.001 * result["number_of_trades"]
        )

        if result["max_drawdown"] < -0.40:
            score -= 1.0

        if score > best_score:
            best_score = score
            best_strategy = strategy_name
            best_signal = final_signal
            best_result = result

    return best_strategy, best_signal, best_result


def run_trading_agent(
    ticker: str,
    start_date: str,
    end_date: str,
    strategy_name: str = "auto",
    transaction_cost: float = 0.001
) -> dict:
    raw_data = get_price_data(ticker, start_date, end_date)
    data = add_technical_indicators(raw_data)

    if strategy_name == "auto":
        strategy_name, final_signal, result = select_best_strategy(
            data=data,
            strategies=["ma", "rsi", "momentum"],
            transaction_cost=transaction_cost
        )
    else:
        raw_signal = generate_signal(data, strategy_name)
        final_signal = apply_risk_control(data, raw_signal)
        result = run_backtest(data, final_signal, transaction_cost)

    latest_signal = int(final_signal.iloc[-1])
    decision_result = make_final_decision(latest_signal, result)

    report = generate_report(
        ticker=ticker,
        strategy_name=strategy_name,
        latest_signal=latest_signal,
        result=result,
        decision_result=decision_result
    )

    return {
        "ticker": ticker,
        "strategy": strategy_name,
        "data": data,
        "signal": final_signal,
        "backtest_result": result,
        "decision": decision_result,
        "report": report
    }
```

---

## 9. 异常处理改进

页面端统一处理异常，不直接暴露 traceback。

```python
try:
    output = run_trading_agent(...)
except Exception as e:
    st.error("Agent failed to run.")
    st.warning(str(e))
```

推荐错误提示：

```text
数据下载失败 → 检查网络或使用本地缓存
日期不合法 → 检查 Start Date / End Date
策略不支持 → 检查 Strategy 参数
数据为空 → 更换 ticker 或日期区间
```

---

## 10. 日志系统

新增 `utils/logger.py`：

```python
import logging
from pathlib import Path


def get_logger(name: str = "trading_agent"):
    Path("outputs/logs").mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    file_handler = logging.FileHandler("outputs/logs/app.log", encoding="utf-8")
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    return logger
```

使用：

```python
from utils.logger import get_logger

logger = get_logger()
logger.info(f"Run agent: ticker={ticker}, strategy={strategy_name}")
```

---

# B. 页面美工改进

## 11. 页面设计规范

### 11.1 颜色

```text
Background: #F8FAFC
Sidebar:    #F1F5F9
Card:       #FFFFFF
Text Main:  #111827
Text Sub:   #6B7280
Border:     #E5E7EB
Accent:     #2563EB
Success:    #059669
Warning:    #D97706
Danger:     #DC2626
```

### 11.2 布局

```text
Sidebar:
- Ticker
- Start Date
- End Date
- Strategy
- Transaction Cost
- Run Agent
- Clear Cache

Main:
- Title + Subtitle
- Decision Summary Cards
- Backtest Metric Cards
- Chart Tabs
- Agent Report Card
```

---

## 12. 替换版 app.py

```python
from pathlib import Path
import shutil
import streamlit as st

from agent.trading_agent import run_trading_agent
from tools.chart_tool import (
    make_equity_curve_fig,
    make_drawdown_fig,
    make_price_ma_fig
)


st.set_page_config(
    page_title="Trading Agent",
    page_icon="📈",
    layout="wide"
)

st.markdown("""
<style>
.stApp {
    background-color: #F8FAFC;
}

.block-container {
    padding-top: 2.2rem;
    padding-left: 3rem;
    padding-right: 3rem;
    max-width: 1280px;
}

section[data-testid="stSidebar"] {
    background-color: #F1F5F9;
    border-right: 1px solid #E5E7EB;
}

h1 {
    font-size: 36px !important;
    font-weight: 800 !important;
    color: #111827 !important;
    letter-spacing: -0.03em;
}

h2, h3 {
    color: #111827 !important;
    font-weight: 700 !important;
}

.app-subtitle {
    font-size: 15px;
    color: #6B7280;
    margin-top: -8px;
    margin-bottom: 24px;
}

.card {
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 18px;
    padding: 22px 24px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    margin-bottom: 18px;
}

.small-label {
    color: #6B7280;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.big-value {
    color: #111827;
    font-size: 28px;
    font-weight: 800;
}

.decision-buy {
    color: #059669;
    font-size: 32px;
    font-weight: 800;
}

.decision-hold {
    color: #D97706;
    font-size: 32px;
    font-weight: 800;
}

.decision-sell {
    color: #DC2626;
    font-size: 32px;
    font-weight: 800;
}

div[data-testid="stMetric"] {
    background-color: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 16px;
    padding: 18px 20px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
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

.error-box {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
    border-radius: 14px;
    padding: 16px 18px;
}
</style>
""", unsafe_allow_html=True)


st.title("LLM-Based Trading Agent")
st.markdown(
    "<div class='app-subtitle'>Quantitative analysis, risk control, and backtesting for US stocks and ETFs.</div>",
    unsafe_allow_html=True
)


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

    if st.button("Clear Cache"):
        cache_dir = Path("data/cache")
        if cache_dir.exists():
            shutil.rmtree(cache_dir)
        st.success("Cache cleared.")


if run_button:
    try:
        with st.spinner("Running trading agent..."):
            output = run_trading_agent(
                ticker=ticker,
                start_date=start_date,
                end_date=end_date,
                strategy_name=strategy,
                transaction_cost=cost
            )

        result = output["backtest_result"]
        decision = output["decision"]
        selected_strategy = output["strategy"]
        decision_text = decision["decision"]
        confidence = decision["confidence"]

        decision_class = "decision-buy"
        if decision_text.lower() == "hold":
            decision_class = "decision-hold"
        elif decision_text.lower() in ["sell", "avoid"]:
            decision_class = "decision-sell"

        st.toast("Agent finished successfully.", icon="✅")

        st.markdown("### Decision Summary")
        col_a, col_b, col_c = st.columns([1.2, 1, 1])

        with col_a:
            st.markdown(
                f"""
                <div class="card">
                    <div class="small-label">Final Decision</div>
                    <div class="{decision_class}">{decision_text}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        with col_b:
            st.markdown(
                f"""
                <div class="card">
                    <div class="small-label">Confidence</div>
                    <div class="big-value">{confidence}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        with col_c:
            st.markdown(
                f"""
                <div class="card">
                    <div class="small-label">Selected Strategy</div>
                    <div class="big-value">{selected_strategy.upper()}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        st.markdown("### Backtest Metrics")
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

        st.markdown("### Charts")
        tab1, tab2, tab3 = st.tabs(["Equity Curve", "Drawdown", "Price & MA"])

        with tab1:
            st.pyplot(make_equity_curve_fig(result["data"], ticker), use_container_width=True)

        with tab2:
            st.pyplot(make_drawdown_fig(result["data"], ticker), use_container_width=True)

        with tab3:
            st.pyplot(make_price_ma_fig(output["data"], ticker), use_container_width=True)

        st.markdown("### Agent Report")
        with st.container(border=True):
            st.markdown(output["report"])

    except Exception as e:
        st.markdown(
            f"""
            <div class="error-box">
                <b>Agent failed to run.</b><br>
                {str(e)}
            </div>
            """,
            unsafe_allow_html=True
        )
else:
    st.markdown(
        """
        <div class="card">
            <div class="small-label">Ready</div>
            <div class="big-value">Select a ticker and run the agent.</div>
        </div>
        """,
        unsafe_allow_html=True
    )
```

---

## 13. 替换 tools/chart_tool.py

```python
import matplotlib.pyplot as plt


def apply_chart_style(ax):
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(alpha=0.22)
    ax.tick_params(axis="both", labelsize=10)


def make_equity_curve_fig(backtest_data, ticker):
    fig, ax = plt.subplots(figsize=(10, 4.8))
    ax.plot(
        backtest_data["date"],
        backtest_data["strategy_curve"],
        linewidth=2.2,
        label="Strategy"
    )
    ax.plot(
        backtest_data["date"],
        backtest_data["benchmark_curve"],
        linewidth=2.2,
        linestyle="--",
        label="Buy-and-Hold"
    )
    ax.set_title(f"{ticker} Strategy vs Buy-and-Hold", fontsize=14, fontweight="bold")
    ax.set_xlabel("Date")
    ax.set_ylabel("Cumulative Return")
    ax.legend(frameon=False)
    apply_chart_style(ax)
    fig.tight_layout()
    return fig


def make_drawdown_fig(backtest_data, ticker):
    curve = backtest_data["strategy_curve"]
    drawdown = curve / curve.cummax() - 1

    fig, ax = plt.subplots(figsize=(10, 4.8))
    ax.plot(backtest_data["date"], drawdown, linewidth=2.0, label="Drawdown")
    ax.set_title(f"{ticker} Strategy Drawdown", fontsize=14, fontweight="bold")
    ax.set_xlabel("Date")
    ax.set_ylabel("Drawdown")
    ax.legend(frameon=False)
    apply_chart_style(ax)
    fig.tight_layout()
    return fig


def make_price_ma_fig(data, ticker):
    fig, ax = plt.subplots(figsize=(10, 4.8))
    ax.plot(data["date"], data["close"], linewidth=1.8, label="Close")
    ax.plot(data["date"], data["ma20"], linewidth=1.6, label="MA20")
    ax.plot(data["date"], data["ma60"], linewidth=1.6, label="MA60")
    ax.set_title(f"{ticker} Price with Moving Averages", fontsize=14, fontweight="bold")
    ax.set_xlabel("Date")
    ax.set_ylabel("Price")
    ax.legend(frameon=False)
    apply_chart_style(ax)
    fig.tight_layout()
    return fig
```

---

## 14. 页面交互改进

### 14.1 清理缓存按钮

```python
from pathlib import Path
import shutil

if st.sidebar.button("Clear Cache"):
    cache_dir = Path("data/cache")
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
    st.sidebar.success("Cache cleared.")
```

### 14.2 成功提示

```python
st.toast("Agent finished successfully.", icon="✅")
```

### 14.3 加载提示

```python
with st.spinner("Running trading agent..."):
    output = run_trading_agent(...)
```

---

# C. 实施顺序

## 15. 优先级

```text
P0:
1. 替换 data_tool.py
2. 新建 data/cache/
3. 运行 debug_data.py
4. app.py 增加 try/except
5. 隐藏 traceback

P1:
6. 替换 app.py 页面结构
7. 加 CSS
8. 加 Decision Summary 卡片
9. 加 Backtest Metrics 卡片
10. 替换 chart_tool.py
11. 加图表 Tab

P2:
12. 加 Clear Cache 按钮
13. 加日志系统
14. 保存回测结果到 outputs/results/
15. 保存报告到 outputs/reports/
```

---

## 16. 完成标准

```text
1. 第一次查询 SPY 会下载并生成 data/cache/SPY.csv
2. 第二次查询 SPY 不再下载，直接读取缓存
3. 查询更大日期范围时只下载缺失部分
4. 页面不再出现红色 traceback
5. 页面展示 Decision / Confidence / Strategy 三个卡片
6. 页面展示 8 个回测指标
7. 页面展示 Equity Curve / Drawdown / Price & MA 三个图表
8. Agent Report 显示在独立报告区域
```

---

## 17. API 策略

当前阶段不接 API。

工程主流程保持：

```text
Ticker Input
→ Cached Price Data
→ Technical Indicators
→ Strategy Signal
→ Risk Control
→ Backtest
→ Final Decision
→ Report
```

后续可选接 API，只用于：

```text
1. 自然语言解析
2. 报告润色
3. Positive Evidence / Risk Evidence 总结
```

不要让 API 做：

```text
1. 下载数据
2. 计算指标
3. 回测
4. 生成收益率
5. 直接预测买卖
```
