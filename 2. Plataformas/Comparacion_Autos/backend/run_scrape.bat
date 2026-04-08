@echo off
cd /d "%~dp0"

REM Activar entorno virtual
call .venv\Scripts\activate.bat

REM Correr scraper y guardar log con fecha
set LOGFILE=scrape_log.txt
echo. >> %LOGFILE%
echo ============================== >> %LOGFILE%
echo %DATE% %TIME% >> %LOGFILE%
echo ============================== >> %LOGFILE%
python run_scrape.py >> %LOGFILE% 2>&1

echo Scraper terminado. Ver scrape_log.txt para detalles.
