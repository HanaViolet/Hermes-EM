"""News LLM Agent — real news + optional LLM sentiment analysis."""
from __future__ import annotations
from typing import Any
from trading_agent.tools.llm_client import call_llm_json


def fetch_news_yahoo(ticker: str, limit: int = 10) -> list[dict]:
    """Fetch news from Yahoo Finance search API. No API key required."""
    import time
    import requests

    url = "https://query1.finance.yahoo.com/v1/finance/search"
    params = {
        "q": ticker,
        "quotesCount": 0,
        "newsCount": limit,
        "enableFuzzyQuery": "false",
        "quotesQueryId": "tss_match_phrase_query",
        "multiQuoteQueryId": "multi_quote_single_token_query",
        "newsQueryId": "news_cie_vespa",
        "enableCb": "true",
    }
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=8)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return []

    raw_news = data.get("news", [])
    articles = []

    for i, item in enumerate(raw_news[:limit], start=1):
        published_at = item.get("providerPublishTime")
        if published_at:
            try:
                published_at = time.strftime(
                    "%Y-%m-%d %H:%M:%S",
                    time.localtime(int(published_at))
                )
            except Exception:
                published_at = str(published_at)
        else:
            published_at = ""

        articles.append({
            "id": i,
            "title": item.get("title", "").strip(),
            "source": item.get("publisher", "Yahoo Finance"),
            "url": item.get("link", ""),
            "published_at": published_at,
            "summary": item.get("summary", "") or item.get("title", ""),
        })

    return [x for x in articles if x["title"]]


def fetch_news_mock(asset: str) -> list[dict]:
    """Fallback mock news with unified schema (same fields as real source)."""
    return [
        {"id": 1, "title": f"{asset} market sentiment remains cautious as investors watch macro data", "source": "mock", "url": "", "published_at": "", "summary": "Investors focus on inflation, rate expectations, and earnings."},
        {"id": 2, "title": "Technology sector resilience supports broad market risk appetite", "source": "mock", "url": "", "published_at": "", "summary": "Large-cap technology earnings remain a key support."},
        {"id": 3, "title": "Valuation and policy uncertainty remain market risks", "source": "mock", "url": "", "published_at": "", "summary": "Valuation pressure and policy uncertainty may limit upside."},
    ]


def fetch_market_news(ticker: str, limit: int = 10) -> list[dict]:
    """Provider layer: try real source first, fallback to mock."""
    articles = fetch_news_yahoo(ticker, limit=limit)
    if articles:
        return articles
    return fetch_news_mock(ticker)


def validate_evidence_ids(result: dict, news_items: list[dict]) -> dict:
    """Ensure evidence_ids only reference valid article ids."""
    valid_ids = {item["id"] for item in news_items}

    for key in ("key_events", "risk_events"):
        events = result.get(key, [])
        if not isinstance(events, list):
            result[key] = []
            continue

        cleaned_events = []
        for event in events:
            if isinstance(event, dict):
                ids = event.get("evidence_ids", [])
                if not isinstance(ids, list):
                    ids = []
                event["evidence_ids"] = [
                    int(x) for x in ids
                    if isinstance(x, int) and x in valid_ids
                ]
                if not event.get("impact"):
                    event["impact"] = "neutral"
                cleaned_events.append(event)
            elif isinstance(event, str):
                # Gracefully migrate old string-format events
                cleaned_events.append({
                    "event": event,
                    "evidence_ids": [],
                    "impact": "neutral",
                })
        result[key] = cleaned_events

    return result


def analyze_news_with_llm(asset: str, news_items: list[dict[str, Any]], indicators: dict, regime: dict) -> dict:
    fallback = {
        "news_sentiment": "neutral",
        "news_score": 50,
        "news_confidence": 0.5,
        "key_events": [
            {"event": "市场宏观数据受关注", "evidence_ids": [1], "impact": "neutral"},
        ],
        "risk_events": [
            {"event": "宏观不确定性仍然存在", "evidence_ids": [], "impact": "negative"},
        ],
        "summary": "未启用真实 LLM，当前使用 mock 新闻摘要。",
        "impact_on_strategy": "新闻面不改变当前策略判断。",
        "insight": "新闻面中性，对最终交易决策只形成轻微影响。",
    }
    system_prompt = (
        '你是量化交易系统中的 News LLM Agent。你只负责新闻摘要、情绪判断和事件影响分析。'
        '你不能直接建议 Buy/Sell/Hold。'
        '必须返回 JSON：\n'
        '{\n'
        '  "news_sentiment": "negative|neutral|neutral_positive|positive",\n'
        '  "news_score": 0-100,\n'
        '  "news_confidence": 0.0-1.0,\n'
        '  "key_events": [{"event": "...", "evidence_ids": [article_id, ...], "impact": "positive|negative|neutral"}],\n'
        '  "risk_events": [{"event": "...", "evidence_ids": [article_id, ...], "impact": "positive|negative|neutral"}],\n'
        '  "summary": "...",\n'
        '  "impact_on_strategy": "...",\n'
        '  "insight": "..."\n'
        '}\n'
        '注意：evidence_ids 必须引用 news_items 中文章的 "id" 字段，不要引用数组下标。'
    )
    payload = {"asset": asset, "news_items": news_items, "indicators": indicators, "market_regime": regime}
    result = call_llm_json(system_prompt, payload, fallback=fallback)

    # Validate and normalize
    try:
        result["news_score"] = max(0, min(100, int(result.get("news_score", 50))))
    except Exception:
        result["news_score"] = 50

    try:
        result["news_confidence"] = max(0.0, min(1.0, float(result.get("news_confidence", 0.5))))
    except Exception:
        result["news_confidence"] = 0.5

    if not isinstance(result.get("key_events"), list):
        result["key_events"] = []
    if not isinstance(result.get("risk_events"), list):
        result["risk_events"] = []

    # Validate evidence_ids against actual article ids
    result = validate_evidence_ids(result, news_items)

    return result


def run_news_agent(asset: str, indicators: dict, regime: dict) -> dict:
    news_items = fetch_market_news(asset)
    result = analyze_news_with_llm(asset, news_items, indicators, regime)
    result["raw_news"] = news_items
    return result
