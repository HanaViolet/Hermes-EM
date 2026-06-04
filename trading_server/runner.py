"""
Background runner — invokes run_trading_agent() in a daemon thread.
The trading_agent pushes progress through office_bridge.py which
now writes telemetry directly to trading-telemetry.json.
"""
from __future__ import annotations
import sys
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Ensure both agent/ and trading_agent/ are on sys.path
_AGENT_PARENT = Path(__file__).resolve().parent.parent
_TRADING_AGENT_DIR = _AGENT_PARENT / "trading_agent"
for _p in (str(_AGENT_PARENT), str(_TRADING_AGENT_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# In-memory store for completed task results
_results: dict[str, dict] = {}
_lock = threading.Lock()

# History file — persists across server restarts
_HISTORY_PATH = Path(__file__).resolve().parent / "trading_history.json"
_MAX_HISTORY = 20


def _run_agent_in_background(task: dict, task_id: str) -> None:
    """Entry point for the background thread."""
    try:
        (_AGENT_PARENT / "trading_server" / "diag_thread_started.txt").write_text("thread started", encoding="utf-8")
        from trading_agent.utils.office_bridge import reset_telemetry
        (_AGENT_PARENT / "trading_server" / "diag_after_reset_import.txt").write_text("reset imported", encoding="utf-8")
        reset_telemetry(task)
        (_AGENT_PARENT / "trading_server" / "diag_after_reset_call.txt").write_text("reset called", encoding="utf-8")
        from trading_agent.agent.trading_agent import run_trading_agent
        (_AGENT_PARENT / "trading_server" / "diag_after_agent_import.txt").write_text("agent imported", encoding="utf-8")

        ticker = task.get("ticker", "QQQ")
        start_date = task.get("start_date", "2020-01-01")
        end_date = task.get("end_date", "2024-12-31")
        strategy_name = task.get("strategy", "auto")
        transaction_cost = float(task.get("transaction_cost", 0.001))

        (_AGENT_PARENT / "trading_server" / "diag_calling_agent.txt").write_text(f"calling run_trading_agent({ticker},{strategy_name})", encoding="utf-8")
        result = run_trading_agent(
            ticker=ticker,
            start_date=start_date,
            end_date=end_date,
            strategy_name=strategy_name,
            transaction_cost=transaction_cost,
        )

        (_AGENT_PARENT / "trading_server" / "diag_agent_returned.txt").write_text(f"agent returned: {ticker} decision={result.get('decision',{}).get('decision','?')}", encoding="utf-8")
        decision = result.get("decision", {})
        backtest = result.get("backtest_result", {})
        report_md = result.get("report", "")

        # Store strategy comparison in telemetry
        strategy_scores = result.get("strategy_scores", [])

        # Diagnostic: prove this code runs
        _diag_path = Path(__file__).resolve().parent / "diag_runner_reached.txt"
        _diag_path.write_text(f"RUNNER FINAL: ticker={ticker} decision={decision} backtest_keys={list(backtest.keys())[:5]} strategy_scores_count={len(strategy_scores)}", encoding="utf-8")

        # Push final structured results DIRECTLY to the telemetry JSON file
        import json as _json
        from datetime import datetime as _dt, timezone as _tz
        _path = Path(__file__).resolve().parent.parent / "ClawLibrary" / "src" / "data" / "trading-telemetry.json"
        _snap = _json.loads(_path.read_text(encoding="utf-8")) if _path.exists() else {"mode":"live","resources":[],"recentEvents":[],"focus":{"resourceId":"break_room","detail":"","actorState":"resting"},"activeAgents":[],"activeProcesses":[],"trading":{"logs":[],"summary":{}}}
        _snap.setdefault("trading", {})
        _snap["trading"]["global_status"] = "done"
        _snap["trading"]["current_stage"] = "completed"
        _snap["trading"]["progress"] = 100
        _snap["trading"]["decision"] = f"{decision.get('decision', 'N/A')} ({decision.get('confidence', 'N/A')})"
        _snap["trading"]["summary"] = {
            "decision": decision.get("decision", "N/A"),
            "confidence": decision.get("confidence", "N/A"),
            "selected_strategy": result.get("strategy", task.get("strategy", "?")),
            "total_return": backtest.get("total_return"),
            "sharpe_ratio": backtest.get("sharpe_ratio"),
            "max_drawdown": backtest.get("max_drawdown"),
            "win_rate": backtest.get("win_rate"),
            "trades": backtest.get("number_of_trades"),
        }
        _snap["trading"]["report"] = {"markdown": report_md, "path": ""}
        _snap["trading"]["logs"].append("Workflow completed")
        _snap["generatedAt"] = _dt.now(_tz).isoformat()
        # Update break room
        _found_br = False
        for _r in _snap.setdefault("resources", []):
            if _r["id"] == "break_room":
                _found_br = True
                _r["items"] = [
                    {"id":"br-1","title":"Last: "+ticker,"meta":"info","excerpt":"Completed analysis for "+ticker},
                    {"id":"br-2","title":"Decision: "+str(decision.get('decision','?')),"meta":"metric","excerpt":"Final trading decision"}
                ]
                _r["itemCount"] = 2
                _r["status"] = "done"
            if _r["id"] == "skills" and strategy_scores:
                for sc in strategy_scores:
                    signal = "Buy" if sc.get("return",0) > 0 else "Sell" if sc.get("return",0) < -5 else "Hold"
                    _r["items"].append({"id":"sc-"+sc.get("name","?"),"title":sc.get("name","?")+": score="+str(sc.get("score","?")),"meta":"metric","excerpt":"Return "+str(sc.get("return","?"))+"% | Sharpe "+str(sc.get("sharpe","?"))+" | "+signal})
                _r["itemCount"] = len(_r["items"])
        # Append break_room to visited_rooms pipeline
        _visited = _snap["trading"].setdefault("visited_rooms", [])
        if "break_room" not in _visited:
            _visited.append("break_room")

        # Atomic write
        _tmp = _path.with_suffix(".tmp")
        _tmp.write_text(_json.dumps(_snap, ensure_ascii=False, indent=2), encoding="utf-8")
        _tmp.replace(_path)

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
        tb = traceback.format_exc()
        with _lock:
            _results[task_id] = {
                "ok": False,
                "task": task,
                "error": str(exc),
                "traceback": tb,
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
    import json as _json
    history = _load_history_raw()
    history.insert(0, {
        "task_id": entry["task_id"],
        "ticker": entry["task"]["ticker"],
        "strategy": entry["task"]["strategy"],
        "completed_at": entry["completed_at"],
    })
    # Keep only last N entries
    history = history[:_MAX_HISTORY]
    try:
        _HISTORY_PATH.write_text(_json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_history_raw() -> list:
    import json as _json
    try:
        if _HISTORY_PATH.exists():
            return _json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def get_history() -> list:
    return _load_history_raw()
