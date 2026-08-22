@echo off
title GP Retail ERP - Start Background Printer Service
cd /d "%~dp0"

echo =================================================================
echo   GP Retail ERP - Silent Printer Service (Background Mode)
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
    echo [ERROR] Node.js is not found or not installed on this computer.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Clear port 5001 from older instances
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>nul

:: Start server hidden in background
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

echo [SUCCESS] Silent Printer Service is now RUNNING IN THE BACKGROUND!
echo.
echo - You do NOT need to keep any command prompt window open.
echo - Web POS will automatically silent print to your TVSE thermal printer.
echo - To stop the service anytime, double-click 'stop_service.bat'.
echo.
echo Press any key to close this installer window...
pause >nul
