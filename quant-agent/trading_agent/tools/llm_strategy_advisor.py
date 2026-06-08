"""LLM Strategy Advisor — provides strategy guidance without making final decisions."""
from __future__ import annotations
from typing import Any
from trading_agent.tools.llm_client import call_llm_json


def run_llm_strategy_advisor(context: dict[str, Any]) -> dict[str, Any]:
    fallback = {"strategy_advice": "cautious_hold", "recommended_focus": ["等待更强趋势确认。","控制仓位，不建议激进买入。","结合风险评分进行保守决策。"], "strategy_adjustment": "将风险敞口限制在中低仓位。", "impact_on_decision": "LLM 建议只作为解释和轻微加权，不直接决定交易动作。", "insight": "技术信号和风险结果没有形成强买入共识，因此建议谨慎。"}
    system_prompt = '你是 LLM Strategy Advisor。你只能基于结构化上下文给出策略建议。你不能直接输出最终 Buy/Sell/Hold 决策。必须返回 JSON：{"strategy_advice":"...","recommended_focus":["..."],"strategy_adjustment":"...","impact_on_decision":"...","insight":"..."}'
    return call_llm_json(system_prompt, context, fallback=fallback)
