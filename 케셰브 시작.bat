@echo off
title Keshev App Demo Launcher
echo ===================================================
echo   Starting Keshev Security Dashboard (Demo Mode)...
echo ===================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-alekov.ps1" -Demo
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Application failed to start.
)
pause
