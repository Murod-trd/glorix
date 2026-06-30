@echo off
REM GLORIX Local Server Hub - START (temporary development server)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-glorix-server.ps1"
pause
