# algorithmic_trade：严格 Bug 修复与 LLM Agent 接入流程

## 0. 执行原则

本流程按优先级执行，不跳步。

```text
P0：先修会导致运行错误和数据不可信的 bug
P1：再修 Agent 主链路，让新模块真正参与决策
P2：再接 LLM Agent
P3：最后做 Room Modal 展示增强
```

禁止事项：

```text
[禁止] 在真实指标缺失时继续使用 RSI=56.3 / MACD=0 / Volatility=18.7 这类默认假值
[禁止] 让 LLM 直接输出最终 Buy / Sell / Hold
[禁止] 继续让房间点击走旧 asset-modal 文档列表逻辑
[禁止] 在 completed 后继续 update_workflow 到中间阶段
```

最终目标：

```text
真实数据流
  -> Regime 判断
  -> News LLM Agent
  -> Strategy Advisor
  -> Dynamic Risk
  -> Memory
  -> Score-based Decision
  -> Explain Agent
  -> Room Artifacts
  -> Room Modal
```

---

# 1. P0 Bug 修复流程

## 1.1 修复 `/api/trading/report/<task_id>` 路由

### 文件

```text
trading_server/app.py
```

### 当前问题

路由定义类似：

```python
@app.get("/api/trading/report/")
def trading_report(task_id: str):
    ...
```

Flask 路由没有 `<task_id>`，但函数参数需要 `task_id`，会导致访问报错。

### 修改

改成：

```python
@app.get("/api/trading/report/<task_id>")
def trading_report(task_id: str):
    report = REPORTS.get(task_id)
    if not report:
        return jsonify({"ok": False, "message": "Report not found"}), 404
    return jsonify({"ok": True, "task_id": task_id, "report": report})
```

如果你的报告存储不是 `REPORTS`，按现有变量名替换，但路由必须带 `<task_id>`。

### 验证

```bash
curl http://127.0.0.1:5000/api/trading/report/test_id
```

预期：

```json
{
  "ok": false,
  "message": "Report not found"
}
```

不能出现 500。

---

## 1.2 修复指标 key 大小写错误

### 文件

```text
trading_agent/agent/trading_agent.py
```

### 当前问题

指标字典通常是：

```python
{
    "rsi": ...,
    "macd": ...,
    "macd_signal": ...,
    "volatility_20d": ...
}
```

但流程日志中可能写成：

```python
indicator_metrics.get("RSI")
indicator_metrics.get("MACD")
```

这会取不到真实值。

### 修改

把所有大写 key 改成小写：

```python
summary=(
    f"Indicators: "
    f"RSI={indicator_metrics.get('rsi', 'N/A')}, "
    f"MACD={indicator_metrics.get('macd', 'N/A')}"
)
```

### 全局搜索

```bash
grep -R "get('RSI'\|get(\"RSI\|get('MACD'\|get(\"MACD" -n trading_agent trading_server
```

所有结果都要改成：

```python
get("rsi")
get("macd")
```

### 验证

运行一次任务，检查 telemetry / Room Modal：

```text
RSI 不应显示固定默认值
MACD 不应显示 N/A 或固定 0，除非真实计算结果就是 0
```

---

## 1.3 修复 completed 后阶段回退 bug

### 文件

```text
trading_agent/agent/trading_agent.py
```

### 当前问题

如果代码中先执行：

```python
update_workflow(
    global_status="done",
    current_stage="completed",
    progress=100,
)
```

后面又执行：

```python
update_workflow(
    current_stage="selecting_strategy",
    progress=48,
)
```

会导致最终状态变成：

```text
done + selecting_strategy + 48%
```

### 修改原则

所有阶段顺序必须是：

```text
loading_data
calculating_indicators
detecting_regime
analyzing_news
selecting_strategy
checking_risk
running_backtest
using_memory
making_decision
explaining_decision
writing_report
completed
```

`completed` 必须是最后一个 `update_workflow()`。

### 修改模板

```python
# 1. Load data
update_workflow(current_stage="loading_data", progress=10, ...)

# 2. Indicators
update_workflow(current_stage="calculating_indicators", progress=25, ...)

# 3. Regime
update_workflow(current_stage="detecting_regime", progress=35, ...)

# 4. News
update_workflow(current_stage="analyzing_news", progress=45, ...)

# 5. Strategy
update_workflow(current_stage="selecting_strategy", progress=55, ...)

# 6. Risk
update_workflow(current_stage="checking_risk", progress=65, ...)

# 7. Backtest
update_workflow(current_stage="running_backtest", progress=75, ...)

# 8. Decision
update_workflow(current_stage="making_decision", progress=88, ...)

# 9. Explain
update_workflow(current_stage="explaining_decision", progress=94, ...)

# 10. Completed
update_workflow(
    global_status="done",
    current_stage="completed",
    progress=100,
    ...
)
```

### 验证

任务完成后检查：

```json
{
  "global_status": "done",
  "current_stage": "completed",
  "progress": 100
}
```

不能回退。

---

## 1.4 修复 `_P2` 未定义

### 文件

```text
trading_agent/agent/trading_agent.py
```

### 当前问题

异常处理里如果出现：

```python
_err = _P2(__file__).resolve()...
```

`_P2` 未定义，异常处理会再次崩溃。

### 修改

文件顶部确保有：

```python
from pathlib import Path
```

把 `_P2` 替换为：

```python
_err = Path(__file__).resolve().parent.parent.parent / "trading_server" / "artifact_error.log"
```

### 验证

```bash
grep -R "_P2" -n .
```

预期无结果。

---

## 1.5 修复短时间区间导致空数据崩溃

### 文件

```text
trading_agent/tools/indicator_tool.py
trading_agent/tools/backtest_tool.py
trading_agent/agent/trading_agent.py
```

### indicator_tool.py 修改

在 `add_technical_indicators()` 最后不要直接无保护返回：

```python
return data.dropna().reset_index(drop=True)
```

改成：

```python
data = data.dropna().reset_index(drop=True)

if data.empty:
    raise ValueError(
        "Not enough data after indicator calculation. "
        "Please use at least 90 trading days."
    )

return data
```

### backtest_tool.py 修改

在回测数据清洗后加入：

```python
data = data.dropna().reset_index(drop=True)

if data.empty:
    raise ValueError("Backtest data is empty after return calculation.")
```

### trading_agent.py 修改

在调用指标后保护：

```python
data = add_technical_indicators(raw_data)

if data.empty:
    raise ValueError("Indicator data is empty. Use a longer date range.")
```

### 验证

使用很短时间范围提交任务，后端应返回明确错误，不应 500 崩溃。

---

## 1.6 修复 RSI 除零问题

### 文件

```text
trading_agent/tools/indicator_tool.py
```

### 修改

在 RSI 计算函数中处理 `avg_loss == 0`：

```python
avg_loss = avg_loss.replace(0, np.nan)
rs = avg_gain / avg_loss
rsi = 100 - (100 / (1 + rs))
return rsi.fillna(50)
```

确保文件顶部有：

```python
import numpy as np
```

### 验证

```bash
python -m compileall trading_agent
```

---

## 1.7 修复缓存目录相对路径

### 文件

```text
trading_agent/tools/data_tool.py
```

### 当前问题

```python
DATA_CACHE_DIR = Path("data/cache")
```

取决于启动目录。

### 修改

```python
DATA_CACHE_DIR = (
    Path(__file__).resolve().parents[2]
    / "trading_server"
    / "data"
    / "cache"
)
DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
```

### 验证

从项目根目录和 `trading_server` 目录分别启动，不应产生两个不同 cache 目录。

---

## 1.8 修复 `/api/trading/run` 参数校验

### 文件

```text
trading_server/app.py
```

### 修改模板

```python
from datetime import datetime

def _parse_float(value, default):
    try:
        if value in (None, ""):
            return default
        return float(value)
    except Exception:
        raise ValueError(f"Invalid float: {value}")

def _validate_date(value: str, name: str):
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except Exception:
        raise ValueError(f"Invalid {name}: {value}")
```

在 `/api/trading/run` 中：

```python
try:
    ticker = str(data.get("ticker", "SPY")).upper().strip()
    strategy = str(data.get("strategy", "auto")).strip()
    start_date = str(data.get("start_date", "2020-01-01"))
    end_date = str(data.get("end_date", "2024-12-31"))
    transaction_cost = _parse_float(data.get("transaction_cost", 0.001), 0.001)

    start_dt = _validate_date(start_date, "start_date")
    end_dt = _validate_date(end_date, "end_date")

    if start_dt >= end_dt:
        return jsonify({"ok": False, "message": "start_date must be before end_date"}), 400

    if not ticker:
        return jsonify({"ok": False, "message": "ticker is required"}), 400

except ValueError as e:
    return jsonify({"ok": False, "message": str(e)}), 400
```

### 验证

```bash
curl -X POST http://127.0.0.1:5000/api/trading/run   -H "Content-Type: application/json"   -d '{"ticker":"SPY","transaction_cost":"abc"}'
```

预期返回 400，不是 500。

---

# 2. P1 主链路修复：让智能模块真正参与决策

## 2.1 修改 `run_trading_agent()` 返回完整结构

### 文件

```text
trading_agent/agent/trading_agent.py
```

### 最终必须返回

```python
return {
    "ticker": ticker,
    "strategy": strategy_name,

    "data": data,
    "signal": final_signal,

    "indicator_result": indicator_metrics,
    "regime_result": regime_result,
    "news_result": news_result,
    "strategy_result": strategy_result,
    "strategy_scores": strategy_scores,
    "risk_result": risk_result,
    "backtest_result": result,
    "memory_result": memory_result,
    "llm_strategy_advice": llm_strategy_advice,
    "decision": decision_result,
    "explanation": explanation,

    "report": report_md,
}
```

### 验证

在 `runner.py` 中临时打印：

```python
print(result.keys())
```

必须包含：

```text
indicator_result
regime_result
news_result
strategy_result
risk_result
backtest_result
memory_result
decision
explanation
```

---

## 2.2 策略得分统一成 0-100

### 文件

```text
trading_agent/agent/trading_agent.py
```

### 修改 `select_best_strategy()`

原始分数保留，但新增 `normalized_score`，并把 `score` 统一为 0-100：

```python
raw_score = sharpe_ratio + annual_return + max_drawdown - 0.001 * number_of_trades
normalized_score = max(0, min(100, 50 + raw_score * 20))

strategy_scores.append({
    "name": strategy_name,
    "raw_score": round(raw_score, 4),
    "score": round(normalized_score, 2),
    "signal": "hold",
    "metrics": {
        "total_return": total_return,
        "annual_return": annual_return,
        "sharpe_ratio": sharpe_ratio,
        "max_drawdown": max_drawdown,
        "number_of_trades": number_of_trades,
    },
})
```

排序用：

```python
strategy_scores.sort(key=lambda x: x["score"], reverse=True)
```

### 验证

策略实验室显示：

```text
Momentum · Score 82
```

不能显示小数 raw score 例如 `0.43` 当作 82 使用。

---

## 2.3 接入 Regime Agent

### 新增文件

```text
trading_agent/tools/regime_tool.py
```

### 代码

```python
from __future__ import annotations

import math
from typing import Any

import pandas as pd


def _safe_float(x: Any, default: float = 0.0) -> float:
    try:
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return default
        return v
    except Exception:
        return default


def detect_market_regime(df: pd.DataFrame) -> dict:
    if df is None or df.empty:
        return {
            "trend_regime": "unknown",
            "volatility_regime": "unknown",
            "trend_strength": 0.0,
            "volatility_percentile": 0.5,
            "insight": "数据不足，无法判断市场状态。",
        }

    latest = df.iloc[-1]

    ma20 = _safe_float(latest.get("ma20"))
    ma60 = _safe_float(latest.get("ma60"))
    return_20d = _safe_float(latest.get("return_20d"))
    volatility = _safe_float(latest.get("volatility_20d"))

    trend_strength = (ma20 - ma60) / ma60 if ma60 else 0.0

    if trend_strength > 0.03 and return_20d > 0:
        trend_regime = "uptrend"
    elif trend_strength < -0.03 and return_20d < 0:
        trend_regime = "downtrend"
    else:
        trend_regime = "range_bound"

    if "volatility_20d" in df.columns and df["volatility_20d"].notna().sum() >= 20:
        volatility_percentile = float(df["volatility_20d"].rank(pct=True).iloc[-1])
    else:
        volatility_percentile = 0.5

    if volatility_percentile >= 0.8:
        volatility_regime = "high_volatility"
    elif volatility_percentile <= 0.3:
        volatility_regime = "low_volatility"
    else:
        volatility_regime = "normal_volatility"

    return {
        "trend_regime": trend_regime,
        "volatility_regime": volatility_regime,
        "trend_strength": round(trend_strength, 4),
        "return_20d": round(return_20d, 4),
        "volatility": round(volatility, 4),
        "volatility_percentile": round(volatility_percentile, 2),
        "insight": f"市场状态为 {trend_regime} + {volatility_regime}。",
    }
```

### trading_agent.py 接入

```python
from trading_agent.tools.regime_tool import detect_market_regime
```

在指标计算后、策略选择前：

```python
regime_result = detect_market_regime(data)

update_workflow(
    current_stage="detecting_regime",
    progress=35,
    summary=f"Regime: {regime_result['trend_regime']} + {regime_result['volatility_regime']}",
    details=regime_result,
)
```

---

## 2.4 接入 Dynamic Risk

### 文件

```text
trading_agent/tools/decision_score_tool.py
```

### 新增或替换

```python
def compute_dynamic_risk_score(backtest: dict, indicators: dict, regime: dict) -> dict:
    max_drawdown = abs(float(backtest.get("max_drawdown") or 0))
    volatility_percentile = float(regime.get("volatility_percentile") or 0.5)

    risk_score = 0
    risk_score += min(max_drawdown / 0.35, 1.0) * 45
    risk_score += min(volatility_percentile, 1.0) * 35

    if regime.get("trend_regime") == "downtrend":
        risk_score += 20
    elif regime.get("trend_regime") == "range_bound":
        risk_score += 8

    risk_score = max(0, min(100, round(risk_score)))

    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_adjusted_score": 100 - risk_score,
        "max_drawdown": backtest.get("max_drawdown"),
        "volatility_percentile": regime.get("volatility_percentile"),
        "insight": "风险分数由最大回撤、波动率分位数和市场状态共同决定。",
    }
```

### trading_agent.py 接入

```python
risk_result = compute_dynamic_risk_score(
    backtest=result,
    indicators=indicator_metrics,
    regime=regime_result,
)
```

---

## 2.5 接入 Score-based Decision

### 文件

```text
trading_agent/tools/decision_score_tool.py
```

### 新增

```python
def make_score_based_decision(
    *,
    strategy_result: dict,
    indicators: dict,
    regime: dict,
    risk_result: dict,
    backtest: dict,
    memory_result: dict,
    news_result: dict,
) -> dict:
    strategy_score = float(strategy_result.get("strategy_score", 50))
    indicator_score = float(indicators.get("indicator_score", 50)) if "indicator_score" in indicators else 50
    backtest_score = float(backtest.get("backtest_score", 50)) if "backtest_score" in backtest else 50
    news_score = float(news_result.get("news_score", 50))
    risk_adjusted_score = float(risk_result.get("risk_adjusted_score", 50))
    memory_score = 50 + float(memory_result.get("memory_score", 0)) * 5

    decision_score = (
        0.25 * strategy_score
        + 0.20 * indicator_score
        + 0.20 * backtest_score
        + 0.15 * news_score
        + 0.15 * risk_adjusted_score
        + 0.05 * memory_score
    )

    risk_score = float(risk_result.get("risk_score", 50))

    if decision_score >= 70 and risk_score < 45:
        decision = "buy"
    elif decision_score <= 35:
        decision = "sell"
    else:
        decision = "hold"

    confidence = max(0.35, min(0.95, abs(decision_score - 50) / 50))

    if decision == "buy":
        suggested_position = 0.6 if risk_score < 40 else 0.35
    elif decision == "sell":
        suggested_position = 0.0
    else:
        suggested_position = 0.35 if risk_score < 60 else 0.15

    return {
        "decision": decision,
        "decision_score": round(decision_score, 2),
        "confidence": round(confidence, 2),
        "suggested_position": round(suggested_position, 2),
        "score_breakdown": {
            "strategy": round(strategy_score, 2),
            "indicator": round(indicator_score, 2),
            "backtest": round(backtest_score, 2),
            "news": round(news_score, 2),
            "risk_adjusted": round(risk_adjusted_score, 2),
            "memory": round(memory_score, 2),
        },
        "reasoning": [
            f"策略得分为 {strategy_score:.2f}。",
            f"新闻得分为 {news_score:.2f}。",
            f"风险调整得分为 {risk_adjusted_score:.2f}。",
            f"综合决策分为 {decision_score:.2f}。",
        ],
        "insight": f"最终选择 {decision.upper()}，综合评分为 {decision_score:.1f}/100。",
    }
```

### trading_agent.py 接入

替换旧的：

```python
decision_result = make_final_decision(latest_signal, result)
```

改成：

```python
decision_result = make_score_based_decision(
    strategy_result=strategy_result,
    indicators=indicator_metrics,
    regime=regime_result,
    risk_result=risk_result,
    backtest=result,
    memory_result=memory_result,
    news_result=news_result,
)
```

---

# 3. P2 LLM Agent 接入流程

## 3.1 新增 LLM Client

### 文件

```text
trading_agent/tools/llm_client.py
```

### 代码

```python
from __future__ import annotations

import json
import os
from typing import Any

import requests


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def llm_enabled() -> bool:
    return _env_bool("LLM_ENABLE", False) and bool(os.getenv("LLM_API_KEY"))


def call_llm_json(
    system_prompt: str,
    user_payload: dict[str, Any],
    fallback: dict[str, Any],
    temperature: float = 0.2,
) -> dict[str, Any]:
    if not llm_enabled():
        return fallback

    api_key = os.getenv("LLM_API_KEY", "")
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    body = {
        "model": model,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
    }

    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=45,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else fallback
    except Exception:
        return fallback
```

---

## 3.2 新增 News LLM Agent

### 文件

```text
trading_agent/tools/news_tool.py
```

### 代码

```python
from __future__ import annotations

from typing import Any

from trading_agent.tools.llm_client import call_llm_json


def fetch_news_mock(asset: str) -> list[dict[str, str]]:
    return [
        {
            "title": f"{asset} market sentiment remains cautious as investors watch macro data",
            "source": "mock",
            "date": "recent",
            "summary": "Investors focus on inflation, rate expectations, and earnings.",
        },
        {
            "title": "Technology sector resilience supports broad market risk appetite",
            "source": "mock",
            "date": "recent",
            "summary": "Large-cap technology earnings remain a key support.",
        },
        {
            "title": "Valuation and policy uncertainty remain market risks",
            "source": "mock",
            "date": "recent",
            "summary": "Valuation pressure and policy uncertainty may limit upside.",
        },
    ]


def analyze_news_with_llm(asset: str, news_items: list[dict[str, Any]], indicators: dict, regime: dict) -> dict:
    fallback = {
        "news_sentiment": "neutral",
        "news_score": 50,
        "key_events": [x["title"] for x in news_items[:3]],
        "risk_events": ["宏观不确定性仍然存在。"],
        "summary": "未启用真实 LLM，当前使用 mock 新闻摘要。",
        "impact_on_strategy": "新闻面不改变当前策略判断。",
        "insight": "新闻面中性，对最终交易决策只形成轻微影响。",
    }

    system_prompt = '''
你是量化交易系统中的 News LLM Agent。
你只负责新闻摘要、情绪判断和事件影响分析。
你不能直接建议 Buy/Sell/Hold。
必须返回 JSON：
{
  "news_sentiment": "negative|neutral|neutral_positive|positive",
  "news_score": 0-100,
  "key_events": ["..."],
  "risk_events": ["..."],
  "summary": "...",
  "impact_on_strategy": "...",
  "insight": "..."
}
'''

    payload = {
        "asset": asset,
        "news_items": news_items,
        "indicators": indicators,
        "market_regime": regime,
    }

    result = call_llm_json(system_prompt, payload, fallback=fallback)

    try:
        result["news_score"] = max(0, min(100, int(result.get("news_score", 50))))
    except Exception:
        result["news_score"] = 50

    if not isinstance(result.get("key_events"), list):
        result["key_events"] = []
    if not isinstance(result.get("risk_events"), list):
        result["risk_events"] = []

    return result


def run_news_agent(asset: str, indicators: dict, regime: dict) -> dict:
    news_items = fetch_news_mock(asset)
    result = analyze_news_with_llm(asset, news_items, indicators, regime)
    result["raw_news"] = news_items
    return result
```

### trading_agent.py 接入

```python
from trading_agent.tools.news_tool import run_news_agent

news_result = run_news_agent(
    asset=ticker,
    indicators=indicator_metrics,
    regime=regime_result,
)
```

---

## 3.3 新增 LLM Strategy Advisor

### 文件

```text
trading_agent/tools/llm_strategy_advisor.py
```

### 代码

```python
from __future__ import annotations

from typing import Any

from trading_agent.tools.llm_client import call_llm_json


def run_llm_strategy_advisor(context: dict[str, Any]) -> dict[str, Any]:
    fallback = {
        "strategy_advice": "cautious_hold",
        "recommended_focus": [
            "等待更强趋势确认。",
            "控制仓位，不建议激进买入。",
            "结合风险评分进行保守决策。",
        ],
        "strategy_adjustment": "将风险敞口限制在中低仓位。",
        "impact_on_decision": "LLM 建议只作为解释和轻微加权，不直接决定交易动作。",
        "insight": "技术信号和风险结果没有形成强买入共识，因此建议谨慎。",
    }

    system_prompt = '''
你是 LLM Strategy Advisor。
你只能基于结构化上下文给出策略建议。
你不能直接输出最终 Buy/Sell/Hold 决策。
必须返回 JSON：
{
  "strategy_advice": "...",
  "recommended_focus": ["..."],
  "strategy_adjustment": "...",
  "impact_on_decision": "...",
  "insight": "..."
}
'''

    return call_llm_json(system_prompt, context, fallback=fallback)
```

### trading_agent.py 接入

```python
from trading_agent.tools.llm_strategy_advisor import run_llm_strategy_advisor

advisor_context = {
    "ticker": ticker,
    "strategy": strategy_name,
    "indicators": indicator_metrics,
    "regime": regime_result,
    "strategy_result": strategy_result,
    "risk_result": risk_result,
    "backtest_result": result,
    "memory_result": memory_result,
    "news_result": news_result,
}

llm_strategy_advice = run_llm_strategy_advisor(advisor_context)
```

---

## 3.4 Explain Agent 支持 LLM

### 文件

```text
trading_agent/tools/explain_tool.py
```

### 最终代码结构

```python
from __future__ import annotations

from typing import Any

from trading_agent.tools.llm_client import call_llm_json


def build_rule_based_explanation(context: dict[str, Any]) -> dict:
    decision = context.get("decision_result", {})
    risk = context.get("risk_result", {})
    regime = context.get("regime_result", {})
    news = context.get("news_result", {})
    strategy = context.get("strategy_result", {})

    action = str(decision.get("decision", "hold")).upper()

    reasons = [
        f"策略模块选择 {strategy.get('top_strategy', 'unknown')}，策略得分为 {strategy.get('strategy_score', 'N/A')}。",
        f"当前市场状态为 {regime.get('trend_regime', 'unknown')} + {regime.get('volatility_regime', 'unknown')}。",
        f"风险分数为 {risk.get('risk_score', 'N/A')}/100，风险等级为 {risk.get('risk_level', 'unknown')}。",
        f"新闻情绪得分为 {news.get('news_score', 'N/A')}/100，情绪为 {news.get('news_sentiment', 'neutral')}。",
    ]

    counterfactual = [
        "如果 Risk Score 下降到 30 以下，系统会提高买入倾向。",
        "如果 MACD 明显转强且市场状态变为 uptrend，决策可能转为 BUY。",
        "如果最大回撤继续扩大，系统会降低建议仓位。",
        "如果新闻情绪变为 strongly positive，新闻权重会提高最终评分。",
    ]

    return {
        "short_explanation": f"当前选择 {action}，因为综合评分、风险约束和市场状态没有形成更激进的交易条件。",
        "reasons": reasons,
        "counterfactual": counterfactual,
        "confidence_comment": f"当前置信度为 {decision.get('confidence', 'N/A')}，建议继续观察。",
    }


def run_explain_agent(context: dict[str, Any]) -> dict:
    fallback = build_rule_based_explanation(context)

    system_prompt = '''
你是 Explain Agent，负责解释量化交易系统的最终决策。
你不能推翻系统最终交易动作，只能解释依据。
必须返回 JSON：
{
  "short_explanation": "...",
  "reasons": ["..."],
  "counterfactual": ["..."],
  "confidence_comment": "..."
}
'''

    return call_llm_json(system_prompt, context, fallback=fallback)
```

### trading_agent.py 接入

```python
from trading_agent.tools.explain_tool import run_explain_agent

explanation_context = {
    "ticker": ticker,
    "indicator_result": indicator_metrics,
    "regime_result": regime_result,
    "strategy_result": strategy_result,
    "risk_result": risk_result,
    "backtest_result": result,
    "memory_result": memory_result,
    "news_result": news_result,
    "llm_strategy_advice": llm_strategy_advice,
    "decision_result": decision_result,
}

explanation = run_explain_agent(explanation_context)
```

---

# 4. P3 Artifact Builder 与 Room Modal 数据

## 4.1 新增 `artifact_builder.py`

### 文件

```text
trading_server/artifact_builder.py
```

### 作用

从 `run_trading_agent()` 的完整结果中生成 12 个房间的 `room_artifacts`。

### 必须包含的房间

```text
gateway       市场数据室
mcp           指标实验室
images        资讯分析室
skills        策略实验室
memory        策略记忆库
alarm         风险报警室
task_queues   回测评估室
schedule      决策调度台
log           执行日志台
agent         运行监控室
document      报告与分析室
break_room    休息室
```

### 每个 artifact 必须包含

```python
{
    "room_id": "...",
    "room_name": "...",
    "status": "done|warning|error|idle|active",
    "type": "...",
    "primary": {"label": "...", "value": "...", "unit": "", "level": "..."},
    "summary": "...",
    "insight": "...",
    "metrics": [...],
    "details": {
        "input": [...],
        "output": [...],
        "reasoning": [...],
        "counterfactual": [...]
    },
    "updated_at": "...",
    "llm": {"used": True|False, ...}
}
```

---

## 4.2 修改 `runner.py`

### 文件

```text
trading_server/runner.py
```

### 修改

顶部：

```python
try:
    from trading_server.artifact_builder import build_room_artifacts
except Exception:
    from artifact_builder import build_room_artifacts
```

任务完成后：

```python
room_artifacts = build_room_artifacts(task, result)
```

写入 telemetry：

```python
_snap["trading"]["room_artifacts"] = room_artifacts
```

同步 resources：

```python
for _r in _snap.setdefault("resources", []):
    artifact = room_artifacts.get(_r["id"])
    if artifact:
        items = []
        for i, metric in enumerate(artifact.get("metrics", [])):
            items.append({
                "id": f"{artifact['room_id']}-{i}",
                "title": f"{metric.get('label')}: {metric.get('value')}{metric.get('unit', '')}",
                "meta": metric.get("display", "metric"),
                "excerpt": artifact.get("insight", ""),
            })
        _r["items"] = items
        _r["itemCount"] = len(items)
        _r["status"] = artifact["status"]
```

---

## 4.3 修改前端 Room Modal

### 文件

```text
ClawLibrary/src/main.ts
ClawLibrary/index.html
```

### 必须实现

```ts
function getRoomArtifact(resourceId) {
  return latestSnapshot?.trading?.room_artifacts?.[resourceId] ?? null;
}
```

点击房间：

```ts
const artifact = getRoomArtifact(resource.id);

if (artifact) {
  openRoomModal(artifact);
  return;
}
```

禁止继续优先打开旧 asset-modal。

### AI Explain Tab

读取：

```ts
artifact.llm
artifact.details.reasoning
artifact.details.counterfactual
artifact.insight
```

显示：

```text
LLM Assisted / Rule-based

Explanation
...

Reasons
...

Counterfactual
...
```

---

# 5. 最终验收命令

## 5.1 Python 编译检查

```bash
python -m compileall trading_agent trading_server
```

必须无语法错误。

## 5.2 启动后端

```bash
cd trading_server
python app.py
```

## 5.3 启动前端

```bash
cd ClawLibrary
npm install
npm run dev
```

## 5.4 提交任务

```bash
curl -X POST http://127.0.0.1:5000/api/trading/run   -H "Content-Type: application/json"   -d '{
    "ticker": "SPY",
    "strategy": "auto",
    "start_date": "2020-01-01",
    "end_date": "2024-12-31",
    "transaction_cost": 0.001
  }'
```

## 5.5 检查 telemetry

```bash
cat ClawLibrary/src/data/trading-telemetry.json | grep -n "room_artifacts"
cat ClawLibrary/src/data/trading-telemetry.json | grep -n "news_result"
cat ClawLibrary/src/data/trading-telemetry.json | grep -n "decision_score"
```

## 5.6 浏览器验收

```text
[ ] 房间卡不再显示 0 / 2 / 10 作为核心信息
[ ] 点击房间打开 Room Modal
[ ] 资讯分析室显示 News Score
[ ] 策略实验室显示 LLM Strategy Advice
[ ] 风险报警室显示 Dynamic Risk Score
[ ] 决策调度台显示 Decision Score Breakdown
[ ] AI Explain 显示 reasons 和 counterfactual
[ ] LLM_ENABLE=false 时系统仍完整运行
[ ] 页面无 undefined / null / NaN
```

---

# 6. 最终交付标准

完成后系统必须满足：

```text
1. 所有真实指标来自 indicator_result
2. 所有房间来自 room_artifacts
3. 最终决策来自 score-based decision
4. LLM 参与新闻、策略建议、解释
5. LLM 不直接决定交易动作
6. Modal 能展示 LLM Assisted 标记
7. Explain Tab 能展示 reasons + counterfactual
8. runner.py 不再堆 UI 文案
9. 旧 asset-modal 不再作为房间详情入口
```
