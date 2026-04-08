@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    call npm ci
)
echo Starting dev server...
npm run dev
