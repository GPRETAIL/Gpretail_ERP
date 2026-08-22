@echo off
title GP Retail ERP - Stop Printer Service
cd /d "%~dp0"

echo Stopping GP Retail ERP Silent Printer Service...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>nul
echo Service stopped successfully.
echo.
echo Press any key to close this window...
pause >nul
