#!/bin/bash
# Foreman — Autonomous Work Scheduler wrapper
#
# Runs the foreman TypeScript script via tsx.
# Called by launchd every 15 minutes, or manually.
#
# Usage:
#   ./scripts/foreman.sh
#
# LaunchAgent setup (macOS):
#   See scripts/launchd/com.gruai.foreman.plist
#   Copy to ~/Library/LaunchAgents/ and load with:
#   launchctl load ~/Library/LaunchAgents/com.gruai.foreman.plist

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$REPO_DIR/logs"

mkdir -p "$LOG_DIR"

echo "[$(date)] Foreman check starting..."
cd "$REPO_DIR"
npx tsx scripts/foreman.ts 2>&1
echo "[$(date)] Foreman check complete."
