# 当前项目升级为 LLM Agent：实现文档

## 0. 目标

当前仓库已经具备 `ClawLibrary` 前端、`trading_agent` 算法引擎、`trading_server` Flask 服务和 `room_artifacts` 房间产物结构。下一步把普通规则流水线升级为 **LLM-assisted Quantitative Trading Agent**。

核心原则：

```text
数值计算：代码完成
新闻理解：LLM 辅助
策略建议：LLM 辅助
最终决策：可控评分模型完成
决策解释：LLM 或规则解释完成
```

LLM 不能直接决定 Buy / Sell / Hold。

---

## 1. 最终流程

```text
Data Agent
  -> Indicator Agent
  -> Regime Agent
  -> News LLM Agent
  -> Strategy Agent
  -> Risk Agent
  -> Backtest Agent
  -> Memory Agent
  -> LLM Strategy Advisor
  -> Score-based Decision Agent
  -> LLM Explain Agent
  -> Artifact Builder
  -> Room Modal
```

---

## 2. 新增文件

```text
trading_agent/tools/
├── llm_client.py
├── news_tool.py
├── regime_tool.py
├── llm_strategy_advisor.py
├── decision_score_tool.py
├── memory_tool.py
└── explain_tool.py

trading_server/
└── artifact_builder.py
```

---

## 3. 环境变量

```bash
LLM_ENABLE=false
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

NEWS_ENABLE=false
NEWS_API_KEY=
```

第一版先用：

```bash
LLM_ENABLE=false
NEWS_ENABLE=false
```

保证没有 API Key 也能完整运行。

---

## 4. `trading_agent/tools/llm_client.py`

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

依赖：

```bash
pip install requests
```

---

## 5. `trading_agent/tools/regime_tool.py`

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

---

## 6. `trading_agent/tools/news_tool.py`

```python
from __future__ import annotations

import os
from typing import Any

from trading_agent.tools.llm_client import call_llm_json


def news_enabled() -> bool:
    return os.getenv("NEWS_ENABLE", "false").lower() in {"1", "true", "yes", "on"}


def fetch_news_mock(asset: str) -> list[dict[str, str]]:
    return [
        {
            "title": f"{asset} market sentiment remains cautious as investors watch macro data",
            "source": "mock",
            "date": "recent",
            "summary": "Investors remain focused on inflation, rate expectations, and large-cap earnings.",
        },
        {
            "title": "Technology sector resilience supports broad market risk appetite",
            "source": "mock",
            "date": "recent",
            "summary": "Large-cap technology earnings remain a key support for index performance.",
        },
        {
            "title": "Valuation and policy uncertainty remain market risks",
            "source": "mock",
            "date": "recent",
            "summary": "Analysts warn that valuations and policy uncertainty may limit upside.",
        },
    ]


def fetch_news(asset: str, limit: int = 6) -> list[dict[str, str]]:
    # 第一版用 mock，后续再换 Tavily / NewsAPI / SerpAPI / Google News RSS。
    return fetch_news_mock(asset)[:limit]


def analyze_news_with_llm(
    asset: str,
    news_items: list[dict[str, Any]],
    indicators: dict[str, Any],
    regime: dict[str, Any],
) -> dict[str, Any]:
    fallback = {
        "news_sentiment": "neutral",
        "news_score": 50,
        "key_events": [item["title"] for item in news_items[:3]],
        "risk_events": ["宏观不确定性仍然存在。"],
        "summary": "未启用真实 LLM，当前使用规则化新闻摘要。",
        "impact_on_strategy": "新闻面不改变当前策略判断。",
        "insight": "新闻面中性，对最终交易决策只形成轻微影响。",
    }

    system_prompt = """
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
"""

    payload = {
        "asset": asset,
        "news_items": news_items,
        "indicators": indicators,
        "market_regime": regime,
    }

    result = call_llm_json(system_prompt, payload, fallback=fallback, temperature=0.2)

    try:
        result["news_score"] = max(0, min(100, int(result.get("news_score", 50))))
    except Exception:
        result["news_score"] = 50

    for key in ["key_events", "risk_events"]:
        if not isinstance(result.get(key), list):
            result[key] = []

    return result


def run_news_agent(asset: str, indicators: dict, regime: dict) -> dict:
    news_items = fetch_news(asset)
    analysis = analyze_news_with_llm(asset, news_items, indicators, regime)
    analysis["raw_news"] = news_items
    return analysis
```

---

## 7. `trading_agent/tools/llm_strategy_advisor.py`

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

    system_prompt = """
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
"""

    return call_llm_json(system_prompt, context, fallback=fallback, temperature=0.2)
```

---

## 8. `trading_agent/tools/decision_score_tool.py`

```python
from __future__ import annotations

from typing import Any


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def normalize_backtest_score(backtest: dict[str, Any]) -> float:
    total_return = float(backtest.get("total_return") or 0)
    sharpe = float(backtest.get("sharpe_ratio") or 0)
    max_drawdown = abs(float(backtest.get("max_drawdown") or 0))

    ret_score = _clamp((total_return + 0.10) / 0.60 * 100)
    sharpe_score = _clamp(sharpe / 1.5 * 100)
    dd_penalty = _clamp(max_drawdown / 0.35 * 100)

    return round(0.45 * ret_score + 0.40 * sharpe_score + 0.15 * (100 - dd_penalty), 2)


def normalize_indicator_score(indicators: dict[str, Any], regime: dict[str, Any]) -> float:
    rsi = float(indicators.get("rsi") or 50)
    macd = float(indicators.get("macd") or 0)
    macd_signal = float(indicators.get("macd_signal") or 0)
    ma20 = float(indicators.get("ma20") or 0)
    ma60 = float(indicators.get("ma60") or 0)

    score = 50

    if 45 <= rsi <= 65:
        score += 8
    elif rsi < 30:
        score += 12
    elif rsi > 75:
        score -= 15

    if macd > macd_signal:
        score += 12
    else:
        score -= 5

    if ma20 and ma60 and ma20 > ma60:
        score += 10
    elif ma20 and ma60 and ma20 < ma60:
        score -= 10

    if regime.get("trend_regime") == "uptrend":
        score += 8
    elif regime.get("trend_regime") == "downtrend":
        score -= 12

    return round(_clamp(score), 2)


def compute_dynamic_risk_score(backtest: dict[str, Any], indicators: dict[str, Any], regime: dict[str, Any]) -> dict:
    max_drawdown = abs(float(backtest.get("max_drawdown") or 0))
    volatility_percentile = float(regime.get("volatility_percentile") or 0.5)

    risk_score = 0
    risk_score += min(max_drawdown / 0.35, 1.0) * 45
    risk_score += min(volatility_percentile, 1.0) * 35

    if regime.get("trend_regime") == "downtrend":
        risk_score += 20
    elif regime.get("trend_regime") == "range_bound":
        risk_score += 8

    risk_score = int(round(_clamp(risk_score), 0))

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


def compute_strategy_score(strategy_scores: list[dict[str, Any]]) -> dict:
    if not strategy_scores:
        return {"top_strategy": "unknown", "strategy_score": 50, "scores": []}

    normalized_items = []
    for item in strategy_scores:
        raw_score = float(item.get("score") or 0)
        normalized = _clamp(50 + raw_score * 15)
        normalized_items.append({**item, "normalized_score": round(normalized, 2)})

    normalized_items.sort(key=lambda x: x["normalized_score"], reverse=True)
    return {
        "top_strategy": normalized_items[0].get("name", "unknown"),
        "strategy_score": normalized_items[0]["normalized_score"],
        "scores": normalized_items,
    }


def compute_memory_score(memory_result: dict[str, Any]) -> float:
    return _clamp(50 + float(memory_result.get("memory_score", 0)) * 5)


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
    indicator_score = normalize_indicator_score(indicators, regime)
    backtest_score = normalize_backtest_score(backtest)
    risk_adjusted_score = float(risk_result.get("risk_adjusted_score", 50))
    memory_score = compute_memory_score(memory_result)
    news_score = float(news_result.get("news_score", 50))

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
        suggested_position = 0.10 if risk_score >= 70 else 0.35 if risk_score >= 40 else 0.60
    elif decision == "sell":
        suggested_position = 0.0
    else:
        suggested_position = 0.35 if risk_score < 60 else 0.15

    breakdown = {
        "strategy": round(strategy_score, 2),
        "indicator": round(indicator_score, 2),
        "backtest": round(backtest_score, 2),
        "news": round(news_score, 2),
        "risk_adjusted": round(risk_adjusted_score, 2),
        "memory": round(memory_score, 2),
    }

    reasoning = [
        f"策略得分为 {breakdown['strategy']}，最高策略为 {strategy_result.get('top_strategy', 'unknown')}。",
        f"指标得分为 {breakdown['indicator']}，由 RSI、MACD、均线和市场状态综合得到。",
        f"风险调整得分为 {breakdown['risk_adjusted']}，当前风险等级为 {risk_result.get('risk_level')}。",
        f"新闻情绪得分为 {breakdown['news']}，作为辅助权重参与决策。",
    ]

    return {
        "decision": decision,
        "decision_score": round(decision_score, 2),
        "confidence": round(confidence, 2),
        "suggested_position": round(suggested_position, 2),
        "score_breakdown": breakdown,
        "reasoning": reasoning,
        "insight": f"最终选择 {decision.upper()}，因为综合评分为 {decision_score:.1f}/100，风险分数为 {risk_score:.0f}/100。",
    }
```

---

## 9. `trading_agent/tools/memory_tool.py`

```python
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_trading_history(path: str | Path) -> list[dict[str, Any]]:
    p = Path(path)
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def compute_memory_result(history: list[dict[str, Any]], ticker: str, strategy: str) -> dict:
    related = [
        item for item in history
        if item.get("ticker") == ticker or item.get("strategy") == strategy
    ]

    if not related:
        return {
            "memory_score": 0,
            "related_count": 0,
            "evidence": "暂无相同资产或策略的历史记录。",
            "insight": "策略记忆暂不影响当前决策。",
        }

    recent = related[:5]
    memory_score = min(5, len(recent))

    return {
        "memory_score": memory_score,
        "related_count": len(related),
        "evidence": f"找到 {len(related)} 条相关历史记录，最近 {len(recent)} 条用于策略记忆。",
        "insight": "历史记录对当前策略形成轻微加权，但不会单独决定交易动作。",
    }
```

---

## 10. `trading_agent/tools/explain_tool.py`

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
    indicators = context.get("indicator_result", {})

    action = str(decision.get("decision", "hold")).upper()

    reasons = [
        f"策略模块选择 {strategy.get('top_strategy', 'unknown')}，策略得分为 {strategy.get('strategy_score', 'N/A')}。",
        f"当前市场状态为 {regime.get('trend_regime', 'unknown')} + {regime.get('volatility_regime', 'unknown')}。",
        f"风险分数为 {risk.get('risk_score', 'N/A')}/100，风险等级为 {risk.get('risk_level', 'unknown')}。",
        f"新闻情绪得分为 {news.get('news_score', 'N/A')}/100，情绪为 {news.get('news_sentiment', 'neutral')}。",
    ]

    if indicators.get("macd") is not None:
        reasons.append(f"MACD 当前为 {indicators.get('macd')}，用于判断短期动量。")

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
        "confidence_comment": f"当前置信度为 {decision.get('confidence', 'N/A')}，建议结合后续市场变化继续观察。",
    }


def run_explain_agent(context: dict[str, Any]) -> dict:
    fallback = build_rule_based_explanation(context)

    system_prompt = """
你是 Explain Agent，负责解释量化交易系统的最终决策。
你不能推翻系统的最终交易动作，只能解释依据。
必须返回 JSON：
{
  "short_explanation": "...",
  "reasons": ["..."],
  "counterfactual": ["..."],
  "confidence_comment": "..."
}
"""

    return call_llm_json(system_prompt, context, fallback=fallback, temperature=0.2)
```

---

## 11. 修改 `trading_agent/agent/trading_agent.py`

### 11.1 新增 imports

```python
from pathlib import Path

from trading_agent.tools.regime_tool import detect_market_regime
from trading_agent.tools.news_tool import run_news_agent
from trading_agent.tools.llm_strategy_advisor import run_llm_strategy_advisor
from trading_agent.tools.decision_score_tool import (
    compute_dynamic_risk_score,
    compute_strategy_score,
    make_score_based_decision,
)
from trading_agent.tools.memory_tool import load_trading_history, compute_memory_result
from trading_agent.tools.explain_tool import run_explain_agent
```

### 11.2 修复指标 summary key

把：

```python
summary=f"Indicators: RSI={indicator_metrics.get('RSI','?')}, MACD={indicator_metrics.get('MACD','?')}",
```

改成：

```python
summary=f"Indicators: RSI={indicator_metrics.get('rsi','?')}, MACD={indicator_metrics.get('macd','?')}",
```

### 11.3 在 `data = add_technical_indicators(raw_data)` 后加入

```python
regime_result = detect_market_regime(data)

update_workflow(
    current_stage="detecting_regime",
    progress=38,
    cat_id="technical_cat",
    cat_status="running",
    summary=f"Regime: {regime_result['trend_regime']} + {regime_result['volatility_regime']}",
    details=regime_result,
    logs=["Detect market regime from trend and volatility"],
)
```

### 11.4 替换最终决策部分

原来：

```python
latest_signal = int(final_signal.iloc[-1])
decision_result = make_final_decision(latest_signal, result)
```

替换为：

```python
latest_signal = int(final_signal.iloc[-1])

update_workflow(
    current_stage="analyzing_news",
    progress=82,
    cat_id="news_cat",
    cat_status="running",
    summary="Analyzing recent news and external events with LLM.",
    logs=["Fetch news", "Summarize market events", "Score news sentiment"],
)

news_result = run_news_agent(
    asset=ticker,
    indicators=indicator_metrics,
    regime=regime_result,
)

history_path = Path(__file__).resolve().parents[2] / "trading_server" / "trading_history.json"
history = load_trading_history(history_path)
memory_result = compute_memory_result(history, ticker, strategy_name)

strategy_result = compute_strategy_score(strategy_scores)

risk_result = compute_dynamic_risk_score(
    backtest=result,
    indicators=indicator_metrics,
    regime=regime_result,
)

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

decision_result = make_score_based_decision(
    strategy_result=strategy_result,
    indicators=indicator_metrics,
    regime=regime_result,
    risk_result=risk_result,
    backtest=result,
    memory_result=memory_result,
    news_result=news_result,
)

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

### 11.5 return 结构改成

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

---

## 12. `trading_server/artifact_builder.py`

新增完整 builder。核心原则：`runner.py` 不再拼接 12 个房间文案。

```python
from __future__ import annotations

from datetime import datetime
from typing import Any


def _metric(label, value, display="number", unit="", level="neutral", signal=None):
    m = {
        "label": label,
        "value": value,
        "unit": unit,
        "display": display,
        "level": level,
    }
    if signal:
        m["signal"] = signal
    return m


def _artifact(
    rid: str,
    name: str,
    typ: str,
    status: str,
    primary_label: str,
    primary_value: Any,
    summary: str,
    insight: str,
    metrics: list[dict],
    details_input: list[str],
    details_output: list[str],
    details_reasoning: list[str],
    counterfactual: list[str] | None = None,
    primary_unit: str = "",
    primary_level: str = "neutral",
    llm: dict | None = None,
) -> dict:
    return {
        "room_id": rid,
        "room_name": name,
        "status": status,
        "type": typ,
        "primary": {
            "label": primary_label,
            "value": primary_value,
            "unit": primary_unit,
            "level": primary_level,
        },
        "summary": summary,
        "insight": insight,
        "metrics": metrics,
        "details": {
            "input": details_input,
            "output": details_output,
            "reasoning": details_reasoning,
            "counterfactual": counterfactual or [],
        },
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "llm": llm or {"used": False},
    }
```

继续在同文件中加入：

```python
def build_room_artifacts(task: dict, result: dict) -> dict[str, dict]:
    ticker = result.get("ticker") or task.get("ticker", "?")
    strategy = result.get("strategy") or task.get("strategy", "?")

    indicators = result.get("indicator_result", {}) or {}
    regime = result.get("regime_result", {}) or {}
    news = result.get("news_result", {}) or {}
    strategy_result = result.get("strategy_result", {}) or {}
    strategy_scores = result.get("strategy_scores", []) or []
    risk = result.get("risk_result", {}) or {}
    backtest = result.get("backtest_result", {}) or {}
    memory = result.get("memory_result", {}) or {}
    decision = result.get("decision", {}) or {}
    explanation = result.get("explanation", {}) or {}
    advice = result.get("llm_strategy_advice", {}) or {}

    start = task.get("start_date", "?")
    end = task.get("end_date", "?")
    period = f"{start} ~ {end}"

    rows = len(result.get("data", [])) if result.get("data") is not None else "N/A"
    rsi = indicators.get("rsi", "N/A")
    macd = indicators.get("macd", "N/A")
    vol = indicators.get("volatility_20d", "N/A")

    total_ret = round((backtest.get("total_return") or 0) * 100, 2)
    sharpe = round(backtest.get("sharpe_ratio") or 0, 2)
    max_dd = round((backtest.get("max_drawdown") or 0) * 100, 2)
    win_rate = round((backtest.get("win_rate") or 0) * 100, 2)
    trades = backtest.get("number_of_trades") or backtest.get("trades") or 0

    dec = str(decision.get("decision", "hold")).upper()
    decision_score = decision.get("decision_score", "N/A")
    confidence = decision.get("confidence", "N/A")
    position = decision.get("suggested_position", "N/A")
    position_pct = round(position * 100, 1) if isinstance(position, (int, float)) else "N/A"

    risk_score = risk.get("risk_score", 50)
    risk_level = risk.get("risk_level", "medium")
    risk_status = "warning" if risk_level == "medium" else "error" if risk_level == "high" else "done"

    top_strategy = strategy_result.get("top_strategy", strategy)
    strategy_score = strategy_result.get("strategy_score", "N/A")

    explanation_reasons = explanation.get("reasons", [])
    explanation_counter = explanation.get("counterfactual", [])

    artifacts = {}

    artifacts["gateway"] = _artifact(
        "gateway", "市场数据室", "data", "done",
        "数据条数", rows,
        f"{rows} bars · 完整度 100%",
        "行情数据完整，无明显缺失，可以支持后续指标计算与回测。",
        [
            _metric("时间区间", period, "text"),
            _metric("数据条数", rows, "number", "bars", "positive"),
            _metric("缺失值", 0, "number", "", "positive"),
        ],
        ["Yahoo Finance / Stooq", "ticker", "date range"],
        ["OHLCV daily data", "returns"],
        ["加载行情数据。", "检查时间区间和缺失值。"],
    )

    artifacts["mcp"] = _artifact(
        "mcp", "指标实验室", "indicator", "done",
        "RSI", rsi,
        f"RSI {rsi} · MACD {macd}",
        "指标结果用于判断短期动量、趋势方向和波动状态。",
        [
            _metric("RSI", rsi, "bar", "", "neutral"),
            _metric("MACD", macd, "number", "", "neutral"),
            _metric("MA20", indicators.get("ma20", "N/A"), "number"),
            _metric("MA60", indicators.get("ma60", "N/A"), "number"),
            _metric("Volatility", vol, "bar", "", "warning"),
            _metric("Regime", regime.get("trend_regime", "unknown"), "badge"),
        ],
        ["close", "volume", "returns"],
        ["RSI", "MACD", "MA20", "MA60", "Volatility", "Regime"],
        [regime.get("insight", "市场状态识别完成。")],
    )

    artifacts["images"] = _artifact(
        "images", "资讯分析室", "news", "done",
        "News Score", news.get("news_score", "N/A"),
        f"{news.get('news_sentiment', 'neutral')} · {news.get('news_score', 'N/A')}/100",
        news.get("insight", "新闻面暂未形成显著方向性影响。"),
        [
            _metric("News Score", news.get("news_score", "N/A"), "gauge", "/100"),
            _metric("Sentiment", news.get("news_sentiment", "neutral"), "badge"),
            _metric("Key Events", len(news.get("key_events", [])), "number"),
            _metric("Risk Events", len(news.get("risk_events", [])), "number"),
        ],
        ["recent news", "macro events", "asset symbol"],
        ["news sentiment", "news score", "key events", "risk events"],
        news.get("key_events", []) + news.get("risk_events", []),
        llm={
            "used": bool(news.get("summary")),
            "summary": news.get("summary", ""),
            "key_events": news.get("key_events", []),
            "risk_events": news.get("risk_events", []),
        },
    )

    artifacts["skills"] = _artifact(
        "skills", "策略实验室", "strategy", "done",
        "Top 策略", top_strategy,
        f"{top_strategy} · Score {strategy_score}",
        advice.get("insight", "策略模块根据回测、市场状态、风险和记忆结果进行多维评分。"),
        [
            _metric(
                item.get("name", "?"),
                item.get("normalized_score", item.get("score", 0)),
                "strategy_score",
                "score",
                "positive",
                signal="hold",
            )
            for item in strategy_result.get("scores", strategy_scores)
        ],
        ["indicators", "market regime", "news sentiment", "backtest"],
        ["candidate strategies", "strategy scores", "top strategy"],
        advice.get("recommended_focus", ["比较候选策略。"]),
        llm={
            "used": True,
            "summary": advice.get("strategy_advice", ""),
            "recommended_focus": advice.get("recommended_focus", []),
        },
    )

    artifacts["memory"] = _artifact(
        "memory", "策略记忆库", "memory", "done",
        "Memory", memory.get("memory_score", 0),
        f"Memory boost {memory.get('memory_score', 0)}",
        memory.get("insight", "策略记忆暂不影响当前决策。"),
        [
            _metric("Memory Score", memory.get("memory_score", 0), "number"),
            _metric("Related Records", memory.get("related_count", 0), "number"),
        ],
        ["trading_history.json"],
        ["memory score", "historical evidence"],
        [memory.get("evidence", "")],
    )

    artifacts["alarm"] = _artifact(
        "alarm", "风险报警室", "risk", risk_status,
        "Risk", risk_score,
        f"{risk_level} · {risk_score}/100",
        risk.get("insight", "风险分数由最大回撤、波动率和市场状态共同决定。"),
        [
            _metric("Risk Score", risk_score, "gauge", "/100", "warning"),
            _metric("Risk Level", risk_level, "badge"),
            _metric("Max Drawdown", max_dd, "bar", "%", "danger"),
            _metric("Vol Percentile", regime.get("volatility_percentile", "N/A"), "bar"),
        ],
        ["backtest", "volatility", "market regime"],
        ["risk score", "risk level", "risk adjusted score"],
        ["最大回撤越大，风险分数越高。", "波动率分位数越高，仓位限制越强。"],
    )

    artifacts["task_queues"] = _artifact(
        "task_queues", "回测评估室", "backtest", "done",
        "Return", total_ret,
        f"Return {total_ret}% · Sharpe {sharpe}",
        f"回测收益 {total_ret}%，Sharpe {sharpe}，最大回撤 {max_dd}%。",
        [
            _metric("Total Return", total_ret, "bar", "%", "positive" if total_ret > 0 else "danger"),
            _metric("Sharpe", sharpe, "number"),
            _metric("Max Drawdown", max_dd, "bar", "%", "danger" if max_dd < -20 else "warning"),
            _metric("Win Rate", win_rate, "bar", "%"),
            _metric("Trades", trades, "number"),
        ],
        ["signal", "price data", "transaction cost"],
        ["return", "sharpe", "drawdown", "win rate"],
        ["回测收益衡量策略历史表现。", "最大回撤限制最终仓位和买入置信度。"],
    )

    artifacts["schedule"] = _artifact(
        "schedule", "决策调度台", "decision", "done",
        "Decision", dec,
        f"{dec} · Score {decision_score}",
        decision.get("insight", f"最终选择 {dec}。"),
        [
            _metric("Decision", dec, "badge"),
            _metric("Decision Score", decision_score, "gauge", "/100"),
            _metric("Confidence", confidence, "bar"),
            _metric("Position", position_pct, "bar", "%"),
            _metric("Top Strategy", top_strategy, "badge"),
        ],
        ["strategy score", "indicator score", "risk score", "news score", "memory score"],
        ["decision", "confidence", "suggested position"],
        decision.get("reasoning", []),
        explanation_counter,
    )

    artifacts["log"] = _artifact(
        "log", "执行日志台", "execution", "done",
        "Order", "Simulated",
        "No real order · Simulated",
        "当前系统为模拟交易，不会真实下单。",
        [
            _metric("Execution Mode", "Simulated", "badge"),
            _metric("Decision", dec, "badge"),
            _metric("Position", position_pct, "bar", "%"),
        ],
        ["final decision", "suggested position"],
        ["execution status", "simulated order log"],
        ["HOLD 不触发实际买卖。", "BUY/SELL 仅生成模拟执行记录。"],
    )

    artifacts["agent"] = _artifact(
        "agent", "运行监控室", "monitor", "done",
        "Agents", "Done",
        "LLM-assisted pipeline completed",
        "Data、Indicator、News、Strategy、Risk、Decision 和 Explain 阶段已完成。",
        [
            _metric("Data Agent", "Done", "badge"),
            _metric("News LLM Agent", "Done", "badge"),
            _metric("Decision Agent", "Done", "badge"),
            _metric("Explain Agent", "Done", "badge"),
        ],
        ["workflow events"],
        ["agent status"],
        ["所有关键阶段已完成。"],
    )

    artifacts["document"] = _artifact(
        "document", "报告与分析室", "report", "done",
        "Report", "Ready",
        f"Report ready · {ticker}",
        "报告已整合行情、指标、市场状态、新闻、风险、回测和最终决策。",
        [
            _metric("Decision", dec, "badge"),
            _metric("Return", total_ret, "number", "%"),
            _metric("Sharpe", sharpe, "number"),
            _metric("News", news.get("news_score", "N/A"), "number", "/100"),
        ],
        ["all room artifacts"],
        ["trading report"],
        explanation_reasons,
    )

    artifacts["break_room"] = _artifact(
        "break_room", "休息室", "idle", "done",
        "Last Task", ticker,
        f"{ticker} · {dec}",
        "当前任务已完成，Agent 返回休息室等待下一次分析。",
        [
            _metric("Last Asset", ticker, "text"),
            _metric("Last Decision", dec, "badge"),
        ],
        ["last task"],
        ["idle status"],
        ["当前没有正在执行的任务。"],
    )

    return artifacts
```

---

## 13. 修改 `trading_server/runner.py`

在顶部新增：

```python
try:
    from trading_server.artifact_builder import build_room_artifacts
except Exception:
    from artifact_builder import build_room_artifacts
```

删除原来 `runner.py` 里手写 `room_artifacts = {...}` 的大段逻辑，替换成：

```python
room_artifacts = build_room_artifacts(task, result)

_path = Path(__file__).resolve().parent.parent / "ClawLibrary" / "src" / "data" / "trading-telemetry.json"

if _path.exists():
    _snap = _json.loads(_path.read_text(encoding="utf-8"))
    _snap["trading"]["room_artifacts"] = room_artifacts

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

    _tmp = _path.with_suffix(".tmp")
    _tmp.write_text(_json.dumps(_snap, ensure_ascii=False, indent=2), encoding="utf-8")
    _tmp.replace(_path)
```

---

## 14. 前端需要读取的新字段

Room Modal 需要支持：

```ts
artifact.details.counterfactual
artifact.llm
artifact.llm.used
artifact.llm.summary
artifact.llm.key_events
artifact.llm.risk_events
```

AI Explain Tab 渲染逻辑：

```ts
function renderAIExplain(artifact) {
  const reasons = artifact.details?.reasoning ?? [];
  const counterfactual = artifact.details?.counterfactual ?? [];
  const llm = artifact.llm;

  return `
    <section class="ai-explain-section">
      <div class="ai-mode-badge">${llm?.used ? "LLM Assisted" : "Rule-based"}</div>

      <h3>Explanation</h3>
      <p>${artifact.insight || "暂无解释。"}</p>

      <h3>Reasons</h3>
      <ul>${reasons.map(x => `<li>${x}</li>`).join("")}</ul>

      <h3>Counterfactual</h3>
      <ul>${counterfactual.map(x => `<li>${x}</li>`).join("")}</ul>
    </section>
  `;
}
```

---

## 15. 房间显示变化

### 资讯分析室

```text
News 62/100
Neutral Positive
新闻面略偏正面，但不足以单独支持买入。
```

### 策略实验室

```text
Top Strategy
Momentum · Score 82

LLM Strategy Advice
Cautious Momentum / Hold
```

### 决策调度台

```text
HOLD
Decision Score 58/100
Confidence 62%

Score Breakdown
Strategy       72
Indicator      55
Backtest       63
News           62
Risk Adjusted  54
Memory         55
```

### AI Explain Tab

```text
LLM Assisted

为什么是 HOLD？
当前选择 HOLD，主要因为风险约束和趋势确认不足。

Reasons
1. 策略得分最高的是 Momentum。
2. 风险分数为 46/100。
3. 新闻面略偏正面，但不足以覆盖风险约束。

Counterfactual
1. 如果 Risk Score 下降到 30 以下，系统会提高买入倾向。
2. 如果 MACD 明显转强，决策可能转为 BUY。
```

---

## 16. 实施顺序

```text
P0. 新增 llm_client.py，确保 LLM_ENABLE=false 时系统照常运行
P1. 新增 regime_tool.py，并在 trading_agent.py 中调用
P2. 新增 news_tool.py，先用 mock 新闻
P3. 新增 llm_strategy_advisor.py
P4. 新增 decision_score_tool.py，替换旧 make_final_decision 的最终决策
P5. 新增 memory_tool.py，读取 trading_history.json
P6. 新增 explain_tool.py，AI Explain 先规则化，LLM 可选
P7. 新增 artifact_builder.py，把 runner.py 变薄
P8. 前端 AI Explain Tab 支持 details.counterfactual 和 artifact.llm
```

---

## 17. 验收标准

```text
[ ] LLM_ENABLE=false 时，SPY auto 可以完整跑完
[ ] UI 中 RSI / MACD / Volatility 来自 indicator_result，不是默认值
[ ] 资讯分析室显示 News Score
[ ] 策略实验室显示 LLM Strategy Advice
[ ] 风险报警室显示 Dynamic Risk Score
[ ] 决策调度台显示 Decision Score Breakdown
[ ] AI Explain 显示 reasons 和 counterfactual
[ ] 最终 Buy/Sell/Hold 由 score-based decision 产生
[ ] LLM 不直接决定最终交易动作
[ ] runner.py 不再手写 12 个 room_artifacts
```

---

## 18. 报告表述

```text
本系统将 LLM 引入量化交易 Agent 的中间分析环节，而不是让 LLM 直接决定交易动作。LLM 主要承担新闻摘要、事件理解、策略建议和决策解释任务。最终交易动作由可控的评分模型生成，综合考虑策略表现、技术指标、市场状态、风险评分、历史记忆和新闻情绪，从而兼顾大模型的信息理解能力与量化交易系统的稳定性和可解释性。
```

```text
This project integrates LLM capabilities into intermediate analysis stages of a quantitative trading agent rather than allowing the LLM to directly make trading decisions. The LLM is used for news summarization, event interpretation, strategy suggestion, and decision explanation. The final trading action is produced by a controllable scoring model that combines strategy performance, technical indicators, market regime, risk score, historical memory, and news sentiment.
```
