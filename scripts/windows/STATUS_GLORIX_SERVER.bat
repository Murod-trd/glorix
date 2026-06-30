@echo off
REM GLORIX Local Server Hub - STATUS
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0status-glorix-server.ps1"
pause
