#!/usr/bin/env python3
"""
Start the Streamlit standalone UI for the trading agent.
Handles PYTHONPATH setup automatically so it works from the repo root.

Usage:
    python start_streamlit.py

The script delegates to streamlit after setting up the import paths.
"""
from __future__ import annotations
import os
import subprocess
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent
for _p in (str(_PROJECT_ROOT), str(_PROJECT_ROOT / "trading_agent")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

if __name__ == "__main__":
    app_path = _PROJECT_ROOT / "trading_agent" / "app.py"
    if not app_path.exists():
        print(f"Error: {app_path} not found.", file=sys.stderr)
        sys.exit(1)

    # Export PYTHONPATH for the child streamlit process
    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join(sys.path)

    cmd = [sys.executable, "-m", "streamlit", "run", str(app_path)]
    print(f"Starting Streamlit UI: {' '.join(cmd)}")
    subprocess.run(cmd, env=env)
