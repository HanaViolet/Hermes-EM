"""
Background runner — invokes run_trading_agent() in a daemon thread.
All telemetry writes (update_workflow + room_artifacts) are handled
inside run_trading_agent() itself.
"""
from __future__ import annotations
import sys
import json as _json
import math
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
_active_task: dict | None = None
_cancelled_task_ids: set[str] = set()
_lock = threading.Lock()

# History file
_HISTORY_PATH = Path(__file__).resolve().parent / "trading_history.json"
_RESULTS_PATH = Path(__file__).resolve().parent / "trading_results.json"
_MAX_HISTORY = 20
_MAX_RESULTS = 50


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _safe_float(value):
    try:
        if value is None:
            return None
        num = float(value)
        return num if math.isfinite(num) else None
    except Exception:
        return None


def _safe_int(value):
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _compact_curve(value, limit: int = 1200) -> list[float]:
    if value is None:
        return []
    try:
        if hasattr(value, "tolist"):
            value = value.tolist()
        values = [_safe_float(v) for v in value]
    except Exception:
        return []

    values = [v for v in values if v is not None]
    if len(values) <= limit:
        return values

    step = max(1, math.ceil(len(values) / limit))
    return values[::step][:limit]


def _safe_backtest_summary(backtest: dict) -> dict:
    """Return a compact, JSON-safe backtest payload for API responses."""
    if not isinstance(backtest, dict):
        return {}

    summary = {}
    float_keys = [
        "total_return",
        "benchmark_total_return",
        "annual_return",
        "annual_volatility",
        "sharpe_ratio",
        "max_drawdown",
        "benchmark_max_drawdown",
        "win_rate",
    ]
    for key in float_keys:
        summary[key] = _safe_float(backtest.get(key))

    trades = backtest.get("trades", backtest.get("number_of_trades"))
    summary["trades"] = _safe_int(trades)
    summary["number_of_trades"] = summary["trades"]

    equity_curve = backtest.get("equity_curve")
    benchmark_curve = backtest.get("benchmark_curve")
    frame = backtest.get("data")
    if equity_curve is None and hasattr(frame, "__getitem__"):
        try:
            equity_curve = frame["strategy_curve"]
        except Exception:
            pass
    if benchmark_curve is None and hasattr(frame, "__getitem__"):
        try:
            benchmark_curve = frame["benchmark_curve"]
        except Exception:
            pass

    summary["equity_curve"] = _compact_curve(equity_curve)
    summary["benchmark_curve"] = _compact_curve(benchmark_curve)
    return summary


def _compact_result(result: dict) -> dict:
    return {
        "ticker": result.get("ticker"),
        "strategy": result.get("strategy"),
        "decision": result.get("decision", {}),
        "backtest": _safe_backtest_summary(result.get("backtest_result", {})),
        "report": result.get("report", ""),
    }


def _load_results_raw() -> dict:
    try:
        if _RESULTS_PATH.exists():
            payload = _json.loads(_RESULTS_PATH.read_text(encoding="utf-8"))
            return payload if isinstance(payload, dict) else {}
    except Exception:
        pass
    return {}


def _save_results_raw(results: dict) -> None:
    try:
        while len(results) > _MAX_RESULTS:
            results.pop(next(iter(results)))
        _RESULTS_PATH.write_text(_json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _store_result(task_id: str, entry: dict) -> None:
    with _lock:
        _results[task_id] = entry
    persisted = _load_results_raw()
    persisted[task_id] = entry
    _save_results_raw(persisted)


def _is_cancelled(task_id: str) -> bool:
    with _lock:
        return task_id in _cancelled_task_ids


def _forget_cancelled(task_id: str) -> None:
    with _lock:
        _cancelled_task_ids.discard(task_id)


def _clear_active_task(task_id: str) -> None:
    global _active_task
    with _lock:
        if _active_task and _active_task.get("task_id") == task_id:
            _active_task = None


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
            import os
            import time

            # Ensure parent dir exists
            _path.parent.mkdir(parents=True, exist_ok=True)

            # Read existing snapshot or create empty
            if _path.exists():
                _snap = _json.loads(_path.read_text(encoding="utf-8"))
            else:
                _snap = {"mode": "live", "generatedAt": str(datetime.now(timezone.utc)), "resources": [], "recentEvents": [], "focus": {"resourceId": "break_room", "detail": "", "reason": "Ready"}, "trading": {}}

            _snap.setdefault("trading", {})["room_artifacts"] = _all
            for _r in _snap.setdefault("resources", []):
                a = _all.get(_r["id"])
                if a:
                    _r["items"] = [{"id": a["room_id"]+"-"+str(i), "title": m["label"]+": "+str(m["value"]), "meta": m.get("display","metric"), "excerpt": a.get("insight","")} for i,m in enumerate(a.get("metrics",[]))]
                    _r["itemCount"] = len(_r["items"])
                    _r["status"] = a["status"]

            _payload = _json.dumps(_snap, ensure_ascii=False, indent=2)
            _tmp = _path.with_suffix(".tmp")

            # Atomic write with retry for Windows file locks
            for _attempt in range(5):
                try:
                    _tmp.write_text(_payload, encoding="utf-8")
                    os.replace(str(_tmp), str(_path))
                    break
                except PermissionError:
                    if _attempt < 4:
                        time.sleep(0.05 * (_attempt + 1))
                    else:
                        raise

            _log = Path(__file__).resolve().parent / "artifact_write.log"
            _log.write_text(f"[{datetime.now(timezone.utc).isoformat()}] wrote {len(_all)} room artifacts OK", encoding="utf-8")
        except Exception as _e:
            import traceback as _tb
            _err = Path(__file__).resolve().parent / "artifact_error.log"
            try:
                _err.write_text(f"[{datetime.now(timezone.utc).isoformat()}] artifact write error: {_e}\n{_tb.format_exc()}", encoding="utf-8")
            except Exception:
                pass

        if _is_cancelled(task_id):
            entry = {
                "ok": False,
                "cancelled": True,
                "task_id": task_id,
                "task": task,
                "completed_at": _now_iso(),
                "message": "Task was reset before completion.",
            }
            _store_result(task_id, entry)
            _forget_cancelled(task_id)
            reset_telemetry(None)
            return

        entry = {
            "ok": True,
            "task_id": task_id,
            "task": task,
            "completed_at": _now_iso(),
            "result": _compact_result(result),
        }
        _store_result(task_id, entry)
        _save_history(entry)

    except Exception as exc:
        import traceback as _tb
        _err = Path(__file__).resolve().parent / "runner_error_latest.log"
        trace = _tb.format_exc()
        _err.write_text(f"ERROR: {exc}\n\n{trace}", encoding="utf-8")
        cancelled = _is_cancelled(task_id)
        _store_result(task_id, {
            "ok": False,
            "cancelled": cancelled,
            "task_id": task_id,
            "task": task,
            "completed_at": _now_iso(),
            "error": "Task cancelled." if cancelled else str(exc),
        })
        if cancelled:
            _forget_cancelled(task_id)
    finally:
        _clear_active_task(task_id)


def start_task(task: dict) -> str:
    """Launch a trading task in a background daemon thread."""
    import uuid
    task_id = uuid.uuid4().hex[:12]
    global _active_task
    with _lock:
        if _active_task is not None:
            running = _active_task.get("task", {})
            raise RuntimeError(f"A task is already running ({running.get('ticker')} {running.get('strategy')}).")
        _active_task = {
            "task_id": task_id,
            "task": dict(task),
            "started_at": _now_iso(),
        }

    thread = threading.Thread(
        target=_run_agent_in_background,
        args=(task, task_id),
        daemon=True,
    )
    try:
        thread.start()
    except Exception:
        _clear_active_task(task_id)
        raise
    return task_id


def get_result(task_id: str) -> dict | None:
    with _lock:
        result = _results.get(task_id)
    if result is not None:
        return result

    persisted = _load_results_raw()
    result = persisted.get(task_id)
    if result is not None:
        with _lock:
            _results[task_id] = result
    return result


def get_task_state() -> dict | None:
    with _lock:
        return dict(_active_task) if _active_task else None


def cancel_active_task() -> dict | None:
    """Mark the current task as cancelled and release the runner for a fresh task."""
    global _active_task
    with _lock:
        if _active_task is None:
            return None
        task_state = dict(_active_task)
        _cancelled_task_ids.add(task_state["task_id"])
        _active_task = None
        return task_state


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
