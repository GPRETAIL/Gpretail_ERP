@echo off
title GP Retail ERP - Install Auto-Start Silent Printer Connector
cd /d "%~dp0"

echo =================================================================
echo   GP Retail ERP - One-Click Auto-Start Installer
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

echo [1/3] Clearing older service instances...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo [2/3] Configuring Windows Startup (starts automatically when PC turns on)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $StartupFolder = [Environment]::GetFolderPath('Startup'); $Shortcut = $WshShell.CreateShortcut(\"$StartupFolder\GPRetailPrinterConnector.lnk\"); $Shortcut.TargetPath = 'powershell.exe'; $Shortcut.Arguments = \"-NoProfile -WindowStyle Hidden -Command `\"Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden`\"\"; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,13'; $Shortcut.Save()" >nul 2>nul

echo [3/3] Starting Silent Printer Service right now...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

echo.
echo =================================================================
echo   [SUCCESS] One-Click Auto-Start Installation Complete!
echo =================================================================
echo.
echo 1. The Silent Printer Connector is now RUNNING in the background.
echo 2. It will AUTO-START automatically every time Windows boots up.
echo 3. You NEVER need to manually open or run any files again.
echo.
echo Press any key to finish...
pause >nul
