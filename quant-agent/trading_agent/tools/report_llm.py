"""
LLM Report Writer — generates the final bilingual report for the Report & Analysis room.

Uses the shared LLM client (trading_agent.tools.llm_client.call_llm_json).
Set LLM_ENABLE=1 and LLM_API_KEY to activate; otherwise returns the deterministic fallback.

Expected output schema:
{
  "executive_summary": {"zh": "...", "en": "..."},
  "suggested_action": {"zh": "...", "en": "..."},
  "key_drivers": [{"zh": "...", "en": "..."}, ...],
  "key_risks": [{"zh": "...", "en": "..."}, ...],
  "references": [{"paper": "...", "paper_url": "...", "why_zh": "...", "why_en": "..."}, ...]
}
"""
from __future__ import annotations
from typing import Any


def _fallback_report(context: dict[str, Any]) -> dict[str, Any]:
    """Deterministic fallback when LLM is disabled or fails."""
    ticker = context.get("ticker", "?")
    decision = context.get("decision", "HOLD").upper()
    strategy_zh = context.get("strategy_name_zh", context.get("strategy_name", ""))
    strategy_en = context.get("strategy_name", "")
    _label_zh = {"BUY": "买入", "SELL": "卖出", "HOLD": "观望"}
    decision_zh = _label_zh.get(decision, decision)
    return {
        "executive_summary": {
            "zh": f"当前对 {ticker} 的决策为 {decision_zh}。系统基于策略信号、风险约束、回测验证和 Agent 共识生成此结果。",
            "en": f"The current decision for {ticker} is {decision}. The system generated this result based on strategy signals, risk constraints, backtest validation, and agent consensus.",
        },
        "suggested_action": {
            "zh": "继续持有现有仓位，等待更强确认信号后再行动。",
            "en": "Maintain current position and wait for stronger confirmation signals before acting.",
        },
        "key_drivers": [
            {"zh": f"策略信号：{decision_zh}", "en": f"Strategy signal: {decision}"},
            {"zh": "风险闸门限制了激进仓位", "en": "Risk gate limits aggressive position sizing"},
            {"zh": "回测验证提供了历史参考", "en": "Backtest validation provides historical reference"},
        ],
        "key_risks": [
            {"zh": "MACD 动能尚未完全确认", "en": "MACD momentum has not fully confirmed"},
            {"zh": "新闻情绪处于中性区间", "en": "News sentiment remains neutral"},
        ],
        "references": [
            {
                "paper": "Edwards & Magee (1948)",
                "paper_url": "https://archive.org/details/technicalanalysi00edwa",
                "why_zh": "策略使用经典均线交叉方法",
                "why_en": "Strategy uses classic moving-average crossover methodology",
            },
        ],
        "_llm_status": "fallback",
        "_llm_note": {
            "zh": "未启用 LLM，当前为规则模板生成。",
            "en": "LLM not enabled; showing rule-based template.",
        },
    }


SYSTEM_PROMPT = """You are a quantitative trading report writer.

Your task: write a concise, professional final report for a single-asset trading decision.

Input context is JSON containing:
- ticker: stock symbol
- decision: final decision (BUY / SELL / HOLD)
- decision_score, confidence: numeric scores
- position_pct: suggested position size
- strategy_name / strategy_name_zh: selected strategy
- signal: latest strategy signal
- risk_gate_status, risk_score, position_limit_pct
- backtest validation, total_return_pct, sharpe, max_drawdown_pct
- indicator trend, rsi_state, macd_signal
- news_sentiment, news_score
- references: list of paper objects with paper / paper_url

Return valid JSON only. No markdown, no explanation outside JSON.

Required output schema:
{
  "executive_summary": {"zh": "中文执行摘要", "en": "English executive summary"},
  "suggested_action": {"zh": "中文建议动作", "en": "English suggested action"},
  "key_drivers": [
    {"zh": "中文驱动1", "en": "English driver 1"},
    ...
  ],
  "key_risks": [
    {"zh": "中文风险1", "en": "English risk 1"},
    ...
  ],
  "references": [
    {"paper": "Author (Year)", "paper_url": "https://...", "why_zh": "中文引用理由", "why_en": "English citation reason"},
    ...
  ]
}

Rules:
- Do not invent numbers. Use only the provided context.
- Keep each bilingual text under 200 characters.
- key_drivers and key_risks should each have 2-5 items.
- Use the references list from context; do not add papers not listed.
- If the decision is HOLD, be cautious and emphasize waiting for confirmation.
"""


def run_llm_report_writer(context: dict[str, Any]) -> dict[str, Any]:
    """Call the shared LLM client to generate the final bilingual report."""
    from trading_agent.tools.llm_client import call_llm_json

    return call_llm_json(SYSTEM_PROMPT, context, fallback=_fallback_report(context), temperature=0.3)
