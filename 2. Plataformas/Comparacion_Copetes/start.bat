@echo off
title Copetón
color 0A

echo.
echo  ===================================================
echo    Iniciando Copeton...
echo  ===================================================
echo.

cd /d "%~dp0"

:: Verificar que Node.js este instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js no encontrado.
    echo  Descarga Node.js desde https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo  Instalando dependencias por primera vez...
    echo  Esto puede tardar unos minutos...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo  ERROR: Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo.
    echo  Dependencias instaladas correctamente.
    echo.
)

:: Cerrar servidor anterior si ya esta corriendo en el puerto 3000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo  Cerrando servidor anterior ^(PID %%a^)...
    taskkill /PID %%a /F /T >nul 2>&1
)

:: Esperar a que se libere el puerto
timeout /t 1 /nobreak >nul

echo  Servidor en http://localhost:3000
echo  El navegador se abrira automaticamente...
echo  Para detener el servidor: presiona Ctrl+C
echo.

:: Abrir el navegador automaticamente despues de 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Iniciar servidor (la ventana permanece abierta con los logs)
node server.js

if %errorlevel% neq 0 (
    echo.
    echo  ===================================================
    echo   ERROR: El servidor se cerro con un error.
    echo   Revisa el mensaje de arriba para diagnosticar.
    echo  ===================================================
)

echo.
pause
