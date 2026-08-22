@echo off
title GP Retail ERP - Silent Printer Connector
cd /d "%~dp0"

echo =================================================================
echo   GP Retail ERP - Silent Printer Connector Service
echo =================================================================
echo.

set "NODE_EXE=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "D:\Program Files\nodejs\node.exe" set "NODE_EXE=D:\Program Files\nodejs\node.exe"
    if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
    if exist "C:\Program Files (x86)\nodejs\node.exe" set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
)

"%NODE_EXE%" -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found on this computer.
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if "%1"=="configure" (
    "%NODE_EXE%" configure.js
    pause
    exit /b 0
)

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo Starting Local Silent Printer Service on ws://127.0.0.1:5001
echo.
echo =================================================================
echo   Keep this terminal window open in background for silent print.
echo =================================================================
echo.

"%NODE_EXE%" server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server exited with code %errorlevel%
)

pause
