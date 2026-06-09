"""
Trading Telemetry — reads the telemetry snapshot written by office_bridge.py
and serves it to the ClawLibrary frontend via Flask API.

The telemetry JSON file is written by trading_agent/utils/office_bridge.py
at each workflow stage update.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

TELEMETRY_PATH = Path(__file__).resolve().parent.parent / "ClawLibrary" / "src" / "data" / "trading-telemetry.json"

ROOM_LABELS: dict[str, dict[str, str]] = {
    "document": {"en": "Reports & Analysis", "zh": "报告与分析室", "hint": "生成交易报告、风险提示和结论摘要。"},
    "images": {"en": "Chart Room", "zh": "图表分析室", "hint": "展示价格图、收益曲线和新闻证据。"},
    "memory": {"en": "Strategy Memory", "zh": "策略记忆库", "hint": "复用历史任务表现，辅助当前策略判断。"},
    "skills": {"en": "Strategy Lab", "zh": "策略实验室", "hint": "比较 MA、RSI、Momentum 等策略候选。"},
    "gateway": {"en": "Market Data Room", "zh": "市场数据室", "hint": "读取本地缓存或下载 OHLCV 市场数据。"},
    "log": {"en": "Execution Logs", "zh": "执行日志台", "hint": "记录每一步 Agent 工作流和运行状态。"},
    "mcp": {"en": "Indicator Lab", "zh": "指标实验室", "hint": "计算 MA、RSI、MACD、波动率等指标。"},
    "schedule": {"en": "Decision Desk", "zh": "决策调度台", "hint": "聚合多 Agent 投票、批判和最终决策。"},
    "alarm": {"en": "Risk Alert Room", "zh": "风险报警室", "hint": "评估回撤、波动率和风险等级。"},
    "agent": {"en": "Agent Monitor", "zh": "运行监控室", "hint": "展示 Data、Indicator、Risk、Backtest 等 Agent 状态。"},
    "task_queues": {"en": "Backtest Lab", "zh": "回测实验室", "hint": "运行历史回测并输出收益、夏普和胜率。"},
    "break_room": {"en": "Break Room", "zh": "休息室", "hint": "等待新任务，显示最近一次分析摘要。"},
}

ROOM_TYPES = {
    "gateway": "data",
    "mcp": "indicator",
    "skills": "strategy",
    "memory": "memory",
    "images": "chart",
    "alarm": "risk",
    "schedule": "decision",
    "log": "execution",
    "agent": "monitor",
    "document": "report",
    "task_queues": "backtest",
    "break_room": "idle",
}


def get_snapshot() -> dict:
    """Read the latest trading telemetry snapshot from disk.
    Retries once on JSON decode error (writer may be mid-replace on Windows).
    Always ensures the focus object has a non-null 'reason' field."""
    snap = None
    for attempt in range(2):
        if not TELEMETRY_PATH.exists():
            snap = _empty_snapshot()
            break
        try:
            snap = json.loads(TELEMETRY_PATH.read_text(encoding="utf-8"))
            break
        except (json.JSONDecodeError, OSError):
            if attempt == 0:
                import time
                time.sleep(0.02)
    if snap is None:
        snap = _empty_snapshot()

    _ensure_room_defaults(snap)

    # Ensure focus.reason is never null/undefined — the frontend concatenates it
    focus = snap.get("focus", {})
    if not focus.get("reason"):
        t = snap.get("trading", {})
        stage = t.get("current_stage", "waiting")
        reason_map = {
            "waiting": "Standby",
            "loading_data": "Data Loading",
            "calculating_indicators": "Indicator Calc",
            "selecting_strategy": "Strategy Selection",
            "checking_risk": "Risk Check",
            "running_backtest": "Backtest",
            "writing_report": "Reporting",
            "completed": "Complete",
            "failed": "Error",
        }
        focus["reason"] = reason_map.get(stage, "Ready")
    snap["focus"] = focus
    return snap


def _default_room_artifacts() -> dict:
    artifacts = {}
    now = datetime.now(timezone.utc).isoformat()
    for room_id, labels in ROOM_LABELS.items():
        artifacts[room_id] = {
            "room_id": room_id,
            "room_name": labels["zh"],
            "status": "idle",
            "type": ROOM_TYPES.get(room_id, "idle"),
            "primary": {"label": "状态", "value": "Ready" if room_id == "break_room" else "Idle", "unit": "", "level": "neutral"},
            "summary": labels["hint"],
            "insight": "点击 Run Analysis 后，这个房间会展示对应 Agent 的输入、输出、指标和推理过程。",
            "metrics": [
                {"label": "Room", "value": labels["zh"], "display": "badge", "level": "neutral"},
                {"label": "Status", "value": "idle", "display": "badge", "level": "neutral"},
            ],
            "details": {
                "input": ["等待新的分析任务"],
                "output": [labels["hint"]],
                "reasoning": ["当前为预备状态；运行分析后会由 workflow telemetry 自动更新。"],
            },
            "updated_at": now,
        }
    return artifacts


def _items_from_artifact(room_id: str, artifact: dict) -> list:
    items = []
    for idx, metric in enumerate(artifact.get("metrics") or []):
        label = metric.get("label", "Metric")
        value = metric.get("value", "-")
        items.append({
            "id": f"{room_id}-metric-{idx}",
            "title": f"{label}: {value}",
            "meta": metric.get("display", "metric"),
            "excerpt": artifact.get("insight") or artifact.get("summary") or "",
        })
    if not items:
        items.append({
            "id": f"{room_id}-ready",
            "title": artifact.get("summary") or "Ready",
            "meta": "info",
            "excerpt": artifact.get("insight") or "Run an analysis to populate this room.",
        })
    return items


def _resources_from_artifacts(artifacts: dict, focus_resource_id: str = "break_room") -> list:
    defaults = _default_room_artifacts()
    return [
        _resource_from_artifact(room_id, artifacts.get(room_id) or defaults[room_id], focus_resource_id)
        for room_id in ROOM_LABELS
    ]


def _resource_from_artifact(room_id: str, artifact: dict, focus_resource_id: str = "break_room") -> dict:
    labels = ROOM_LABELS[room_id]
    items = _items_from_artifact(room_id, artifact)
    status = artifact.get("status", "idle")
    if room_id == focus_resource_id and status == "idle":
        status = "active"
    return {
        "id": room_id,
        "title": labels["en"],
        "status": "alert" if status == "error" else status,
        "items": items,
        "itemCount": len(items),
        "stats": [
            {"label": "en", "value": labels["en"], "tone": "neutral"},
            {"label": "zh", "value": labels["zh"], "tone": "neutral"},
        ],
    }


def _ensure_room_defaults(snap: dict) -> None:
    trading = snap.setdefault("trading", {})
    artifacts = trading.get("room_artifacts")
    if not isinstance(artifacts, dict) or not artifacts:
        artifacts = _default_room_artifacts()
        trading["room_artifacts"] = artifacts
    else:
        defaults = _default_room_artifacts()
        for room_id, default_artifact in defaults.items():
            artifacts.setdefault(room_id, default_artifact)

    focus_resource_id = (snap.get("focus") or {}).get("resourceId", "break_room")
    resources = snap.get("resources")
    if not isinstance(resources, list) or not resources:
        snap["resources"] = _resources_from_artifacts(artifacts, focus_resource_id)
        return

    seen = {resource.get("id") for resource in resources if isinstance(resource, dict)}
    for resource in resources:
        if not isinstance(resource, dict):
            continue
        room_id = resource.get("id")
        artifact = artifacts.get(room_id)
        if artifact and not resource.get("items"):
            items = _items_from_artifact(room_id, artifact)
            resource["items"] = items
            resource["itemCount"] = len(items)
    for room_id in ROOM_LABELS:
        if room_id not in seen:
            snap["resources"].append(_resource_from_artifact(room_id, artifacts[room_id], focus_resource_id))


def _empty_snapshot() -> dict:
    artifacts = _default_room_artifacts()
    return {
        "mode": "live",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "resources": _resources_from_artifacts(artifacts),
        "recentEvents": [],
        "focus": {"resourceId": "break_room", "detail": "", "reason": "resting", "actorState": "resting"},
        "activeAgents": [],
        "activeProcesses": [],
        "mainActorContext": {"tokens": 0, "maxTokens": 100, "remaining": 100},
        "trading": {
            "ticker": None,
            "strategy": None,
            "global_status": "idle",
            "current_stage": "waiting",
            "progress": 0,
            "summary": None,
            "report": None,
            "error": None,
            "decision": None,
            "logs": [],
            "visited_rooms": [],
            "room_artifacts": artifacts,
        },
    }
