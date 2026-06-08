"""
Conflict Resolver V1.5 — analyzes vote conflicts and produces
conflict explanations with resolutions.

Input: agent votes + final decision + risk score
Output: vote_conflicts list with conflict, description, resolution
"""
from __future__ import annotations


def resolve_conflicts(
    votes: list[dict],
    final_decision: str,
    risk: dict,
    indicators: dict,
) -> dict:
    """Return structured conflict explanations."""
    conflicts = []
    dec = final_decision.lower()
    risk_score = risk.get("risk_score", 40)
    rsi = indicators.get("rsi", 50)
    macd = indicators.get("macd", 0)

    # Build vote map
    vote_map = {v["agent"]: v["vote"] for v in votes}
    ind_vote = vote_map.get("Indicator", "hold")
    news_vote = vote_map.get("News", "hold")
    risk_vote = vote_map.get("Risk", "hold")
    bt_vote = vote_map.get("Backtest", "hold")

    # ── Conflict 1: News vs Risk ──
    if news_vote != risk_vote and news_vote != "hold" and risk_vote != "hold":
        if risk_score >= 40:
            resolution = "Risk gate has higher priority than news sentiment in elevated risk environments."
        else:
            resolution = "Low risk environment allows news sentiment to carry more weight."
        conflicts.append({
            "conflict": "News vs Risk",
            "description": f"News is {news_vote.upper()}, but Risk signals {risk_vote.upper()} (score {risk_score}).",
            "resolution": resolution,
        })
    elif news_vote != dec and news_vote != "hold" and risk_vote == dec:
        conflicts.append({
            "conflict": "News vs Final Decision",
            "description": f"News favors {news_vote.upper()}, but final decision is {dec.upper()} due to risk constraints.",
            "resolution": "Risk gate dominates when risk score is elevated; news is secondary." if risk_score >= 40 else "Other dimensions outweigh news sentiment.",
        })

    # ── Conflict 2: Backtest vs Indicator ──
    if bt_vote != ind_vote and bt_vote != "hold" and ind_vote != "hold":
        if macd is not None and abs(macd) < 0.5:
            resolution = "Current MACD confirmation is weak — wait for stronger indicator signal before following backtest."
        elif rsi is not None and 40 <= rsi <= 60:
            resolution = "RSI is neutral — current indicator confirmation is insufficient despite favorable backtest."
        else:
            resolution = "Current indicators and backtest disagree; prefer current indicators for real-time decisions."
        conflicts.append({
            "conflict": "Backtest vs Indicator",
            "description": f"Backtest favors {bt_vote.upper()}, but current indicators signal {ind_vote.upper()}.",
            "resolution": resolution,
        })
    elif bt_vote != dec and bt_vote != "hold" and ind_vote == "hold":
        conflicts.append({
            "conflict": "Backtest vs Current Signal",
            "description": f"Backtest is favorable ({bt_vote.upper()}), but current indicators are neutral.",
            "resolution": "Historical performance does not override weak current confirmation — wait for clearer signal." if dec == "hold" else "Other dimensions override backtest.",
        })

    # ── Conflict 3: News vs Backtest ──
    if news_vote != bt_vote and news_vote != "hold" and bt_vote != "hold":
        conflicts.append({
            "conflict": "News vs Backtest",
            "description": f"News signals {news_vote.upper()}, but backtest favors {bt_vote.upper()}.",
            "resolution": "Backtest reflects historical strategy performance; news reflects current sentiment. Both are weighted in the final score.",
        })

    # ── Conflict 4: Risk vs Backtest ──
    if risk_vote != bt_vote and risk_vote != "hold" and bt_vote != "hold":
        if risk_score >= 50:
            resolution = "High risk environment overrides favorable backtest — safety first."
        else:
            resolution = "Low risk allows backtest performance to have stronger influence."
        conflicts.append({
            "conflict": "Risk vs Backtest",
            "description": f"Risk signals {risk_vote.upper()}, but backtest favors {bt_vote.upper()}.",
            "resolution": resolution,
        })

    # ── Conflict 5: Indicator vs Risk ──
    if ind_vote != risk_vote and ind_vote != "hold" and risk_vote != "hold":
        if risk_score >= 50:
            resolution = "Risk gate blocks indicator signal in high-risk regime."
        else:
            resolution = "Low risk allows indicator signals to execute freely."
        conflicts.append({
            "conflict": "Indicator vs Risk",
            "description": f"Indicators signal {ind_vote.upper()}, but risk assessment says {risk_vote.upper()}.",
            "resolution": resolution,
        })

    # ── Conflict 6: Majority vs Final ──
    buy_count = sum(1 for v in votes if v["vote"] == "buy")
    sell_count = sum(1 for v in votes if v["vote"] == "sell")
    if dec == "hold" and (buy_count >= 2 or sell_count >= 2):
        dominant = "BUY" if buy_count > sell_count else "SELL"
        conflicts.append({
            "conflict": "Majority vs Final Decision",
            "description": f"Majority of agents favor {dominant}, but final decision is HOLD.",
            "resolution": "Risk constraints or weak confirmation override majority opinion — wait for stronger alignment." if risk_score >= 35 else "Additional confirmation required before acting on majority signal.",
        })

    return {"vote_conflicts": conflicts}
