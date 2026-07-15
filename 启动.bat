@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting Industry Idle on http://localhost:8080/
echo Press Ctrl+C to stop.
python -m http.server 8080
