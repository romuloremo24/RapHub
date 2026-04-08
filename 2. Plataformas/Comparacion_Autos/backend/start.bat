@echo off
echo ============================================
echo   RadarAuto - Backend
echo ============================================

cd /d "%~dp0"

REM Check Python
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python no encontrado. Instala Python 3.10+
    pause
    exit /b 1
)

REM Create virtual environment if missing
IF NOT EXIST ".venv" (
    echo [INFO] Creando entorno virtual...
    python -m venv .venv
)

REM Activate venv
call .venv\Scripts\activate.bat

REM Install dependencies
echo [INFO] Instalando dependencias...
pip install -r requirements.txt -q

REM Install playwright browsers (only if needed)
IF NOT EXIST ".venv\Lib\site-packages\playwright\driver\node.exe" (
    echo [INFO] Instalando navegadores Playwright...
    playwright install chromium
)

echo.
echo [OK] Iniciando RadarAuto en http://localhost:8000
echo [OK] Abriendo navegador...
echo.
timeout /t 2 /nobreak >nul
start http://localhost:8000
uvicorn main:app --host 0.0.0.0 --port 8000
pause
