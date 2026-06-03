@echo off
REM Star Office UI - Windows Startup Script
REM Usage: double-click or run from terminal

cd /d "%~dp0"

set STAR_OFFICE_ENV=production
set FLASK_SECRET_KEY=SoUI-2026-n8xK3mR7pQ2wV9jL5dF1hB6cA4eG0
set ASSET_DRAWER_PASS=StarOffice@2026!Secure

echo =========================================
echo   Star Office UI - Starting Backend
echo   http://127.0.0.1:19000
echo =========================================

cd backend
python app.py
pause
