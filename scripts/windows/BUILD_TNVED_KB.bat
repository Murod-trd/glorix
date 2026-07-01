@echo off
REM GLORIX - Build TN VED knowledge base inside the tnved container (first run is SLOW)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-tnved-kb.ps1"
pause
