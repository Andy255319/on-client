@echo off
chcp 65001 >nul
title 케셰브 (수료 후 단독 실행기)

echo ====================================================
echo   케셰브 수료 후 단독 실행기 (Standalone)
echo   * Node.js 별도 설치 없이 이 PC에서 바로 실행됩니다.
echo ====================================================
echo.

set "PATH=%~dp0bin;%PATH%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-standalone.ps1" -Demo
pause

