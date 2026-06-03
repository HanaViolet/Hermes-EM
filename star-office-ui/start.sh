#!/usr/bin/env bash
# Star Office UI - Production Startup Script
# Usage: bash start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Production Environment ──────────────────────────────────────
export STAR_OFFICE_ENV=production
export FLASK_SECRET_KEY="SoUI-2026-n8xK3mR7pQ2wV9jL5dF1hB6cA4eG0"
export ASSET_DRAWER_PASS="StarOffice@2026!Secure"

# ── Optional: Gemini API (uncomment when ready) ─────────────────
# export GEMINI_API_KEY="your-gemini-api-key"
# export GEMINI_MODEL=nanobanana-pro

# ── Optional: Custom port ───────────────────────────────────────
# export STAR_BACKEND_PORT=19000

echo "========================================="
echo "  Star Office UI - Starting Backend"
echo "  http://127.0.0.1:${STAR_BACKEND_PORT:-19000}"
echo "========================================="

cd backend
python app.py
