@echo off
title GP Retail ERP - Remove Auto-Start
cd /d "%~dp0"

echo Removing GP Retail ERP Printer Connector from Windows Startup...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$StartupFolder = [Environment]::GetFolderPath('Startup'); $ShortcutPath = \"$StartupFolder\GPRetailPrinterConnector.lnk\"; if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }" >nul 2>nul

echo Stopping any running background connector instances...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo.
echo =================================================================
echo   [SUCCESS] Auto-start removed and background service stopped.
echo =================================================================
echo.
echo Press any key to finish...
pause >nul
