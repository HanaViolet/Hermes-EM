import sys
import os
import threading

# Add trading_agent to Python path
_TRADING_AGENT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "trading_agent"
)
if _TRADING_AGENT_DIR not in sys.path:
    sys.path.insert(0, _TRADING_AGENT_DIR)

from workflow_state import load_state, update_state, reset_state, save_state


def start_workflow(payload: dict) -> str:
    """Accept task params, initialize workflow state, and run Trading Agent in background."""
    task = {
        "ticker": payload.get("ticker", "QQQ"),
        "start_date": payload.get("start_date", "2020-01-01"),
        "end_date": payload.get("end_date", "2024-12-31"),
        "strategy": payload.get("strategy", "auto"),
        "transaction_cost": payload.get("transaction_cost", 0.001),
    }
    mode = payload.get("mode", "single")

    task_id = f"task_{task['ticker']}_{task['strategy']}"

    update_state({
        "mode": mode,
        "global_status": "syncing",
        "current_stage": "task_received",
        "progress": 5,
        "task": task,
        "cat_id": "trading_cat",
        "cat_status": "syncing",
        "summary": f"Task received: {task['ticker']} ({task['strategy']})",
        "logs": [f"New task: {task}"]
    })

    # Run Trading Agent in background thread
    thread = threading.Thread(
        target=_run_agent_in_background,
        args=(task,),
        daemon=True
    )
    thread.start()

    return task_id


def _run_agent_in_background(task: dict) -> None:
    """Execute Trading Agent and let it push state via office_bridge."""
    try:
        from agent.trading_agent import run_trading_agent

        run_trading_agent(
            ticker=task["ticker"],
            start_date=task["start_date"],
            end_date=task["end_date"],
            strategy_name=task["strategy"],
            transaction_cost=task["transaction_cost"]
        )
    except Exception as e:
        # If the agent itself fails, push error state
        update_state({
            "global_status": "error",
            "current_stage": "failed",
            "progress": 0,
            "cat_id": "trading_cat",
            "cat_status": "error",
            "summary": f"Trading workflow failed: {e}",
            "error": {"message": str(e), "stage": "run_trading_agent"},
            "logs": [f"Error: {str(e)}"]
        })


def handle_action(payload: dict) -> dict:
    """Handle UI actions from frontend."""
    action = payload.get("action", "")
    cat_id = payload.get("cat_id", "")

    if action == "reset_workflow":
        state = reset_state(keep_report=True)
        return {"ok": True, "message": "Workflow reset", "state": state}

    if action == "view_report":
        state = load_state()
        return {"ok": True, "report": state.get("report", {})}

    if action == "clear_cache":
        from pathlib import Path
        import shutil
        cache_dir = Path("data/cache")
        if cache_dir.exists():
            shutil.rmtree(cache_dir)
        return {"ok": True, "message": "Cache cleared"}

    return {"ok": False, "message": f"Unknown action: {action}"}
