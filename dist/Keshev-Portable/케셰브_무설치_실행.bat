@echo off
chcp 65001 >nul
title 케셰브 (무설치 포터블 버전)

echo ====================================================
echo   케셰브 관제 대시보드 (무설치 포터블 실행기)
echo   * Node.js 별도 설치 없이 이 PC에서 바로 실행됩니다.
echo ====================================================
echo.

:: 내장된 포터블 Node.js 경로를 PATH 최우선으로 등록
set "PATH=%~dp0bin;%PATH%"

:: 실행
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-alekov.ps1" -Demo
pause

