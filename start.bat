@echo off
title Keshev App Launcher
echo ===================================================
echo   Keshev Security Dashboard Launcher
echo ===================================================

cd /d "%~dp0"

if not exist "tools\start-alekov.ps1" (
    echo [ERROR] tools\start-alekov.ps1 not found!
    echo Please make sure you EXTRACT ALL FILES from the ZIP first.
    echo (Do not run directly from inside the archive program)
    echo.
    pause
    exit /b 1
)

if not exist "src\server.mjs" (
    echo [ERROR] src\server.mjs not found!
    echo Please make sure you extract the entire folder.
    echo.
    pause
    exit /b 1
)

echo Starting application in Demo mode...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-alekov.ps1" -Demo

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Application terminated with code %ERRORLEVEL%.
    pause
)
