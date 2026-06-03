# Trading Agent 工程实现细节精简版

## 1. 项目结构

```text
trading_agent/
├── app.py
├── main.py
├── requirements.txt
├── configs/
│   ├── default_config.yaml
│   └── strategy_config.yaml
├── agent/
│   ├── trading_agent.py
│   ├── intent_parser.py
│   └── prompt_template.py
├── tools/
│   ├── data_tool.py
│   ├── indicator_tool.py
│   ├── strategy_tool.py
│   ├── risk_tool.py
│   ├── backtest_tool.py
│   ├── chart_tool.py
│   └── report_tool.py
├── outputs/
│   ├── charts/
│   ├── reports/
│   └── results/
└── tests/
    ├── test_data_tool.py
    ├── test_indicator_tool.py
    ├── test_strategy_tool.py
    └── test_backtest_tool.py
```

---

## 2. 依赖

```txt
pandas
numpy
yfinance
matplotlib
streamlit
pyyaml
openai
scipy
```

安装：

```bash
pip install -r requirements.txt
```

运行命令行版：

```bash
python main.py --ticker QQQ --start 2020-01-01 --end 2024-12-31 --strategy auto
```

运行 Web 版：

```bash
streamlit run app.py
```

---

## 3. 配置文件

### configs/default_config.yaml

```yaml
data:
  default_start_date: "2020-01-01"
  default_end_date: "2024-12-31"
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

### configs/strategy_config.yaml

```yaml
moving_average:
  short_window: 20
  long_window: 60

rsi:
  window: 14
  buy_threshold: 30
  sell_threshold: 70

momentum:
  lookback_window: 20
```

---

## 4. Data Tool

文件：

```text
tools/data_tool.py
```

功能：

```text
ticker + date range → OHLCV DataFrame
```

核心接口：

```python
def get_price_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame
```

实现：

```python
import yfinance as yf
import pandas as pd

def get_price_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    data = yf.download(ticker, start=start_date, end=end_date, auto_adjust=True)

    if data.empty:
        raise ValueError(f"No data found for ticker: {ticker}")

    data = data.reset_index()
    data = data.rename(columns={
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume"
    })

    data = data[["date", "open", "high", "low", "close", "volume"]]
    data = data.dropna().reset_index(drop=True)
    return data
```

输出字段：

```text
date, open, high, low, close, volume
```

---

## 5. Indicator Tool

文件：

```text
tools/indicator_tool.py
```

功能：

```text
OHLCV → OHLCV + 技术指标
```

核心接口：

```python
def add_technical_indicators(data: pd.DataFrame) -> pd.DataFrame
```

指标：

```text
daily_return
ma20
ma60
rsi
macd
macd_signal
volatility_20d
return_20d
```

实现：

```python
import pandas as pd
import numpy as np

def calculate_rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()

    rs = avg_gain / avg_loss
    return 100 - 100 / (1 + rs)

def add_technical_indicators(data: pd.DataFrame) -> pd.DataFrame:
    data = data.copy()

    data["daily_return"] = data["close"].pct_change()
    data["ma20"] = data["close"].rolling(20).mean()
    data["ma60"] = data["close"].rolling(60).mean()

    data["rsi"] = calculate_rsi(data["close"], 14)

    ema12 = data["close"].ewm(span=12, adjust=False).mean()
    ema26 = data["close"].ewm(span=26, adjust=False).mean()
    data["macd"] = ema12 - ema26
    data["macd_signal"] = data["macd"].ewm(span=9, adjust=False).mean()

    data["volatility_20d"] = data["daily_return"].rolling(20).std() * np.sqrt(252)
    data["return_20d"] = data["close"].pct_change(20)

    return data.dropna().reset_index(drop=True)
```

---

## 6. Strategy Tool

文件：

```text
tools/strategy_tool.py
```

信号定义：

```text
1 = long
0 = cash
```

核心接口：

```python
def generate_signal(data: pd.DataFrame, strategy_name: str) -> pd.Series
```

实现：

```python
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
```

策略规则：

```text
ma:       ma20 > ma60 → long, else cash
rsi:      rsi < 30 → long, rsi > 70 → cash, else keep previous
momentum: return_20d > 0 → long, else cash
```

---

## 7. Risk Tool

文件：

```text
tools/risk_tool.py
```

核心接口：

```python
def apply_risk_control(
    data: pd.DataFrame,
    signal: pd.Series,
    volatility_threshold: float = 0.45,
    stop_loss: float = -0.08
) -> pd.Series
```

实现：

```python
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
```

---

## 8. Backtest Tool

文件：

```text
tools/backtest_tool.py
```

核心接口：

```python
def run_backtest(
    data: pd.DataFrame,
    signal: pd.Series,
    transaction_cost: float = 0.001
) -> dict
```

关键原则：

```python
position = signal.shift(1)
strategy_return = position * daily_return
```

必须用昨日信号计算今日收益，避免未来函数。

实现：

```python
import numpy as np
import pandas as pd

def calculate_max_drawdown(curve: pd.Series) -> float:
    running_max = curve.cummax()
    drawdown = curve / running_max - 1
    return drawdown.min()

def run_backtest(
    data: pd.DataFrame,
    signal: pd.Series,
    transaction_cost: float = 0.001
) -> dict:
    data = data.copy()
    data["signal"] = signal

    data["daily_return"] = data["close"].pct_change()
    data["position"] = data["signal"].shift(1).fillna(0)

    data["trade"] = data["position"].diff().abs().fillna(0)
    data["strategy_return"] = data["position"] * data["daily_return"]
    data["strategy_return"] -= data["trade"] * transaction_cost

    data["benchmark_return"] = data["daily_return"]
    data = data.dropna().reset_index(drop=True)

    data["strategy_curve"] = (1 + data["strategy_return"]).cumprod()
    data["benchmark_curve"] = (1 + data["benchmark_return"]).cumprod()

    total_return = data["strategy_curve"].iloc[-1] - 1
    benchmark_total_return = data["benchmark_curve"].iloc[-1] - 1

    annual_return = data["strategy_curve"].iloc[-1] ** (252 / len(data)) - 1
    annual_volatility = data["strategy_return"].std() * np.sqrt(252)
    sharpe_ratio = 0 if annual_volatility == 0 else annual_return / annual_volatility

    max_drawdown = calculate_max_drawdown(data["strategy_curve"])
    benchmark_max_drawdown = calculate_max_drawdown(data["benchmark_curve"])

    win_rate = (data["strategy_return"] > 0).mean()
    number_of_trades = int(data["trade"].sum())

    return {
        "data": data,
        "total_return": total_return,
        "benchmark_total_return": benchmark_total_return,
        "annual_return": annual_return,
        "annual_volatility": annual_volatility,
        "sharpe_ratio": sharpe_ratio,
        "max_drawdown": max_drawdown,
        "benchmark_max_drawdown": benchmark_max_drawdown,
        "win_rate": win_rate,
        "number_of_trades": number_of_trades
    }
```

输出指标：

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

## 9. Auto Strategy Selector

文件：

```text
agent/trading_agent.py
```

核心接口：

```python
def select_best_strategy(
    data: pd.DataFrame,
    strategies: list[str],
    transaction_cost: float = 0.001
) -> tuple[str, pd.Series, dict]
```

评分函数：

```text
score = sharpe_ratio + annual_return + max_drawdown - 0.001 * number_of_trades
if max_drawdown < -0.40: score -= 1.0
```

实现：

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

## 10. Report Tool

文件：

```text
tools/report_tool.py
```

核心接口：

```python
def make_final_decision(latest_signal: int, result: dict) -> dict
def generate_report(ticker: str, strategy_name: str, latest_signal: int, result: dict, decision_result: dict) -> str
```

决策规则：

```text
Buy High:
latest_signal == 1
sharpe_ratio > 1.0
max_drawdown > -0.25
total_return > benchmark_total_return

Buy Medium:
latest_signal == 1
sharpe_ratio > 0.5
max_drawdown > -0.35

Else:
Hold Low
```

实现：

```python
def make_final_decision(latest_signal: int, result: dict) -> dict:
    sharpe = result["sharpe_ratio"]
    max_dd = result["max_drawdown"]
    total_ret = result["total_return"]
    bench_ret = result["benchmark_total_return"]

    if latest_signal == 1 and sharpe > 1.0 and max_dd > -0.25 and total_ret > bench_ret:
        return {"decision": "Buy", "confidence": "High"}

    if latest_signal == 1 and sharpe > 0.5 and max_dd > -0.35:
        return {"decision": "Buy", "confidence": "Medium"}

    return {"decision": "Hold", "confidence": "Low"}

def generate_report(ticker, strategy_name, latest_signal, result, decision_result) -> str:
    latest_position = "Long" if latest_signal == 1 else "Cash"

    return f"""# Trading Agent Report: {ticker}

## Final Decision
- Decision: {decision_result["decision"]}
- Confidence: {decision_result["confidence"]}

## Strategy
- Selected Strategy: {strategy_name}
- Latest Signal: {latest_position}

## Backtest
- Total Return: {result["total_return"]:.2%}
- Benchmark Total Return: {result["benchmark_total_return"]:.2%}
- Annual Return: {result["annual_return"]:.2%}
- Annual Volatility: {result["annual_volatility"]:.2%}
- Sharpe Ratio: {result["sharpe_ratio"]:.2f}
- Max Drawdown: {result["max_drawdown"]:.2%}
- Benchmark Max Drawdown: {result["benchmark_max_drawdown"]:.2%}
- Win Rate: {result["win_rate"]:.2%}
- Number of Trades: {result["number_of_trades"]}

## Risk Notice
This result is based on historical backtesting and is for educational use only. It is not financial advice.
"""
```

---

## 11. Chart Tool

文件：

```text
tools/chart_tool.py
```

核心接口：

```python
def plot_price_with_ma(data, ticker, save_path)
def plot_equity_curve(backtest_data, ticker, save_path)
def plot_drawdown(backtest_data, ticker, save_path)
```

实现：

```python
import matplotlib.pyplot as plt

def plot_price_with_ma(data, ticker, save_path):
    plt.figure(figsize=(10, 5))
    plt.plot(data["date"], data["close"], label="Close")
    plt.plot(data["date"], data["ma20"], label="MA20")
    plt.plot(data["date"], data["ma60"], label="MA60")
    plt.title(f"{ticker} Price with MA")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

def plot_equity_curve(backtest_data, ticker, save_path):
    plt.figure(figsize=(10, 5))
    plt.plot(backtest_data["date"], backtest_data["strategy_curve"], label="Strategy")
    plt.plot(backtest_data["date"], backtest_data["benchmark_curve"], label="Buy-and-Hold")
    plt.title(f"{ticker} Strategy vs Benchmark")
    plt.xlabel("Date")
    plt.ylabel("Cumulative Return")
    plt.legend()
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

def plot_drawdown(backtest_data, ticker, save_path):
    curve = backtest_data["strategy_curve"]
    drawdown = curve / curve.cummax() - 1

    plt.figure(figsize=(10, 5))
    plt.plot(backtest_data["date"], drawdown, label="Drawdown")
    plt.title(f"{ticker} Drawdown")
    plt.xlabel("Date")
    plt.ylabel("Drawdown")
    plt.legend()
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
```

---

## 12. Agent Controller

文件：

```text
agent/trading_agent.py
```

核心接口：

```python
def run_trading_agent(
    ticker: str,
    start_date: str,
    end_date: str,
    strategy_name: str = "auto",
    transaction_cost: float = 0.001
) -> dict
```

完整流程：

```text
get_price_data
→ add_technical_indicators
→ generate_signal / select_best_strategy
→ apply_risk_control
→ run_backtest
→ make_final_decision
→ generate_report
→ return output
```

实现：

```python
from tools.data_tool import get_price_data
from tools.indicator_tool import add_technical_indicators
from tools.strategy_tool import generate_signal
from tools.risk_tool import apply_risk_control
from tools.backtest_tool import run_backtest
from tools.report_tool import make_final_decision, generate_report

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

## 13. Intent Parser

文件：

```text
agent/intent_parser.py
```

规则版实现：

```python
def parse_user_query(query: str) -> dict:
    q = query.upper()
    tickers = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"]

    ticker = next((t for t in tickers if t in q), "QQQ")

    if "RSI" in q:
        strategy = "rsi"
    elif "MOMENTUM" in q:
        strategy = "momentum"
    elif "MA" in q or "MOVING" in q:
        strategy = "ma"
    else:
        strategy = "auto"

    return {
        "ticker": ticker,
        "strategy": strategy,
        "start_date": "2020-01-01",
        "end_date": "2024-12-31"
    }
```

LLM 版只替换该模块，其他工具不变。

---

## 14. main.py

```python
import argparse
from agent.trading_agent import run_trading_agent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", type=str, default="QQQ")
    parser.add_argument("--start", type=str, default="2020-01-01")
    parser.add_argument("--end", type=str, default="2024-12-31")
    parser.add_argument("--strategy", type=str, default="auto")
    parser.add_argument("--cost", type=float, default=0.001)
    args = parser.parse_args()

    output = run_trading_agent(
        ticker=args.ticker,
        start_date=args.start,
        end_date=args.end,
        strategy_name=args.strategy,
        transaction_cost=args.cost
    )

    print(output["report"])

if __name__ == "__main__":
    main()
```

---

## 15. app.py

```python
import streamlit as st
from agent.trading_agent import run_trading_agent

st.set_page_config(page_title="Trading Agent", layout="wide")
st.title("LLM-Based Trading Agent for US Stocks and ETFs")

ticker = st.sidebar.selectbox("Ticker", ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"])
start_date = st.sidebar.text_input("Start Date", "2020-01-01")
end_date = st.sidebar.text_input("End Date", "2024-12-31")
strategy = st.sidebar.selectbox("Strategy", ["auto", "ma", "rsi", "momentum"])
cost = st.sidebar.number_input("Transaction Cost", 0.0, 0.01, 0.001, 0.0005)

if st.sidebar.button("Run Agent"):
    output = run_trading_agent(ticker, start_date, end_date, strategy, cost)

    result = output["backtest_result"]
    decision = output["decision"]

    st.subheader("Final Decision")
    st.write(f"Decision: **{decision['decision']}**")
    st.write(f"Confidence: **{decision['confidence']}**")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Return", f"{result['total_return']:.2%}")
    c2.metric("Annual Return", f"{result['annual_return']:.2%}")
    c3.metric("Sharpe", f"{result['sharpe_ratio']:.2f}")
    c4.metric("Max Drawdown", f"{result['max_drawdown']:.2%}")

    st.subheader("Report")
    st.markdown(output["report"])
```

---

## 16. LLM Prompt

文件：

```text
agent/prompt_template.py
```

```python
SYSTEM_PROMPT = '''
You are a quantitative trading agent.

You do not directly predict stock prices.
You coordinate deterministic quantitative tools.

Workflow:
1. Parse ticker, date range and strategy.
2. Fetch historical price data.
3. Calculate technical indicators.
4. Generate trading signals.
5. Apply risk control.
6. Run backtesting.
7. Compare strategy with Buy-and-Hold.
8. Generate final report.

Always include risk disclosure.
The result is for educational use only and is not financial advice.
'''
```

---

## 17. 测试重点

### test_data_tool.py

```text
输入 QQQ, 2020-01-01, 2024-12-31
检查 DataFrame 非空
检查字段包含 date/open/high/low/close/volume
```

### test_indicator_tool.py

```text
检查 ma20、ma60、rsi、macd、volatility_20d、return_20d 是否存在
检查 dropna 后没有空值
```

### test_strategy_tool.py

```text
检查 signal 只包含 0 和 1
检查长度等于 data 长度
```

### test_backtest_tool.py

```text
检查 result 包含 total_return、sharpe_ratio、max_drawdown
检查 strategy_curve 最后一项非空
检查 position 使用 signal.shift(1)
```

---

## 18. 最小实现顺序

```text
1. data_tool.py
2. indicator_tool.py
3. strategy_tool.py
4. backtest_tool.py
5. risk_tool.py
6. report_tool.py
7. trading_agent.py
8. main.py
9. app.py
10. chart_tool.py
11. intent_parser.py / LLM 接入
```

---

## 19. MVP 完成标准

```text
输入：
ticker = QQQ
date = 2020-01-01 到 2024-12-31
strategy = auto

输出：
1. 自动选择 ma / rsi / momentum 中的一个策略
2. 输出 Buy / Hold
3. 输出 total_return、annual_return、sharpe、max_drawdown
4. 输出与 Buy-and-Hold 对比
5. 生成 Markdown 报告
6. Streamlit 页面可展示
```
