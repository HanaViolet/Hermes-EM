"""
Trigger Evaluator V1.5 — evaluates each trigger condition against current values.

Instead of static text like "Risk Score < 35", outputs:
  current_value, target_value, distance, status, priority

Status: "met" | "near" (< 20% gap) | "not_met"
"""
from __future__ import annotations


def evaluate_triggers(
    triggers: list[dict],
    indicators: dict,
    risk: dict,
    backtest: dict,
    news: dict | None = None,
) -> dict:
    """Evaluate all trigger conditions and compute distances."""
    evaluated = []

    rsi = indicators.get("rsi", 50)
    macd = indicators.get("macd", 0)
    macd_signal = indicators.get("macd_signal", 0)
    vol = indicators.get("volatility_20d", 0.15)
    risk_score = risk.get("risk_score", 40)
    news_score = float((news or {}).get("news_score", 50))
    max_dd = backtest.get("max_drawdown", 0)
    sharpe = backtest.get("sharpe_ratio", 0)

    for t in triggers:
        cond = t.get("condition", "")
        typ = t.get("type", "")
        ev = _evaluate_one(cond, typ, rsi, macd, macd_signal, vol, risk_score, news_score, max_dd, sharpe)
        if ev:
            evaluated.append(ev)

    # Sort by priority: near first (actionable), then not_met, then met
    priority_order = {"near": 0, "not_met": 1, "met": 2}
    evaluated.sort(key=lambda x: priority_order.get(x["status"], 1))

    return {"trigger_status": evaluated}


def _evaluate_one(cond: str, typ: str, rsi, macd, macd_signal, vol, risk_score, news_score, max_dd, sharpe) -> dict | None:
    """Parse a trigger condition and evaluate it."""
    cond_lower = cond.lower()

    # Risk Score triggers
    if "risk score" in cond_lower and "<" in cond_lower:
        target = _extract_number_after(cond_lower, "<")
        if target is not None:
            return _build("Risk Score", risk_score, target, "<", typ)
    if "risk score" in cond_lower and ">" in cond_lower:
        target = _extract_number_after(cond_lower, ">")
        if target is not None:
            return _build("Risk Score", risk_score, target, ">", typ)

    # RSI triggers
    if "rsi" in cond_lower and "<" in cond_lower:
        target = _extract_number_after(cond_lower, "<")
        if target is not None and rsi is not None:
            return _build("RSI", rsi, target, "<", typ)
    if "rsi" in cond_lower and ">" in cond_lower:
        target = _extract_number_after(cond_lower, ">")
        if target is not None and rsi is not None:
            return _build("RSI", rsi, target, ">", typ)

    # News Score triggers
    if "news score" in cond_lower and ">" in cond_lower:
        target = _extract_number_after(cond_lower, ">")
        if target is not None:
            return _build("News Score", news_score, target, ">", typ)

    # Volatility triggers
    if "volatility" in cond_lower and "<" in cond_lower:
        target = _extract_number_after(cond_lower, "<")
        if target is not None:
            # vol is in decimal, target might be in percent
            target_dec = target / 100.0 if target > 1 else target
            return _build("Volatility", vol * 100, target_dec * 100, "<", typ)

    # MACD triggers (boolean-style)
    if "macd" in cond_lower and ">" in cond_lower and "signal" in cond_lower:
        if macd is not None and macd_signal is not None:
            current = macd - macd_signal
            return _build_bool("MACD > Signal", current > 0, typ)
    if "macd crosses above signal" in cond_lower:
        if macd is not None and macd_signal is not None:
            current = macd - macd_signal
            return _build_bool("MACD Cross Above Signal", current > 0, typ)

    # Max drawdown triggers
    if "drawdown" in cond_lower and "<" in cond_lower:
        target = _extract_number_after(cond_lower, "<")
        if target is not None:
            # max_dd is negative
            return _build("Max Drawdown", abs(max_dd) * 100, abs(target), "<", typ)

    # Sharpe triggers
    if "sharpe" in cond_lower and ">" in cond_lower:
        target = _extract_number_after(cond_lower, ">")
        if target is not None:
            return _build("Sharpe Ratio", sharpe, target, ">", typ)

    # Fallback: return the raw condition without evaluation
    return {
        "condition": cond,
        "current_value": None,
        "target_value": None,
        "distance": None,
        "status": "unknown",
        "priority": "low",
        "type": typ,
    }


def _build(label: str, current: float, target: float, operator: str, typ: str) -> dict:
    """Build an evaluated numeric trigger."""
    if operator == "<":
        met = current < target
        distance = target - current
        # Gap as percentage of target
        gap_pct = (distance / target * 100) if target != 0 else abs(distance)
    elif operator == ">":
        met = current > target
        distance = current - target
        gap_pct = (distance / target * 100) if target != 0 else abs(distance)
    else:
        met = abs(current - target) < 0.001
        distance = current - target
        gap_pct = 0

    if met:
        status = "met"
        priority = "high" if typ in ("stop_loss", "re_evaluate") else "medium"
    elif gap_pct < 20 or (operator == "<" and distance <= 5) or (operator == ">" and distance <= 5):
        status = "near"
        priority = "high" if typ in ("entry", "confirmation") else "medium"
    else:
        status = "not_met"
        priority = "medium" if typ in ("entry", "confirmation") else "low"

    return {
        "condition": f"{label} {operator} {target}",
        "current_value": round(current, 2),
        "target_value": round(target, 2),
        "distance": round(distance, 2),
        "status": status,
        "priority": priority,
        "type": typ,
    }


def _build_bool(label: str, met: bool, typ: str) -> dict:
    """Build an evaluated boolean trigger."""
    return {
        "condition": label,
        "current_value": "Yes" if met else "No",
        "target_value": "Yes",
        "distance": 0 if met else 1,
        "status": "met" if met else "not_met",
        "priority": "high" if typ in ("stop_loss", "re_evaluate") else "medium",
        "type": typ,
    }


def _extract_number_after(text: str, marker: str) -> float | None:
    """Extract a number after a marker string."""
    idx = text.find(marker)
    if idx < 0:
        return None
    rest = text[idx + len(marker):]
    # Find the first number in the rest
    num_str = ""
    started = False
    for ch in rest:
        if ch.isdigit() or ch == '.' or ch == '-':
            num_str += ch
            started = True
        elif started and not (ch.isdigit() or ch == '.' or ch == '-'):
            break
    try:
        return float(num_str) if num_str else None
    except ValueError:
        return None
