"""
Office Bridge — pushes trading workflow progress to the ClawLibrary telemetry
system.  Also retains a fire-and-forget POST to the legacy Star-Office-UI
(port 19000) for backward compatibility.
"""
from __future__ import annotations
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

OFFICE_BASE_URL = "http://127.0.0.1:19000"

# Telemetry output path — same file read by the Flask trading_server
try:
    _TELEMETRY_PATH = Path(__file__).resolve().parent.parent.parent / "ClawLibrary" / "src" / "data" / "trading-telemetry.json"
except Exception:
    _TELEMETRY_PATH = None

# Internal telemetry state (kept in sync with the trading_server's TradingTelemetry)
_telemetry_state: dict = {
    "global_status": "idle",
    "current_stage": "waiting",
    "progress": 0,
    "task": None,
    "summary": None,
    "report": None,
    "error": None,
    "ticker": None,
    "strategy": None,
    "decision": None,
    "logs": [],
    "metrics": {},
    "updated_at": None,
    "visited_rooms": [],
    "strategy_compare": [],
}

# Trading stage → ClawLibrary room / LobsterStateId
STAGE_TO_ROOM: dict[str, str] = {
    "waiting": "break_room",
    "loading_data": "gateway",
    "calculating_indicators": "mcp",
    "selecting_strategy": "skills",
    "checking_risk": "alarm",
    "running_backtest": "task_queues",
    "writing_report": "document",
    "completed": "break_room",
    "failed": "alarm",
}
STAGE_TO_STATE: dict[str, str] = {
    "waiting": "resting",
    "loading_data": "syncing",
    "calculating_indicators": "researching",
    "selecting_strategy": "cataloging",
    "checking_risk": "monitoring",
    "running_backtest": "executing",
    "writing_report": "writing",
    "completed": "resting",
    "failed": "error",
}

ROOM_LABELS: dict[str, dict[str, str]] = {
    "document":    {"en": "Reports & Analysis",       "zh": "报告与分析室"},
    "images":      {"en": "Chart Room",               "zh": "图表分析室"},
    "memory":      {"en": "Strategy Memory",          "zh": "策略记忆库"},
    "skills":      {"en": "Strategy Lab",             "zh": "策略实验室"},
    "gateway":     {"en": "Market Data Room",         "zh": "市场数据室"},
    "log":         {"en": "Execution Logs",           "zh": "执行日志台"},
    "mcp":         {"en": "Indicator Lab",            "zh": "指标实验室"},
    "schedule":    {"en": "Decision Desk",            "zh": "决策调度台"},
    "alarm":       {"en": "Risk Alert Room",          "zh": "风险报警室"},
    "agent":       {"en": "Agent Monitor",            "zh": "运行监控室"},
    "task_queues": {"en": "Backtest Lab",             "zh": "回测实验室"},
    "break_room":  {"en": "Break Room",               "zh": "休息室"},
}


def _build_snapshot() -> dict:
    """Build an OpenClawSnapshot-compatible dict from the internal state."""
    stage: str = _telemetry_state.get("current_stage", "waiting")
    status: str = _telemetry_state.get("global_status", "idle")
    focus_room: str = STAGE_TO_ROOM.get(stage, "break_room")
    actor_state: str = STAGE_TO_STATE.get(stage, "resting")
    task = _telemetry_state.get("task") or {}
    ticker = _telemetry_state.get("ticker") or "?"
    metrics = _telemetry_state.get("metrics") or {}
    raw_summary = _telemetry_state.get("summary")
    summary = raw_summary if isinstance(raw_summary, dict) else {}

    # Build room-specific artifact data
    def _room_items(room_id):
        items = []
        if room_id == "gateway":  # Market Data Room
            items.append({"id":"gw-1","title":"Data Source: Yahoo Finance","meta":"info","excerpt":"OHLCV daily data"})
            rows = len(_telemetry_state.get("logs", []))
            items.append({"id":"gw-2","title":"Rows loaded: " + str(rows),"meta":"metric","excerpt":"Loaded " + str(rows) + " rows for " + ticker})
        elif room_id == "mcp":  # Indicator Lab
            if isinstance(metrics, dict):
                for k, v in metrics.items():
                    if isinstance(v, (int, float)):
                        items.append({"id":"ind-"+k,"title":str(k)+": "+str(round(v,4)),"meta":"metric","excerpt":str(v)})
        elif room_id == "skills":  # Strategy Lab
            items.append({"id":"st-1","title":"Strategy: " + str(task.get("strategy","auto")),"meta":"info","excerpt":"Selected trading strategy"})
            items.append({"id":"st-2","title":"Signal: " + str(summary.get("decision","N/A")),"meta":"metric","excerpt":"Trade signal"})
            # Show strategy comparison if available (auto mode)
            compare = _telemetry_state.get("strategy_compare") or []
            for sc in compare:
                signal = "Buy" if sc.get("return",0) > 0 else "Sell" if sc.get("return",0) < -5 else "Hold"
                items.append({"id":"sc-"+sc.get("name","?"),"title":sc.get("name","?")+": score="+str(sc.get("score","?")),"meta":"metric","excerpt":"Return "+str(sc.get("return","?"))+"% | Sharpe "+str(sc.get("sharpe","?"))+" | "+signal})
        elif room_id == "alarm":  # Risk Room
            items.append({"id":"rk-1","title":"Max DD: " + str(round(summary.get("max_drawdown",0)*100,2))+"%","meta":"metric","excerpt":"Maximum drawdown"})
            items.append({"id":"rk-2","title":"Confidence: " + str(summary.get("confidence","N/A")),"meta":"metric","excerpt":"Decision confidence"})
        elif room_id == "task_queues":  # Backtest Lab
            items.append({"id":"bt-1","title":"Sharpe: " + str(round(summary.get("sharpe_ratio",0),2)),"meta":"metric","excerpt":"Risk-adjusted return"})
            items.append({"id":"bt-2","title":"Return: " + str(round(summary.get("total_return",0)*100,2))+"%","meta":"metric","excerpt":"Total return"})
            items.append({"id":"bt-3","title":"Win Rate: " + str(round(summary.get("win_rate",0)*100,1))+"%","meta":"metric","excerpt":"Trade win rate"})
            items.append({"id":"bt-4","title":"Trades: " + str(summary.get("trades","?")),"meta":"metric","excerpt":"Number of trades"})
        elif room_id == "document":  # Reports
            report = _telemetry_state.get("report") or {}
            md = report.get("markdown","")
            items.append({"id":"rp-1","title":"Report: " + ticker,"meta":"document","excerpt":md[:200] if md else "No report yet"})
        elif room_id == "agent":  # Agent Monitor
            stage_label = {"loading_data":"Data","calculating_indicators":"Indicator","selecting_strategy":"Strategy","checking_risk":"Risk","running_backtest":"Backtest","writing_report":"Report","completed":"Done"}.get(stage,"Idle")
            items.append({"id":"ag-1","title":"Stage: " + stage_label,"meta":"info","excerpt":"Current workflow stage"})
            items.append({"id":"ag-2","title":"Progress: " + str(_telemetry_state.get("progress",0))+"%","meta":"metric","excerpt":"Workflow progress"})
        elif room_id == "break_room":
            if status == "done":
                items.append({"id":"br-1","title":"Last: " + ticker,"meta":"info","excerpt":"Completed analysis for " + ticker})
                items.append({"id":"br-2","title":"Decision: " + str(summary.get("decision","?")),"meta":"metric","excerpt":"Final trading decision"})
        return items

    resources = []
    visited = _telemetry_state.get("visited_rooms", [])
    for room_id, labels in ROOM_LABELS.items():
        items = _room_items(room_id)
        # Room status: active=currently working, done=completed, idle=not visited
        if room_id == focus_room and status != "done" and status != "error":
            status_val = "active"
        elif room_id in visited:
            status_val = "done"
        elif status == "done" and room_id == "break_room":
            status_val = "active"  # Final stop
        elif status == "error" and room_id == "alarm":
            status_val = "alert"
        else:
            status_val = "idle"
        resources.append({
            "id": room_id,
            "title": labels.get("en", room_id),
            "status": status_val,
            "items": items,
            "itemCount": len(items),
            "stats": [
                {"label": "en", "value": labels.get("en", ""), "tone": "neutral"},
                {"label": "zh", "value": labels.get("zh", ""), "tone": "neutral"},
            ],
        })

    # Build recent events from logs
    events = []
    for i, line in enumerate(_telemetry_state.get("logs", [])[-12:]):
        events.append({"resourceId": focus_room, "type": "access", "detail": str(line), "timestamp": _telemetry_state.get("updated_at", "")})

    # Focus detail
    focus_detail = ""
    if stage == "loading_data":
        focus_detail = f"Loading {_telemetry_state.get('ticker', '')} market data"
    elif stage == "completed":
        focus_detail = f"Completed. Decision: {summary.get('decision', 'N/A')}"
    elif stage == "failed":
        focus_detail = _telemetry_state.get("error", {}).get("message", "Error")

    # Active agents
    stage_to_agent = {
        "loading_data": "Data Fetcher", "calculating_indicators": "Indicator Calc",
        "selecting_strategy": "Strategy Selector", "checking_risk": "Risk Controller",
        "running_backtest": "Backtest Engine", "writing_report": "Report Writer",
    }
    agent_name = stage_to_agent.get(stage, "")
    agents = [{"id": stage, "label": agent_name, "status": "active", "focus": STAGE_TO_ROOM.get(stage, "break_room")}] if agent_name else []

    return {
        "mode": "live",
        "generatedAt": _telemetry_state.get("updated_at") or datetime.now(timezone.utc).isoformat(),
        "resources": resources,
        "recentEvents": events,
        "focus": {
            "resourceId": focus_room,
            "detail": focus_detail,
            "reason": {
                "waiting": "Standby", "loading_data": "Data Loading",
                "calculating_indicators": "Indicator Calc", "selecting_strategy": "Strategy Selection",
                "checking_risk": "Risk Check", "running_backtest": "Backtest",
                "writing_report": "Reporting", "completed": "Complete", "failed": "Error",
            }.get(stage, "Ready"),
            "actorState": actor_state,
        },
        "activeAgents": agents,
        "activeProcesses": [],
        "mainActorContext": {"tokens": _telemetry_state.get("progress", 0), "maxTokens": 100, "remaining": 100 - _telemetry_state.get("progress", 0)},
        "trading": {
            "ticker": _telemetry_state.get("ticker"),
            "strategy": _telemetry_state.get("strategy"),
            "global_status": status,
            "current_stage": stage,
            "progress": _telemetry_state.get("progress", 0),
            "summary": summary,
            "report": _telemetry_state.get("report"),
            "error": _telemetry_state.get("error"),
            "decision": _telemetry_state.get("decision"),
            "logs": _telemetry_state.get("logs", []),
            "visited_rooms": _telemetry_state.get("visited_rooms", []),
        },
    }


def _persist_telemetry() -> None:
    """Write telemetry to the JSON file consumed by ClawLibrary frontend.
    Uses atomic write (temp file + rename) with retry for Windows file locks."""
    if not _TELEMETRY_PATH:
        return
    payload = json.dumps(_build_snapshot(), ensure_ascii=False, indent=2)
    _TELEMETRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = _TELEMETRY_PATH.with_suffix(".tmp")
    for attempt in range(5):
        try:
            tmp.write_text(payload, encoding="utf-8")
            tmp.replace(_TELEMETRY_PATH)
            return
        except PermissionError:
            if attempt < 4:
                import time
                time.sleep(0.02 * (attempt + 1))
        except Exception as _e:
            # Log error but don't crash — frontend just gets stale data for one cycle
            import traceback as _tb
            try:
                _err_path = _TELEMETRY_PATH.with_suffix(".err.log")
                _err_path.write_text(f"{datetime.now(timezone.utc).isoformat()} persist error: {_e}\n{_tb.format_exc()}", encoding="utf-8")
            except Exception:
                pass
            return


def reset_telemetry(task: dict | None = None) -> None:
    """Reset telemetry state for a new task run."""
    _telemetry_state["global_status"] = "syncing" if task else "idle"
    _telemetry_state["current_stage"] = "loading_data" if task else "waiting"
    _telemetry_state["progress"] = 5 if task else 0
    _telemetry_state["task"] = task
    _telemetry_state["ticker"] = task.get("ticker") if task else None
    _telemetry_state["strategy"] = task.get("strategy") if task else None
    _telemetry_state["summary"] = None
    _telemetry_state["report"] = None
    _telemetry_state["error"] = None
    _telemetry_state["decision"] = None
    _telemetry_state["logs"] = [f"Task: {task.get('ticker','?')} {task.get('strategy','?')}"] if task else []
    _telemetry_state["metrics"] = {}
    _telemetry_state["visited_rooms"] = []
    _telemetry_state["strategy_compare"] = []
    _telemetry_state["updated_at"] = datetime.now(timezone.utc).isoformat()
    _persist_telemetry()


def update_workflow(
    global_status=None,
    current_stage=None,
    progress=None,
    cat_id=None,
    cat_status=None,
    summary=None,
    details=None,
    logs=None,
    task=None,
    result_summary=None,
    report=None,
    error=None,
):
    # ── Update internal telemetry state ──────────────────────
    if global_status:
        _telemetry_state["global_status"] = global_status
    if current_stage:
        _telemetry_state["current_stage"] = current_stage
        # Track which room this stage maps to
        room = STAGE_TO_ROOM.get(current_stage)
        if room and room not in _telemetry_state.setdefault("visited_rooms", []):
            _telemetry_state["visited_rooms"].append(room)
    if progress is not None:
        _telemetry_state["progress"] = progress
    if result_summary:
        # result_summary is the actual result dict — store as structured summary + decision
        _telemetry_state["summary"] = result_summary
        _telemetry_state["decision"] = result_summary.get("decision", "?")
    elif summary:
        # summary is a status message; if it looks like a completion message, use as decision
        s = str(summary)
        if s.startswith("Completed.") or s.startswith("Decision:"):
            _telemetry_state["decision"] = s
        # Also store as a log line for intermediate status updates
        # Don't overwrite decision for non-completion summaries
        _telemetry_state["summary"] = result_summary
    if report:
        _telemetry_state["report"] = report
    if error:
        _telemetry_state["error"] = error
    if task:
        _telemetry_state["task"] = task
        _telemetry_state["ticker"] = task.get("ticker")
        _telemetry_state["strategy"] = task.get("strategy")

    # Append logs
    if details and isinstance(details, dict):
        # Merge per-stage details (indicators, strategy scores, etc.) into metrics
        _telemetry_state.setdefault("metrics", {})
        for k, v in details.items():
            if isinstance(v, (int, float)):
                _telemetry_state["metrics"][k] = round(float(v), 4)
            elif k == "strategies" and isinstance(v, list):
                # Store strategy comparison data (overwrite each time)
                _telemetry_state["strategy_compare"] = v
                _telemetry_state.setdefault("logs", []).append(f"Strategies compared: {len(v)} candidates")

    if logs:
        if isinstance(logs, list):
            for line in logs:
                _telemetry_state.setdefault("logs", []).append(str(line))
        else:
            _telemetry_state.setdefault("logs", []).append(str(logs))

    _telemetry_state["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Persist to JSON file for frontend polling
    _persist_telemetry()

    # ── Legacy: fire-and-forget POST to Star-Office-UI ───────
    payload = {}
    if global_status is not None:
        payload["global_status"] = global_status
    if current_stage is not None:
        payload["current_stage"] = current_stage
    if progress is not None:
        payload["progress"] = progress
    if cat_id is not None:
        payload["cat_id"] = cat_id
    if cat_status is not None:
        payload["cat_status"] = cat_status
    if summary is not None:
        payload["summary"] = summary
    if details is not None:
        payload["details"] = details
    if logs is not None:
        payload["logs"] = logs
    if task is not None:
        payload["task"] = task
    if result_summary is not None:
        payload["result_summary"] = result_summary
    if report is not None:
        payload["report"] = report
    if error is not None:
        payload["error"] = error

    try:
        requests.post(f"{OFFICE_BASE_URL}/workflow/update", json=payload, timeout=2)
    except Exception:
        pass
