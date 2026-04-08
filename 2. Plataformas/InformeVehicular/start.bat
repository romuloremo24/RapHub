@echo off
cd /d "%~dp0backend"

:: Matar procesos previos en puerto 8001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8001 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

start "" http://localhost:8001
uvicorn main:app --reload --port 8001
pause
