"""News LLM Agent — mock news + optional LLM sentiment analysis."""
from __future__ import annotations
from typing import Any
from trading_agent.tools.llm_client import call_llm_json


def fetch_news_mock(asset: str) -> list[dict[str, str]]:
    return [
        {"title": f"{asset} market sentiment remains cautious as investors watch macro data", "source": "mock", "date": "recent", "summary": "Investors focus on inflation, rate expectations, and earnings."},
        {"title": "Technology sector resilience supports broad market risk appetite", "source": "mock", "date": "recent", "summary": "Large-cap technology earnings remain a key support."},
        {"title": "Valuation and policy uncertainty remain market risks", "source": "mock", "date": "recent", "summary": "Valuation pressure and policy uncertainty may limit upside."},
    ]


def analyze_news_with_llm(asset: str, news_items: list[dict[str, Any]], indicators: dict, regime: dict) -> dict:
    fallback = {"news_sentiment": "neutral", "news_score": 50, "key_events": [x["title"] for x in news_items[:3]], "risk_events": ["宏观不确定性仍然存在。"], "summary": "未启用真实 LLM，当前使用 mock 新闻摘要。", "impact_on_strategy": "新闻面不改变当前策略判断。", "insight": "新闻面中性，对最终交易决策只形成轻微影响。"}
    system_prompt = '你是量化交易系统中的 News LLM Agent。你只负责新闻摘要、情绪判断和事件影响分析。你不能直接建议 Buy/Sell/Hold。必须返回 JSON：{"news_sentiment":"negative|neutral|neutral_positive|positive","news_score":0-100,"key_events":["..."],"risk_events":["..."],"summary":"...","impact_on_strategy":"...","insight":"..."}'
    payload = {"asset": asset, "news_items": news_items, "indicators": indicators, "market_regime": regime}
    result = call_llm_json(system_prompt, payload, fallback=fallback)
    try: result["news_score"] = max(0, min(100, int(result.get("news_score", 50))))
    except Exception: result["news_score"] = 50
    if not isinstance(result.get("key_events"), list): result["key_events"] = []
    if not isinstance(result.get("risk_events"), list): result["risk_events"] = []
    return result


def run_news_agent(asset: str, indicators: dict, regime: dict) -> dict:
    news_items = fetch_news_mock(asset)
    result = analyze_news_with_llm(asset, news_items, indicators, regime)
    result["raw_news"] = news_items
    return result
