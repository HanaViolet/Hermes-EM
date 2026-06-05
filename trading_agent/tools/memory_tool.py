"""
Memory Agent — reads trading history to provide evidence-weighted
adjustments to strategy scores.
"""
from __future__ import annotations


def compute_memory_score(
    history: list[dict],
    ticker: str,
    strategy_name: str,
) -> dict:
    """
    Compute a memory bonus/penalty based on historical performance
    of the same ticker + strategy combination.
    """
    related = [
        h for h in history
        if h.get("ticker") == ticker and h.get("strategy") == strategy_name
    ]

    if not related:
        return {
            "memory_score": 0,
            "sample_count": 0,
            "evidence": "暂无相同资产和策略的历史记录。",
        }

    recent = related[-5:]
    n = len(recent)

    avg_return = sum(h.get("total_return", 0) or 0 for h in recent) / n
    avg_sharpe = sum(h.get("sharpe_ratio", 0) or 0 for h in recent) / n

    memory_score = 0
    reasons = []

    if avg_return > 0.05:
        memory_score += 6
        reasons.append(f"历史平均收益 {avg_return:.1%} 为正向。")
    elif avg_return < -0.05:
        memory_score -= 4
        reasons.append(f"历史平均收益 {avg_return:.1%} 为负向。")
    else:
        reasons.append(f"历史收益 {avg_return:.1%} 接近零。")

    if avg_sharpe > 0.8:
        memory_score += 5
        reasons.append(f"历史 Sharpe {avg_sharpe:.2f} 较高。")
    elif avg_sharpe < 0.3:
        memory_score -= 3
        reasons.append(f"历史 Sharpe {avg_sharpe:.2f} 偏低。")
    else:
        reasons.append(f"历史 Sharpe {avg_sharpe:.2f} 一般。")

    return {
        "memory_score": memory_score,
        "sample_count": n,
        "avg_return": round(avg_return, 4),
        "avg_sharpe": round(avg_sharpe, 2),
        "evidence": " ".join(reasons),
    }
