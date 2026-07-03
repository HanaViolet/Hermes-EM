from trading_agent.tools.decision_score_tool import compute_decision_score
from trading_agent.tools.risk_scoring import compute_dynamic_risk_score
from trading_agent.tools.sentiment_market_tool import normalize_sentiment_market_context


def test_sentiment_market_normalization_flags_overheated_context():
    context = normalize_sentiment_market_context({
        "social_heat": 88,
        "rumor_heat": 72,
        "alert_heat": 45,
        "crowding": 83,
        "liquidity_score": 32,
        "order_book_imbalance": -0.42,
        "market_sentiment": 0.64,
    })

    assert context["sentiment_risk_score"] >= 70
    assert context["risk_zone"] in {"overheated", "panic"}
    assert "rumor_spike" in context["risk_flags"]
    assert "thin_liquidity" in context["risk_flags"]


def test_sentiment_market_increases_dynamic_risk_score():
    backtest = {"max_drawdown": -0.05}
    indicators = {"volatility_20d": 0.12}
    regime = {"volatility_percentile": 0.2, "trend_regime": "uptrend"}

    neutral = compute_dynamic_risk_score(backtest, indicators, regime)
    hot = compute_dynamic_risk_score(
        backtest,
        indicators,
        regime,
        sentiment_market={
            "social_heat": 90,
            "rumor_heat": 80,
            "alert_heat": 50,
            "crowding": 85,
            "liquidity_score": 35,
            "order_book_imbalance": -0.35,
            "market_sentiment": 0.6,
        },
    )

    assert hot["risk_score"] > neutral["risk_score"]
    assert hot["sentiment_contribution"] > neutral["sentiment_contribution"]
    assert hot["sentiment_market_risk"] >= 70


def test_overheated_sentiment_blocks_aggressive_buy():
    regime = {"trend_regime": "uptrend", "strategy_fit": {"ma": 92}}
    strategy_scores = [{"name": "ma", "blended_score": 94}]
    memory = {"memory_score": 4}
    indicators = {"rsi": 45, "macd": 0.8}
    backtest = {"sharpe_ratio": 1.1}
    news = {"news_score": 72}
    low_risk = {"risk_score": 22, "position_pct": 0.7}

    calm = compute_decision_score(
        regime=regime,
        risk=low_risk,
        strategy_scores=strategy_scores,
        memory=memory,
        indicators=indicators,
        backtest=backtest,
        news_result=news,
        sentiment_market={"social_heat": 20, "rumor_heat": 0, "crowding": 20, "liquidity_score": 90},
    )
    overheated = compute_decision_score(
        regime=regime,
        risk=low_risk,
        strategy_scores=strategy_scores,
        memory=memory,
        indicators=indicators,
        backtest=backtest,
        news_result=news,
        sentiment_market={
            "social_heat": 95,
            "rumor_heat": 90,
            "alert_heat": 55,
            "crowding": 90,
            "liquidity_score": 25,
            "market_sentiment": 0.7,
        },
    )

    assert calm["decision"] == "buy"
    assert overheated["decision"] == "hold"
    assert overheated["suggested_position_pct"] <= 0.15
