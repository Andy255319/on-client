@echo off
chcp 65001 >nul
echo [케셰브 앱 시작 중...]
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-alekov.ps1" -Demo
pause