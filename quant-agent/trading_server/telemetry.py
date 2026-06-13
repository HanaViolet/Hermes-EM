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


def _empty_snapshot() -> dict:
    return {
        "mode": "live",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "resources": [],
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
        },
    }
