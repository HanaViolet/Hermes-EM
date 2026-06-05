#!/usr/bin/env python3
"""
Start the Trading Agent Flask server.
Handles PYTHONPATH setup automatically so it works from the repo root.

Usage:
    python start_server.py

Env:
    TRADING_SERVER_PORT  default 5000
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

# Ensure project root and trading_agent are importable
_PROJECT_ROOT = Path(__file__).resolve().parent
for _p in (str(_PROJECT_ROOT), str(_PROJECT_ROOT / "trading_agent")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

if __name__ == "__main__":
    port = int(os.environ.get("TRADING_SERVER_PORT", 5000))
    print("=" * 50)
    print("Trading Agent Server — ClawLibrary Backend")
    print(f"Project root : {_PROJECT_ROOT}")
    print(f"Listening    : http://127.0.0.1:{port}")
    print("API:")
    print("  GET  /api/trading/snapshot")
    print("  GET  /api/trading/state")
    print("  POST /api/trading/run")
    print("  POST /api/trading/reset")
    print("  GET  /api/trading/history")
    print("  GET  /api/trading/report/<id>")
    print("=" * 50)

    # Import here so sys.path is already set
    from trading_server.app import app
    app.run(host="127.0.0.1", port=port, debug=False)
