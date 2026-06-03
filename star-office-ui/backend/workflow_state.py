import json
import os
from pathlib import Path
from datetime import datetime
from copy import deepcopy

STATE_PATH = Path(__file__).resolve().parent / "state" / "workflow_state.json"

# Old state.json for game cat sync
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD_STATE_FILE = os.path.join(ROOT_DIR, "state.json")

# Map workflow state → game state (for cat position)
WF_TO_GAME_STATE = {
    "idle": "idle",
    "syncing": "syncing",
    "running": "working",
    "writing": "working",
    "done": "idle",
    "error": "error",
}

DEFAULT_CATS = {
    "coordinator_cat": {
        "id": "coordinator_cat", "name": "Coordinator Cat", "status": "idle",
        "location": "desk", "task": "Coordinate trading workflow",
        "summary": "Waiting for task.", "details": {}, "logs": []
    },
    "data_cat": {
        "id": "data_cat", "name": "Data Cat", "status": "idle",
        "location": "server_room", "task": "Load market data",
        "summary": "Waiting for ticker.", "details": {}, "logs": []
    },
    "technical_cat": {
        "id": "technical_cat", "name": "Technical Cat", "status": "idle",
        "location": "workbench", "task": "Calculate indicators",
        "summary": "Waiting for market data.", "details": {}, "logs": []
    },
    "strategy_cat": {
        "id": "strategy_cat", "name": "Strategy Cat", "status": "idle",
        "location": "meeting_area", "task": "Select strategy",
        "summary": "Waiting for indicators.", "details": {}, "logs": []
    },
    "risk_cat": {
        "id": "risk_cat", "name": "Risk Cat", "status": "idle",
        "location": "alarm_area", "task": "Check risk",
        "summary": "Waiting for strategy signal.", "details": {}, "logs": []
    },
    "backtest_cat": {
        "id": "backtest_cat", "name": "Backtest Cat", "status": "idle",
        "location": "chart_area", "task": "Run backtest",
        "summary": "Waiting for risk-checked signal.", "details": {}, "logs": []
    },
    "report_cat": {
        "id": "report_cat", "name": "Report Cat", "status": "idle",
        "location": "report_room", "task": "Generate report",
        "summary": "Waiting for backtest result.", "details": {}, "logs": []
    }
}

DEFAULT_STATE = {
    "mode": "single",
    "global_status": "idle",
    "current_stage": "waiting",
    "progress": 0,
    "updated_at": "",
    "task": {},
    "summary": {
        "selected_strategy": None, "decision": None, "confidence": None,
        "total_return": None, "benchmark_return": None,
        "sharpe_ratio": None, "max_drawdown": None, "trades": None
    },
    "single_cat": {
        "id": "trading_cat", "name": "Trading Cat", "status": "idle",
        "current_stage": "waiting", "location": "desk",
        "summary": "Waiting for trading task.", "details": {}, "logs": []
    },
    "cats": deepcopy(DEFAULT_CATS),
    "report": {"markdown": "", "path": ""},
    "error": {"message": "", "stage": ""}
}


def _sync_old_state(state: dict) -> None:
    """Sync workflow state to old state.json so the Phaser game cat moves."""
    global_status = state.get("global_status", "idle")
    game_state = WF_TO_GAME_STATE.get(global_status, "idle")
    detail = state.get("single_cat", {}).get("summary", "") or state.get("current_stage", "")

    old = {
        "state": game_state,
        "detail": detail,
        "progress": state.get("progress", 0),
        "updated_at": state.get("updated_at", datetime.now().isoformat())
    }
    try:
        with open(OLD_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(old, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def load_state() -> dict:
    if not STATE_PATH.exists():
        return deepcopy(DEFAULT_STATE)
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    state["updated_at"] = datetime.now().isoformat()
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    _sync_old_state(state)


def reset_state(keep_report: bool = True) -> dict:
    old_state = load_state()
    state = deepcopy(DEFAULT_STATE)
    if keep_report:
        state["report"] = old_state.get("report", {"markdown": "", "path": ""})
        state["summary"] = old_state.get("summary", state["summary"])
    save_state(state)
    return state


def append_logs(cat: dict, logs: list[str]) -> None:
    cat.setdefault("logs", [])
    cat["logs"].extend(logs)
    cat["logs"] = cat["logs"][-100:]


def update_state(payload: dict) -> dict:
    state = load_state()

    for key in ["mode", "global_status", "current_stage", "progress", "task"]:
        if key in payload:
            state[key] = payload[key]

    if "result_summary" in payload:
        state["summary"].update(payload["result_summary"])

    if "report" in payload:
        state["report"] = payload["report"]

    if "error" in payload:
        state["error"] = payload["error"]

    cat_id = payload.get("cat_id")
    if cat_id:
        target_cat = state["single_cat"] if state.get("mode") == "single" else state["cats"].get(cat_id)
        if target_cat is None:
            state["cats"][cat_id] = {
                "id": cat_id, "name": cat_id, "status": "idle",
                "summary": "", "details": {}, "logs": []
            }
            target_cat = state["cats"][cat_id]

        if "cat_status" in payload:
            target_cat["status"] = payload["cat_status"]
        if "current_stage" in payload:
            target_cat["current_stage"] = payload["current_stage"]
        if "summary" in payload:
            target_cat["summary"] = payload["summary"]
        if "details" in payload:
            target_cat["details"] = payload["details"]
        if "logs" in payload:
            append_logs(target_cat, payload["logs"])

    # Also update single_cat in single mode
    if state.get("mode") == "single" and cat_id:
        single = state["single_cat"]
        if "cat_status" in payload:
            single["status"] = payload["cat_status"]
        if "current_stage" in payload:
            single["current_stage"] = payload["current_stage"]
        if "summary" in payload:
            single["summary"] = payload["summary"]
        if "details" in payload:
            single["details"] = payload["details"]
        if "logs" in payload:
            append_logs(single, payload["logs"])

    # Sync all cats status in multi mode
    if state.get("mode") == "multi":
        for cid, cat in state["cats"].items():
            cat["status"] = cat.get("status", "idle")

    save_state(state)
    return state
