"""
Vote Aggregator Agent — collects votes from each analytical dimension
and produces a structured scoreboard for the final decision panel.
"""
from __future__ import annotations


def aggregate_votes(
    indicators: dict,
    news: dict,
    risk: dict,
    backtest: dict,
    strategy_scores: list[dict],
) -> dict:
    """Return votes from Indicator, News, Risk, and Backtest agents."""
    votes = []

    # ── Indicator Vote ──
    rsi = indicators.get("rsi", 50)
    macd = indicators.get("macd", 0)
    ind_score = 50
    ind_vote = "hold"
    if rsi is not None:
        if rsi < 30:
            ind_score = 75 + (30 - rsi)
            ind_vote = "buy"
        elif rsi > 70:
            ind_score = 75 + (rsi - 70)
            ind_vote = "sell"
        else:
            # Linear from 75@30 to 25@70
            ind_score = 50 + (50 - rsi) * 1.25
            ind_vote = "buy" if rsi < 45 else "sell" if rsi > 55 else "hold"
    if macd is not None:
        if macd > 0 and ind_vote == "hold":
            ind_vote = "buy"
            ind_score = max(ind_score, 55)
        elif macd < 0 and ind_vote == "hold":
            ind_vote = "sell"
            ind_score = min(ind_score, 45)
    votes.append({"agent": "Indicator", "vote": ind_vote, "score": round(min(100, max(0, ind_score))), "confidence": round(abs(ind_score - 50) / 50, 2)})

    # ── News Vote ──
    news_score = float(news.get("news_score", 50))
    news_sentiment = news.get("news_sentiment", "neutral")
    if news_score > 60:
        news_vote, news_conf = "buy", min(0.95, (news_score - 50) / 50)
    elif news_score < 40:
        news_vote, news_conf = "sell", min(0.95, (50 - news_score) / 50)
    else:
        news_vote, news_conf = "hold", 0.5
    votes.append({"agent": "News", "vote": news_vote, "score": round(news_score), "confidence": round(news_conf, 2)})

    # ── Risk Vote ──
    risk_score_val = risk.get("risk_score", 40)
    # Lower risk = more buy-friendly
    if risk_score_val < 35:
        risk_vote, risk_conf = "buy", min(0.95, (50 - risk_score_val) / 50)
    elif risk_score_val > 65:
        risk_vote, risk_conf = "sell", min(0.95, (risk_score_val - 50) / 50)
    else:
        risk_vote, risk_conf = "hold", 0.5
    votes.append({"agent": "Risk", "vote": risk_vote, "score": round(100 - risk_score_val), "confidence": round(risk_conf, 2)})

    # ── Backtest Vote ──
    sharpe = backtest.get("sharpe_ratio", 0)
    total_ret = backtest.get("total_return", 0)
    if sharpe > 0.5 and total_ret > 0:
        bt_vote, bt_score = "buy", min(100, 50 + sharpe * 30 + total_ret * 30)
    elif sharpe < 0 or total_ret < -0.1:
        bt_vote, bt_score = "sell", max(0, 50 + sharpe * 30 + total_ret * 30)
    else:
        bt_vote, bt_score = "hold", 50
    votes.append({"agent": "Backtest", "vote": bt_vote, "score": round(bt_score), "confidence": round(abs(bt_score - 50) / 50, 2)})

    # ── Meta summary ──
    buy_count = sum(1 for v in votes if v["vote"] == "buy")
    sell_count = sum(1 for v in votes if v["vote"] == "sell")
    hold_count = sum(1 for v in votes if v["vote"] == "hold")
    avg_score = sum(v["score"] for v in votes) / len(votes)

    return {
        "agent_votes": votes,
        "summary": {
            "buy_count": buy_count,
            "sell_count": sell_count,
            "hold_count": hold_count,
            "average_score": round(avg_score, 1),
            "dominant": "buy" if buy_count > sell_count and buy_count > hold_count else "sell" if sell_count > buy_count and sell_count > hold_count else "hold",
        },
    }
