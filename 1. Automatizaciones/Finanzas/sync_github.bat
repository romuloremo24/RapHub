@echo off
:: Sincroniza Finanzas (Google Drive) -> GitHub -> Streamlit Cloud
:: Uso: doble click o ejecutar desde terminal

setlocal
set "SRC=C:\dev\programANDO\RapHub\1. Automatizaciones\Finanzas"
set "DEST=C:\tmp\mis-finanzas"
set "PATH=%PATH%;C:\Program Files\GitHub CLI"

echo ══════════════════════════════════════════════
echo   Sync Finanzas → GitHub → Streamlit Cloud
echo ══════════════════════════════════════════════

:: Verificar que el repo local existe
if not exist "%DEST%\.git" (
    echo [!] Repo local no encontrado en %DEST%
    echo     Clonando desde GitHub...
    git clone https://github.com/romuloremo24/mis-finanzas.git "%DEST%"
    if errorlevel 1 (
        echo [ERROR] No se pudo clonar el repo.
        pause
        exit /b 1
    )
)

echo [1/4] Copiando archivos...

:: Copiar archivos principales
xcopy "%SRC%\dashboard.py"       "%DEST%\" /Y /Q >nul
xcopy "%SRC%\requirements.txt"   "%DEST%\" /Y /Q >nul
xcopy "%SRC%\runtime.txt"        "%DEST%\" /Y /Q >nul
xcopy "%SRC%\README.md"          "%DEST%\" /Y /Q >nul
xcopy "%SRC%\.gitignore"         "%DEST%\" /Y /Q >nul

:: Copiar carpetas
xcopy "%SRC%\utils\*"            "%DEST%\utils\"  /Y /Q /E >nul
xcopy "%SRC%\views\*"            "%DEST%\views\"  /Y /Q /E >nul
xcopy "%SRC%\.streamlit\*"       "%DEST%\.streamlit\"  /Y /Q /E >nul
xcopy "%SRC%\.devcontainer\*"    "%DEST%\.devcontainer\" /Y /Q /E >nul

:: Limpiar __pycache__
if exist "%DEST%\utils\__pycache__" rmdir /s /q "%DEST%\utils\__pycache__"
if exist "%DEST%\views\__pycache__" rmdir /s /q "%DEST%\views\__pycache__"

echo [2/4] Verificando cambios...
cd /d "%DEST%"
git add -A

:: Verificar si hay cambios
git diff --cached --quiet
if errorlevel 1 (
    echo [3/4] Cambios detectados, creando commit...
    for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "D=%%c-%%a-%%b"
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "T=%%a:%%b"
    git commit -m "sync: update from local — %D% %T%"
    echo [4/4] Pushing a GitHub...
    git push origin master
    if errorlevel 1 (
        echo [ERROR] Push fallo. Verifica tu autenticacion con: gh auth status
        pause
        exit /b 1
    )
    echo.
    echo ✓ Sincronizacion completada. Streamlit Cloud se actualiza automaticamente.
) else (
    echo [OK] Sin cambios — todo esta sincronizado.
)

echo.
pause
