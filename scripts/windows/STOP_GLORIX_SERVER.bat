@echo off
REM GLORIX Local Server Hub - STOP
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-glorix-server.ps1"
pause
