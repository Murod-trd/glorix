# GLORIX Local Server Hub - STOP
$ErrorActionPreference = "SilentlyContinue"
$Repo    = (Resolve-Path "$PSScriptRoot\..\..").Path
$Infra   = Join-Path $Repo "infra\local"
$Compose = Join-Path $Infra "docker-compose.local.yml"
$EnvFile = Join-Path $Infra ".env.local"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX LOCAL SERVER HUB - STOP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1) Tunnel (if started by us)
Write-Host "`n[1/3] Stopping Cloudflare Tunnel (if running)..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  done"

# 2) Stop the whole compose stack (gateway + tnved + qdrant)
Write-Host "`n[2/3] Stopping local stack..."
Push-Location $Infra
docker compose --env-file $EnvFile -f $Compose --profile core down
Pop-Location
Write-Host "  done"

# 3) Done
Write-Host "`n[3/3] Cleanup complete."
Write-Host "`n  GLORIX local server mode is OFF" -ForegroundColor Green
