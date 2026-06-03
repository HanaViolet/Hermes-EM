# Trading Agent 技术改进细节文档

## 1. 改进范围

```text
只改技术实现：
1. 数据下载模块
2. 本地缓存机制
3. 多数据源 fallback
4. OHLCV 标准化
5. Streamlit 运行缓存
6. 异常处理
7. 回测结果缓存
8. 页面图表与状态展示
9. 工程目录重构
```

---

# 2. 当前问题

## 2.1 yfinance 单点依赖

当前项目如果只使用：

```python
yf.download(...)
```

容易出现：

```text
YFRateLimitError: Too Many Requests
No data found for ticker
Network timeout
Empty DataFrame
```

技术原因：

```text
1. Streamlit 每次交互可能触发重新运行
2. 同一个 ticker 被重复请求
3. 多 ticker 同时下载时请求频率过高
4. yfinance 对 Yahoo Finance 的封装不稳定
5. 没有本地缓存导致每次都访问网络
```

---

## 2.2 当前下载层缺陷

```text
1. 只依赖 yfinance
2. 缺少 fallback 数据源
3. 缺少缓存覆盖范围判断
4. 缺少日期切片逻辑
5. 缺少下载失败后的降级策略
6. 缺少 OHLCV 字段统一
7. 页面层缺少 st.cache_data
```

---

# 3. 技术改进总方案

## 3.1 数据层改成三层结构

```text
Layer 1: Local Cache
    data/cache/{TICKER}.csv

Layer 2: Primary Downloader
    Yahoo Chart API

Layer 3: Fallback Downloader
    Stooq CSV API
```

执行顺序：

```text
get_price_data()
    ↓
read_cached_ohlcv()
    ↓
if cache usable:
    return sliced cache
else:
    download_from_yahoo_chart()
        if failed:
            download_from_stooq_csv()
    ↓
normalize_ohlcv()
    ↓
merge with old cache
    ↓
write_cached_ohlcv()
    ↓
return requested date range
```

---

# 4. 目录结构调整

```text
trading_agent/
├── app.py
├── main.py
├── requirements.txt
│
├── data/
│   └── cache/
│       ├── SPY.csv
│       ├── QQQ.csv
│       ├── AAPL.csv
│       ├── MSFT.csv
│       ├── NVDA.csv
│       └── TSLA.csv
│
├── agent/
│   ├── trading_agent.py
│   └── intent_parser.py
│
├── tools/
│   ├── data_tool.py
│   ├── indicator_tool.py
│   ├── strategy_tool.py
│   ├── risk_tool.py
│   ├── backtest_tool.py
│   ├── chart_tool.py
│   └── report_tool.py
│
├── outputs/
│   ├── charts/
│   ├── reports/
│   ├── results/
│   └── logs/
│
└── tests/
    ├── test_data_tool.py
    ├── test_indicator_tool.py
    ├── test_strategy_tool.py
    └── test_backtest_tool.py
```

---

# 5. 数据缓存机制

## 5.1 缓存文件格式

路径：

```text
data/cache/{TICKER}.csv
```

示例：

```text
data/cache/SPY.csv
data/cache/AAPL.csv
```

字段：

```text
date, open, high, low, close, volume
```

---

## 5.2 缓存读取逻辑

```python
def read_cached_ohlcv(ticker: str) -> pd.DataFrame | None:
    cache_path = DATA_CACHE_DIR / f"{ticker}.csv"

    if not cache_path.exists():
        return None

    df = pd.read_csv(cache_path)

    if df.empty:
        return None

    return normalize_ohlcv(df)
```

---

## 5.3 缓存写入逻辑

```python
def write_cached_ohlcv(ticker: str, df: pd.DataFrame) -> None:
    DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = DATA_CACHE_DIR / f"{ticker}.csv"

    df = normalize_ohlcv(df)
    df.to_csv(cache_path, index=False)
```

---

## 5.4 日期区间切片

```python
def slice_ohlcv(df: pd.DataFrame, start, end) -> pd.DataFrame:
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    return df[
        (df["date"] >= start_ts) &
        (df["date"] <= end_ts)
    ].sort_values("date").reset_index(drop=True)
```

---

## 5.5 缓存覆盖判断

```python
def cache_covers_range(df: pd.DataFrame | None, start, end) -> bool:
    if df is None or df.empty:
        return False

    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    return (
        df["date"].min() <= start_ts and
        df["date"].max() >= end_ts - pd.Timedelta(days=7)
    )
```

说明：

```text
end_ts - 7 days 用于处理非交易日和节假日。
如果缓存最后日期距离查询结束日期不足 7 天，则认为可接受。
```

---

# 6. OHLCV 标准化

## 6.1 目标

所有外部数据源统一为：

```text
date, open, high, low, close, volume
```

下游指标、策略、回测模块不需要关心数据源差异。

---

## 6.2 标准化函数

```python
def normalize_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    if df.index.name in ["Date", "Datetime"] or "Date" in df.index.names:
        df = df.reset_index()

    df.columns = [
        str(c).lower().replace(" ", "_").strip()
        for c in df.columns
    ]

    rename_map = {
        "datetime": "date",
        "adj_close": "close",
    }

    df = df.rename(columns=rename_map)

    required = ["date", "open", "high", "low", "close", "volume"]
    missing = [c for c in required if c not in df.columns]

    if missing:
        raise ValueError(
            f"Missing OHLCV columns: {missing}. Current columns: {list(df.columns)}"
        )

    df = df[required].dropna()
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.tz_localize(None)

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna()
    df = df.sort_values("date").drop_duplicates("date")

    return df.reset_index(drop=True)
```

---

# 7. Yahoo Chart API 下载器

## 7.1 改进点

```text
1. 不再直接使用 yfinance
2. 使用 requests 请求 Yahoo chart endpoint
3. 添加浏览器 User-Agent
4. query1 / query2 两个 host 兜底
5. 直接解析 JSON 中 quote 字段
6. 返回完整 OHLCV
```

---

## 7.2 请求头

```python
YAHOO_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}
```

---

## 7.3 下载函数

```python
def download_from_yahoo_chart(ticker: str, start, end) -> pd.DataFrame:
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    params = {
        "period1": int(start_ts.timestamp()),
        "period2": int((end_ts + pd.Timedelta(days=1)).timestamp()),
        "interval": "1d",
        "includeAdjustedClose": "true",
        "events": "div|split|capitalGains",
    }

    last_error = None

    for host in ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]:
        url = f"https://{host}/v8/finance/chart/{ticker}"

        try:
            response = requests.get(
                url,
                params=params,
                headers=YAHOO_HEADERS,
                timeout=20,
            )
            response.raise_for_status()

            payload = response.json()
            chart = payload.get("chart", {})
            result = (chart.get("result") or [None])[0]

            if result is None:
                raise ValueError(f"Yahoo returned no result for {ticker}.")

            timestamps = result.get("timestamp") or []

            quote = (
                result.get("indicators", {})
                .get("quote", [{}])[0]
            )

            if not timestamps or not quote:
                raise ValueError(f"Yahoo returned empty quote for {ticker}.")

            df = pd.DataFrame({
                "date": pd.to_datetime(timestamps, unit="s").normalize(),
                "open": quote.get("open"),
                "high": quote.get("high"),
                "low": quote.get("low"),
                "close": quote.get("close"),
                "volume": quote.get("volume"),
            })

            return normalize_ohlcv(df)

        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Yahoo chart API failed for {ticker}: {last_error}")
```

---

# 8. Stooq CSV fallback

## 8.1 改进点

```text
Yahoo 失败后自动切换 Stooq。
Stooq 使用 CSV 下载接口。
ticker 自动转换为 {TICKER}.US。
```

---

## 8.2 下载函数

```python
from io import StringIO

def download_from_stooq_csv(ticker: str, start, end) -> pd.DataFrame:
    stooq_ticker = ticker if ticker.endswith(".US") else f"{ticker}.US"

    response = requests.get(
        "https://stooq.com/q/d/l/",
        params={
            "s": stooq_ticker,
            "i": "d",
            "d1": pd.Timestamp(start).strftime("%Y%m%d"),
            "d2": pd.Timestamp(end).strftime("%Y%m%d"),
        },
        timeout=20,
    )
    response.raise_for_status()

    text = response.text.strip()

    if "apikey" in text.lower() or "get your apikey" in text.lower():
        raise ValueError("Stooq CSV download requires an API key.")

    df = pd.read_csv(StringIO(text))

    if df.empty:
        raise ValueError(f"Stooq returned empty data for {ticker}.")

    df = df.rename(columns={
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume",
    })

    return normalize_ohlcv(df)
```

---

# 9. 统一下载入口

## 9.1 多源 fallback

```python
def download_price_data(ticker: str, start, end) -> pd.DataFrame:
    errors = []

    for loader in [
        lambda: download_from_yahoo_chart(ticker, start, end),
        lambda: download_from_stooq_csv(ticker, start, end),
    ]:
        try:
            return loader()
        except Exception as exc:
            errors.append(str(exc))

    raise RuntimeError(
        f"{ticker} historical data download failed: {' | '.join(errors)}"
    )
```

---

# 10. get_price_data 最终接口

## 10.1 下游唯一调用接口

```python
def get_price_data(
    ticker: str,
    start_date: str,
    end_date: str,
    refresh_if_needed: bool = False,
) -> pd.DataFrame:
    ticker = ticker.upper().replace(".US", "").strip()

    start = pd.Timestamp(start_date)
    end = pd.Timestamp(end_date)

    if start > end:
        raise ValueError("start_date must be earlier than end_date.")

    cached = read_cached_ohlcv(ticker)

    if cached is not None and not cached.empty:
        cached_slice = slice_ohlcv(cached, start, end)

        if not cached_slice.empty and not refresh_if_needed:
            return cached_slice

        if cache_covers_range(cached, start, end):
            return cached_slice

    downloaded = download_price_data(ticker, start, end)

    if cached is not None and not cached.empty:
        merged = pd.concat([cached, downloaded], ignore_index=True)
    else:
        merged = downloaded

    merged = normalize_ohlcv(merged)
    write_cached_ohlcv(ticker, merged)

    result = slice_ohlcv(merged, start, end)

    if result.empty:
        raise ValueError(f"No available data for {ticker}: {start_date} to {end_date}")

    return result
```

---

# 11. 完整 data_tool.py 依赖

```python
from __future__ import annotations

from datetime import date, datetime
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
```

不再需要：

```python
import yfinance as yf
```

---

# 12. Streamlit 层缓存

## 12.1 问题

Streamlit 每次控件变化都会重新执行脚本。  
如果没有缓存，同一组参数会重复触发：

```text
数据读取
指标计算
策略生成
回测计算
报告生成
```

---

## 12.2 改进方案

在 `app.py` 加：

```python
@st.cache_data(show_spinner=False, ttl=3600)
def cached_run_agent(ticker, start_date, end_date, strategy, cost):
    return run_trading_agent(
        ticker=ticker,
        start_date=start_date,
        end_date=end_date,
        strategy_name=strategy,
        transaction_cost=cost,
    )
```

页面运行时：

```python
output = cached_run_agent(
    ticker,
    start_date,
    end_date,
    strategy,
    cost,
)
```

---

## 12.3 缓存失效策略

```text
ttl=3600:
同一组参数 1 小时内直接使用 Streamlit 缓存。

如果要强制刷新：
1. 改 ticker
2. 改日期
3. 改 strategy
4. 改 transaction cost
5. 手动 Clear Cache
```

---

# 13. app.py 异常处理

## 13.1 页面错误不要显示 traceback

替换为：

```python
try:
    output = cached_run_agent(
        ticker,
        start_date,
        end_date,
        strategy,
        cost,
    )
except Exception as exc:
    st.error("Agent failed to run.")
    st.warning(str(exc))
    st.stop()
```

---

## 13.2 下载错误提示

```python
except Exception as exc:
    error_msg = str(exc)

    if "download" in error_msg.lower() or "failed" in error_msg.lower():
        st.error("Price data loading failed.")
        st.info("Check network connection or use cached CSV files in data/cache/.")

    else:
        st.error("Agent failed to run.")

    st.warning(error_msg)
    st.stop()
```

---

# 14. 缓存清理按钮

## 14.1 app.py sidebar 加按钮

```python
from pathlib import Path
import shutil

if st.sidebar.button("Clear Data Cache"):
    cache_dir = Path("data/cache")
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
    st.sidebar.success("Data cache cleared.")
```

---

## 14.2 注意

```text
清理缓存后，下一次运行会重新下载数据。
答辩前不要清理缓存。
```

---

# 15. 回测结果缓存

## 15.1 目标

将每次回测曲线保存到本地，便于复现和调试。

---

## 15.2 文件命名

```python
def make_result_filename(ticker, strategy, start_date, end_date):
    return f"{ticker}_{strategy}_{start_date}_{end_date}.csv"
```

路径：

```text
outputs/results/{ticker}_{strategy}_{start}_{end}.csv
```

---

## 15.3 保存代码

```python
from pathlib import Path

def save_backtest_result(result: dict, ticker: str, strategy: str, start: str, end: str):
    output_dir = Path("outputs/results")
    output_dir.mkdir(parents=True, exist_ok=True)

    result_path = output_dir / f"{ticker}_{strategy}_{start}_{end}.csv"
    result["data"].to_csv(result_path, index=False)

    return result_path
```

---

# 16. 日志系统

## 16.1 新增 utils/logger.py

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

    file_handler = logging.FileHandler(
        "outputs/logs/app.log",
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    return logger
```

---

## 16.2 使用方式

```python
from utils.logger import get_logger

logger = get_logger()

logger.info(f"Run agent: ticker={ticker}, strategy={strategy_name}")
logger.info(f"Data loaded: rows={len(data)}")
logger.info(f"Backtest done: sharpe={result['sharpe_ratio']:.2f}")
```

---

# 17. 图表模块改进

## 17.1 当前问题

```text
1. matplotlib 默认图不够美观
2. 页面图表交互性弱
3. 策略曲线、回撤曲线、价格均线图没有分区展示
```

---

## 17.2 推荐使用 Plotly

新增：

```text
tools/chart_tool.py
```

---

## 17.3 Equity Curve

```python
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
```

---

## 17.4 Drawdown

```python
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
```

---

## 17.5 Price & MA

```python
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
```

---

# 18. app.py 图表展示

```python
from tools.chart_tool import (
    make_equity_curve_fig,
    make_drawdown_fig,
    make_price_ma_fig,
)

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
```

---

# 19. 页面样式改进

## 19.1 CSS

```python
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
</style>
""", unsafe_allow_html=True)
```

---

## 19.2 Hero 区域

```python
st.markdown(
    """
    <div class="hero">
        <h1>Trading Agent for US Stocks and ETFs</h1>
        <p>Tool-based quantitative analysis with cache, fallback data loading, risk control, and backtesting.</p>
    </div>
    """,
    unsafe_allow_html=True,
)
```

---

# 20. 指标卡片

```python
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
```

使用：

```python
col1, col2, col3 = st.columns(3)

with col1:
    metric_card("Decision", decision["decision"], f"Confidence: {decision['confidence']}")

with col2:
    metric_card("Selected Strategy", output["strategy"].upper(), "Auto-selected by score")

with col3:
    metric_card("Sharpe Ratio", f"{result['sharpe_ratio']:.2f}", "Risk-adjusted return")
```

---

# 21. Agent Controller 技术改进

## 21.1 固定返回结构

```python
return {
    "ticker": ticker,
    "strategy": strategy_name,
    "data": data,
    "signal": final_signal,
    "backtest_result": result,
    "decision": decision_result,
    "report": report,
}
```

---

## 21.2 auto 策略选择

```python
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
```

---

# 22. 回测模块技术检查

## 22.1 必须避免未来函数

正确：

```python
data["position"] = data["signal"].shift(1).fillna(0)
data["strategy_return"] = data["position"] * data["daily_return"]
```

错误：

```python
data["strategy_return"] = data["signal"] * data["daily_return"]
```

---

## 22.2 交易成本

```python
data["trade"] = data["position"].diff().abs().fillna(0)
data["strategy_return"] -= data["trade"] * transaction_cost
```

---

## 22.3 指标输出

```text
total_return
benchmark_total_return
annual_return
annual_volatility
sharpe_ratio
max_drawdown
benchmark_max_drawdown
win_rate
number_of_trades
```

---

# 23. 测试脚本

## 23.1 debug_data.py

```python
from tools.data_tool import get_price_data

for ticker in ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"]:
    data = get_price_data(ticker, "2020-01-01", "2024-12-31")
    print(ticker, data.shape, data["date"].min(), data["date"].max())
    print(data.head())
```

---

## 23.2 debug_agent.py

```python
from agent.trading_agent import run_trading_agent

output = run_trading_agent(
    ticker="QQQ",
    start_date="2020-01-01",
    end_date="2024-12-31",
    strategy_name="auto",
    transaction_cost=0.001,
)

print(output["strategy"])
print(output["decision"])
print(output["backtest_result"]["sharpe_ratio"])
print(output["report"])
```

---

# 24. requirements.txt 更新

```txt
pandas
numpy
requests
streamlit
plotly
pyyaml
scipy
```

移除：

```txt
yfinance
```

如果仍想保留 yfinance 作为第三 fallback，也可以保留：

```txt
yfinance
```

---

# 25. 实施顺序

```text
1. 替换 tools/data_tool.py
2. 新增 data/cache/
3. 运行 debug_data.py
4. 确认所有 ticker 可以生成缓存
5. app.py 增加 @st.cache_data
6. app.py 增加 try/except + st.stop()
7. chart_tool.py 改成 Plotly
8. app.py 加图表 tabs
9. app.py 加 CSS + metric card
10. 增加 outputs/results 回测结果缓存
11. 增加 outputs/logs 日志
```

---

# 26. 最终技术版本

```text
Data:
Local cache → Yahoo chart API → Stooq fallback

Agent:
Data → Indicator → Strategy → Risk Control → Backtest → Decision → Report

Frontend:
Streamlit cache → metric cards → Plotly charts → clean error handling

Storage:
data/cache/       保存行情数据
outputs/results/  保存回测曲线
outputs/reports/  保存报告
outputs/logs/     保存日志
```
