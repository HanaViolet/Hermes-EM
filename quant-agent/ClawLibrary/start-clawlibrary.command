#!/bin/bash
# ClawLibrary — Panel de visibilidad de ClawBot
cd /Users/marcuss/ClawLibrary

# ── Load OPENAI_API_KEY from openclaw.json ──────────────────────────────────
OPENAI_API_KEY=$(node -e "
try {
  const c = require('/Users/marcuss/.openclaw/openclaw.json');
  process.stdout.write(c.env?.vars?.OPENAI_API_KEY || '');
} catch(e) { process.stdout.write(''); }
" 2>/dev/null)

# ── Kill any stale auto-focus.mjs processes ─────────────────────────────────
pkill -f "node scripts/auto-focus.mjs" 2>/dev/null || true
pkill -f "node.*auto-focus.mjs" 2>/dev/null || true
sleep 1

# ── Start auto-focus sidecar ────────────────────────────────────────────────
LOG_FILE="/tmp/auto-focus-$(date +%Y%m%d).log"
OPENAI_API_KEY="$OPENAI_API_KEY" node scripts/auto-focus.mjs >> "$LOG_FILE" 2>&1 &
AUTO_FOCUS_PID=$!
echo "[ClawLibrary] auto-focus.mjs started (PID: $AUTO_FOCUS_PID, log: $LOG_FILE)"

# ── Cleanup on exit ─────────────────────────────────────────────────────────
cleanup() {
  echo "[ClawLibrary] Shutting down auto-focus.mjs (PID: $AUTO_FOCUS_PID)..."
  kill "$AUTO_FOCUS_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Start ClawLibrary (blocking) ─────────────────────────────────────────────
npm run dev
