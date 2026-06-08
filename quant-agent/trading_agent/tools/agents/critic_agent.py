"""
Critic Agent V1.5 — reviews the aggregated votes and final decision,
produces objections, failure modes, and a revision suggestion.

Output:
  critic_score: 0-100, how confident the critic is that the decision is correct
  main_objections: list of specific objections against the final decision
  failure_modes: list of scenarios where the decision could go wrong
  revision_suggestion: dict with action, position_delta, reason
"""
from __future__ import annotations


def review_decision(
    votes: list[dict],
    decision: str,
    indicators: dict,
    risk: dict,
    backtest: dict,
    news: dict | None = None,
) -> dict:
    """Return an enriched critic review."""
    main_objections = []
    failure_modes = []
    why_not_buy = []
    why_not_sell = []
    concerns = []

    dec = decision.lower()
    risk_score = risk.get("risk_score", 40)
    rsi = indicators.get("rsi", 50)
    macd = indicators.get("macd", 0)
    sharpe = backtest.get("sharpe_ratio", 0)
    max_dd = backtest.get("max_drawdown", 0)
    total_ret = backtest.get("total_return", 0)
    news_score = float((news or {}).get("news_score", 50))
    news_sentiment = (news or {}).get("news_sentiment", "neutral")

    # ── Analyze vote alignment ──
    buy_count = sum(1 for v in votes if v["vote"] == "buy")
    sell_count = sum(1 for v in votes if v["vote"] == "sell")
    hold_count = sum(1 for v in votes if v["vote"] == "hold")
    disagree_count = sum(1 for v in votes if v["vote"] != dec and v["vote"] != "hold")

    for v in votes:
        if v["vote"] != dec and v["vote"] != "hold":
            concerns.append(f"{v['agent']} signals {v['vote'].upper()} (score {v['score']})")

    # ── Build main objections ──
    # 1. News vs Decision
    if news_score >= 60 and dec == "sell":
        main_objections.append(f"News sentiment is {news_sentiment} (score {round(news_score)}), but final decision is SELL.")
    elif news_score <= 40 and dec == "buy":
        main_objections.append(f"News sentiment is negative (score {round(news_score)}), but final decision is BUY.")
    elif 45 <= news_score <= 55 and dec == "hold" and buy_count > 0:
        main_objections.append("News is neutral, but some agents signal BUY — HOLD may miss early momentum.")

    # 2. Backtest vs Decision
    if total_ret > 0 and sharpe > 0.5 and dec == "sell":
        main_objections.append(f"Backtest is positive (return {round(total_ret*100,1)}%, Sharpe {round(sharpe,2)}), but decision is SELL.")
    elif total_ret < 0 and sharpe < 0 and dec == "buy":
        main_objections.append(f"Backtest is negative (return {round(total_ret*100,1)}%), but decision is BUY.")
    elif total_ret > 0 and dec == "hold" and buy_count >= 2:
        main_objections.append("Backtest return is positive and multiple agents favor BUY, but position remains on HOLD.")

    # 3. Risk vs Decision
    if risk_score >= 40 and dec == "buy":
        main_objections.append(f"Risk score is {risk_score} (elevated), but decision is aggressive BUY.")
    elif risk_score < 30 and dec == "sell" and buy_count > 0:
        main_objections.append(f"Risk score is low ({risk_score}), yet decision is SELL while some agents favor BUY.")

    # 4. Indicator vs Decision
    if rsi is not None:
        if rsi < 35 and dec == "sell":
            main_objections.append(f"RSI is {round(rsi,1)} (near oversold), but decision is SELL — may catch a falling knife.")
        elif rsi > 65 and dec == "buy":
            main_objections.append(f"RSI is {round(rsi,1)} (near overbought), but decision is BUY — may buy at local peak.")
        elif 40 <= rsi <= 60 and dec == "hold" and buy_count > sell_count:
            main_objections.append(f"RSI is neutral ({round(rsi,1)}), but more agents favor BUY than SELL — HOLD may be too conservative.")

    if macd is not None:
        if macd > 0.5 and dec == "sell":
            main_objections.append(f"MACD is positive ({round(macd,3)}), but decision is SELL — momentum contradicts action.")
        elif macd < -0.5 and dec == "buy":
            main_objections.append(f"MACD is negative ({round(macd,3)}), but decision is BUY — momentum contradicts action.")

    # ── Build failure modes ──
    if dec == "hold":
        failure_modes.append("If price breaks above MA20 with volume confirmation, HOLD may miss upside.")
        failure_modes.append("If macro news turns strongly positive and risk drops, current position may be too conservative.")
        if buy_count >= 2:
            failure_modes.append("Multiple agents already signal BUY; waiting for confirmation may result in worse entry price.")
    elif dec == "buy":
        failure_modes.append("If volatility spikes unexpectedly, entry could suffer immediate drawdown.")
        failure_modes.append("If trend reverses after entry without stop-loss trigger, losses may accumulate.")
        if risk_score >= 50:
            failure_modes.append("High risk environment; even valid signals may fail due to broader market stress.")
    elif dec == "sell":
        failure_modes.append("If selling into oversold conditions, price may rebound immediately.")
        failure_modes.append("If positive news emerges right after exit, re-entry cost may be higher.")

    failure_modes.append("If data source has delayed or incorrect close price, all signals could be stale.")

    # ── Why-not analysis ──
    if dec == "buy" or dec == "hold":
        if rsi is not None and rsi > 55:
            why_not_buy.append("RSI is not oversold — no deep-value entry signal")
        if macd is not None and macd < 0:
            why_not_buy.append("MACD is negative — momentum does not support entry")
        if risk_score >= 40:
            why_not_buy.append("Risk gate blocks aggressive entry")
        if max_dd < -0.20:
            why_not_buy.append("Historical max drawdown exceeds -20% — caution warranted")
    if dec == "sell" or dec == "hold":
        if rsi is not None and rsi < 45:
            why_not_sell.append("RSI is not overbought — no momentum exhaustion signal")
        if macd is not None and macd > 0:
            why_not_sell.append("MACD is positive — upward momentum intact")
        if total_ret > 0 and sharpe > 0.5:
            why_not_sell.append("Backtest Sharpe and return are favorable — selling may forego gains")

    # ── Revision suggestion ──
    revision = _suggest_revision(dec, risk_score, buy_count, sell_count, hold_count,
                                 news_score, sharpe, max_dd, rsi, macd)

    # ── Critic score ──
    critic_score = _compute_critic_score(dec, risk_score, buy_count, sell_count,
                                         hold_count, disagree_count, main_objections)

    # ── Verdict (legacy compat) ──
    if disagree_count == 0:
        verdict = "agree"
    elif disagree_count <= 1:
        verdict = "partial"
    else:
        verdict = "disagree"

    return {
        "critic_review": {
            "critic_score": round(critic_score),
            "verdict": verdict,
            "concerns": concerns,
            "main_objections": main_objections,
            "failure_modes": failure_modes,
            "why_not_buy": why_not_buy,
            "why_not_sell": why_not_sell,
            "revision_suggestion": revision,
            "recommendation": _recommendation(verdict, dec, concerns),
        },
    }


def _suggest_revision(dec, risk_score, buy_count, sell_count, hold_count,
                      news_score, sharpe, max_dd, rsi, macd) -> dict:
    """Suggest a revision to the final decision."""
    action = "keep"
    position_delta = 0.0
    reason = "Decision is well-supported by majority vote."

    if dec == "hold":
        if buy_count > sell_count and risk_score < 45:
            if news_score >= 55:
                action = "raise_watch"
                position_delta = 0.10
                reason = "Positive news and more BUY votes suggest raising watch priority."
            elif sharpe > 0.5:
                action = "raise_watch"
                position_delta = 0.05
                reason = "Backtest Sharpe is decent; consider small position if confirmation arrives."
        elif sell_count > buy_count and risk_score >= 50:
            action = "tighten_risk"
            position_delta = -0.05
            reason = "More SELL votes and elevated risk suggest tightening risk controls."

    elif dec == "buy":
        if risk_score >= 55:
            action = "reduce_size"
            position_delta = -0.15
            reason = "High risk environment — reduce position size despite BUY signal."
        elif max_dd < -0.25:
            action = "reduce_size"
            position_delta = -0.10
            reason = "Severe historical drawdown suggests smaller position."
        elif rsi is not None and rsi > 65:
            action = "wait"
            position_delta = -0.20
            reason = "RSI near overbought — consider partial entry or wait for pullback."

    elif dec == "sell":
        if buy_count >= 2 and news_score >= 55:
            action = "reconsider"
            position_delta = 0.10
            reason = "Multiple BUY agents and positive news suggest SELL may be premature."
        elif rsi is not None and rsi < 30:
            action = "wait"
            position_delta = 0.0
            reason = "RSI is oversold — selling now may lock in losses at local bottom."

    return {
        "action": action,
        "position_delta": round(position_delta, 2),
        "reason": reason,
    }


def _compute_critic_score(dec, risk_score, buy_count, sell_count, hold_count,
                          disagree_count, main_objections) -> float:
    """Compute critic confidence score (0-100). Higher = more confident decision is correct."""
    base = 70

    # Penalty for disagreement
    base -= disagree_count * 12

    # Penalty for objections
    base -= len(main_objections) * 8

    # Risk penalty
    if dec == "buy" and risk_score >= 50:
        base -= 10
    elif dec == "sell" and risk_score <= 25:
        base -= 8

    # Majority alignment bonus
    total = buy_count + sell_count + hold_count
    if total > 0:
        if dec == "buy":
            base += (buy_count / total) * 10
        elif dec == "sell":
            base += (sell_count / total) * 10
        else:
            base += (hold_count / total) * 10

    return max(20, min(95, base))


def _recommendation(verdict: str, decision: str, concerns: list) -> str:
    if verdict == "agree":
        return f"All dimensions align with {decision.upper()}. Proceed with standard risk controls."
    if verdict == "partial":
        return f"{decision.upper()} is supported but with reservations. Review concerns before execution."
    return f"{decision.upper()} is not well supported. Consider reducing position size or waiting for confirmation."
