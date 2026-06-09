"""
Trading Server — Flask backend for ClawLibrary trading UI.

Serves:
  GET  /api/trading/snapshot   — OpenClawSnapshot from telemetry
  GET  /api/trading/state      — lightweight status {global_status, stage, progress}
  POST /api/trading/run        — submit a trading task
  POST /api/trading/reset      — reset to idle state
  GET  /api/trading/report/<id>— stored report markdown
  GET  /health                 — health check
"""
from __future__ import annotations
import sys
from pathlib import Path

# Robust project-root discovery so this works whether run directly or via start_server.py
_THIS_FILE = Path(__file__).resolve()
_PROJECT_ROOT = _THIS_FILE.parent.parent
for _p in (str(_PROJECT_ROOT), str(_PROJECT_ROOT / "trading_agent"), str(_THIS_FILE.parent)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from flask import Flask, request, jsonify
from flask_cors import CORS

from telemetry import get_snapshot
from runner import start_task, get_result, get_history, get_task_state, cancel_active_task

app = Flask(__name__)
CORS(app)

SUPPORTED_TICKERS = {"SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"}
SUPPORTED_STRATEGIES = {"auto", "ma", "rsi", "momentum"}
MIN_BACKTEST_DAYS = 60
MAX_TRANSACTION_COST = 0.01


# ── API Routes ─────────────────────────────────────────────────

@app.get("/api/trading/snapshot")
def trading_snapshot():
    """Return the full OpenClawSnapshot-compatible trading telemetry."""
    return jsonify(get_snapshot())


@app.get("/api/trading/state")
def trading_state():
    """Lightweight status endpoint for fast polling."""
    snap = get_snapshot()
    t = snap.get("trading", {})
    return jsonify({
        "global_status": t.get("global_status", "idle"),
        "current_stage": t.get("current_stage", "waiting"),
        "progress": t.get("progress", 0),
        "ticker": t.get("ticker"),
        "strategy": t.get("strategy"),
        "decision": t.get("decision"),
        "error": t.get("error"),
    })


def _parse_float(value, default):
    try:
        if value in (None, ""): return default
        return float(value)
    except Exception:
        raise ValueError(f"Invalid float: {value}")

def _validate_date(value: str, name: str):
    from datetime import datetime
    try: return datetime.strptime(value, "%Y-%m-%d")
    except Exception: raise ValueError(f"Invalid {name}: {value}")


@app.post("/api/trading/run")
def trading_run():
    """Submit a trading analysis task. Only one task runs at a time."""
    active = get_task_state()
    if active:
        running = active.get("task", {})
        return jsonify({
            "ok": False,
            "message": f"A task is already running ({running.get('ticker')} {running.get('strategy')}). Please wait.",
            "task_id": active.get("task_id"),
        }), 409

    data = request.get_json(silent=True) or {}
    try:
        ticker = str(data.get("ticker", "SPY")).upper().strip()
        strategy = str(data.get("strategy", "auto")).lower().strip()
        start_date = str(data.get("start_date", "2020-01-01"))
        end_date = str(data.get("end_date", "2024-12-31"))
        transaction_cost = _parse_float(data.get("transaction_cost", 0.001), 0.001)
        start_dt = _validate_date(start_date, "start_date")
        end_dt = _validate_date(end_date, "end_date")
        if start_dt >= end_dt:
            return jsonify({"ok": False, "message": "start_date must be before end_date"}), 400
        if (end_dt - start_dt).days < MIN_BACKTEST_DAYS:
            return jsonify({"ok": False, "message": f"date range must cover at least {MIN_BACKTEST_DAYS} days"}), 400
        if ticker not in SUPPORTED_TICKERS:
            return jsonify({"ok": False, "message": f"unsupported ticker: {ticker}"}), 400
        if strategy not in SUPPORTED_STRATEGIES:
            return jsonify({"ok": False, "message": f"unsupported strategy: {strategy}"}), 400
        if transaction_cost < 0 or transaction_cost > MAX_TRANSACTION_COST:
            return jsonify({"ok": False, "message": f"transaction_cost must be between 0 and {MAX_TRANSACTION_COST}"}), 400
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400

    task_data = {
        "ticker": ticker,
        "start_date": start_date,
        "end_date": end_date,
        "strategy": strategy,
        "transaction_cost": transaction_cost,
    }
    try:
        task_id = start_task(task_data)
    except RuntimeError as exc:
        return jsonify({"ok": False, "message": str(exc)}), 409

    return jsonify({
        "ok": True,
        "task_id": task_id,
        "task": task_data,
        "message": f"Task started: {ticker} {strategy}",
    })


@app.post("/api/trading/reset")
def trading_reset():
    """Reset the workflow state to idle and mark any active task as cancelled."""
    from telemetry import TELEMETRY_PATH
    from trading_agent.utils.office_bridge import reset_telemetry
    cancelled = cancel_active_task()
    try:
        if TELEMETRY_PATH.exists():
            TELEMETRY_PATH.unlink()
    except Exception:
        pass
    try:
        reset_telemetry(None)
    except Exception:
        pass
    return jsonify({
        "ok": True,
        "message": "Workflow reset to idle",
        "cancelled_task_id": cancelled.get("task_id") if cancelled else None,
    })


@app.get("/api/trading/report/<task_id>")
def trading_report(task_id: str):
    """Retrieve a completed task result by task_id."""
    result = get_result(task_id)
    if result is None:
        return jsonify({"ok": False, "message": "Task not found"}), 404
    return jsonify(result)


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "trading-server"})


@app.get("/api/trading/history")
def trading_history():
    """Return the list of completed analysis tasks."""
    return jsonify({"ok": True, "history": get_history()})


# ── OpenClaw-compatible stub endpoints ─────────────────────────
# The ClawLibrary frontend calls these endpoints for room detail
# modals, agent focus, and processes. We return empty/noop responses.

@app.get("/api/openclaw/resource")
def openclaw_resource():
    """Stub: return empty resource items for a room."""
    resource_id = request.args.get("resourceId", "document")
    snap = get_snapshot()
    resources = snap.get("resources", [])
    resource = next((r for r in resources if r.get("id") == resource_id), None)
    items = resource.get("items", []) if resource else []
    return jsonify({"ok": True, "resource": {"items": items}})

@app.get("/api/openclaw/snapshot")
def openclaw_snapshot():
    """OpenClaw-compatible snapshot endpoint backed by trading telemetry."""
    return jsonify(get_snapshot())

@app.get("/api/openclaw/agent-focus")
def openclaw_agent_focus():
    """Stub: return empty agent focus list."""
    return jsonify({"ok": True, "focuses": []})

@app.get("/api/openclaw/processes")
def openclaw_processes():
    """Stub: return empty process list."""
    return jsonify({"ok": True, "processes": []})

@app.get("/api/openclaw/file")
def openclaw_file():
    """Stub: file serving — returns empty."""
    return "", 204

@app.get("/api/openclaw/preview")
def openclaw_preview():
    """Stub: preview — returns empty."""
    return jsonify({"ok": True, "content": ""})

@app.get("/api/openclaw/chat")
def openclaw_chat():
    """Stub: chat messages — returns empty list."""
    return jsonify({"messages": []})

@app.post("/api/openclaw/open")
def openclaw_open():
    """Stub: file open — noop."""
    return jsonify({"ok": True})


# ── Main ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    port = int(os.environ.get("TRADING_SERVER_PORT", 5000))
    print("=" * 50)
    print("Trading Agent Server — ClawLibrary Backend")
    print(f"Listening: http://127.0.0.1:{port}")
    print("API:")
    print("  GET  /api/trading/snapshot")
    print("  GET  /api/trading/state")
    print("  POST /api/trading/run")
    print("  POST /api/trading/reset")
    print("  GET  /api/trading/report/<id>")
    print("=" * 50)
    app.run(host="127.0.0.1", port=port, debug=False)
