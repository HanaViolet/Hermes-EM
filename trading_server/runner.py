"""
Background runner — invokes run_trading_agent() in a daemon thread.
All telemetry writes (update_workflow + room_artifacts) are handled
inside run_trading_agent() itself.
"""
from __future__ import annotations
import sys
import json as _json
import threading
from datetime import datetime, timezone
from pathlib import Path

# Robust project-root discovery so this works whether run directly or via start_server.py
_THIS_FILE = Path(__file__).resolve()
_PROJECT_ROOT = _THIS_FILE.parent.parent
_TRADING_AGENT_DIR = _PROJECT_ROOT / "trading_agent"
for _p in (str(_PROJECT_ROOT), str(_TRADING_AGENT_DIR), str(_THIS_FILE.parent)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# In-memory store for completed task results
_results: dict[str, dict] = {}
_lock = threading.Lock()

# History file
_HISTORY_PATH = Path(__file__).resolve().parent / "trading_history.json"
_MAX_HISTORY = 20


def _run_agent_in_background(task: dict, task_id: str) -> None:
    """Entry point for the background thread."""
    try:
        from trading_agent.utils.office_bridge import reset_telemetry
        reset_telemetry(task)

        from trading_agent.agent.trading_agent import run_trading_agent

        ticker = task.get("ticker", "QQQ")
        start_date = task.get("start_date", "2020-01-01")
        end_date = task.get("end_date", "2024-12-31")
        strategy_name = task.get("strategy", "auto")
        transaction_cost = float(task.get("transaction_cost", 0.001))

        result = run_trading_agent(
            ticker=ticker,
            start_date=start_date,
            end_date=end_date,
            strategy_name=strategy_name,
            transaction_cost=transaction_cost,
        )

        # Build room_artifacts and write to telemetry
        try:
            from trading_server.artifact_builder import build_room_artifacts
            _all = build_room_artifacts(task, result)
            _path = _PROJECT_ROOT / "ClawLibrary" / "src" / "data" / "trading-telemetry.json"
            if _path.exists():
                _snap = _json.loads(_path.read_text(encoding="utf-8"))
                _snap.setdefault("trading", {})["room_artifacts"] = _all
                for _r in _snap.setdefault("resources", []):
                    a = _all.get(_r["id"])
                    if a:
                        _r["items"] = [{"id": a["room_id"]+"-"+str(i), "title": m["label"]+": "+str(m["value"]), "meta": m.get("display","metric"), "excerpt": a.get("insight","")} for i,m in enumerate(a.get("metrics",[]))]
                        _r["itemCount"] = len(_r["items"])
                        _r["status"] = a["status"]
                _tmp = _path.with_suffix(".tmp")
                _tmp.write_text(_json.dumps(_snap, ensure_ascii=False, indent=2), encoding="utf-8")
                _tmp.replace(_path)
        except Exception as _e:
            _err = Path(__file__).resolve().parent / "artifact_error.log"
            try:
                _err.write_text(f"artifact write error: {_e}", encoding="utf-8")
            except Exception:
                pass

        decision = result.get("decision", {})
        backtest = result.get("backtest_result", {})
        report_md = result.get("report", "")

        entry = {
            "ok": True,
            "task_id": task_id,
            "task": task,
            "completed_at": str(datetime.now(timezone.utc))[:19],
            "result": {
                "ticker": result.get("ticker"),
                "strategy": result.get("strategy"),
                "decision": decision,
                "backtest": backtest,
                "report": report_md,
            },
        }
        with _lock:
            _results[task_id] = entry
        _save_history(entry)

    except Exception as exc:
        import traceback as _tb
        _err = Path(__file__).resolve().parent / "runner_error_latest.log"
        _err.write_text(f"ERROR: {exc}\n\n{_tb.format_exc()}", encoding="utf-8")
        with _lock:
            _results[task_id] = {
                "ok": False,
                "task": task,
                "error": str(exc),
                "traceback": _tb.format_exc(),
            }


def start_task(task: dict) -> str:
    """Launch a trading task in a background daemon thread."""
    import uuid
    task_id = uuid.uuid4().hex[:12]
    thread = threading.Thread(
        target=_run_agent_in_background,
        args=(task, task_id),
        daemon=True,
    )
    thread.start()
    return task_id


def get_result(task_id: str) -> dict | None:
    with _lock:
        return _results.get(task_id)


def _save_history(entry: dict):
    """Append a completed task entry to the history file."""
    history = _load_history_raw()
    history.insert(0, {
        "task_id": entry["task_id"],
        "ticker": entry["task"]["ticker"],
        "strategy": entry["task"]["strategy"],
        "completed_at": entry["completed_at"],
    })
    history = history[:_MAX_HISTORY]
    try:
        _HISTORY_PATH.write_text(_json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_history_raw() -> list:
    try:
        if _HISTORY_PATH.exists():
            return _json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def get_history() -> list:
    return _load_history_raw()
