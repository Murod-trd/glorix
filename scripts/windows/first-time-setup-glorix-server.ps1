# GLORIX Local Server Hub - FIRST TIME SETUP
# Checks prerequisites and prepares local config. Installs NOTHING silently.
$ErrorActionPreference = "SilentlyContinue"
$Repo    = (Resolve-Path "$PSScriptRoot\..\..").Path
$Infra   = Join-Path $Repo "infra\local"
$EnvEx   = Join-Path $Infra ".env.local.example"
$EnvFile = Join-Path $Infra ".env.local"

function Have($c){ [bool](Get-Command $c -ErrorAction SilentlyContinue) }

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX LOCAL HUB - FIRST TIME SETUP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "`nChecking prerequisites (nothing is installed automatically):"
if (Have docker)      { Write-Host "  [OK] Docker CLI found" -ForegroundColor Green } else { Write-Host "  [--] Docker Desktop MISSING -> https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow }
if (Have ollama)      { Write-Host "  [OK] Ollama found" -ForegroundColor Green }       else { Write-Host "  [--] Ollama MISSING -> https://ollama.com/download" -ForegroundColor Yellow }
if (Have cloudflared) { Write-Host "  [OK] cloudflared found" -ForegroundColor Green }  else { Write-Host "  [--] cloudflared MISSING -> https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/  (or ngrok: https://ngrok.com/download)" -ForegroundColor Yellow }

Write-Host "`nLocal env file:"
if (Test-Path $EnvFile) {
  Write-Host "  [OK] infra\local\.env.local already exists - NOT overwritten (keeps your settings/secrets)" -ForegroundColor Green
} else {
  Copy-Item $EnvEx $EnvFile
  Write-Host "  [OK] created infra\local\.env.local from example - edit ports/tunnel URL as needed" -ForegroundColor Green
}

Write-Host "`nNext steps:"
Write-Host "  1) Start Docker Desktop."
Write-Host "  2) ollama pull qwen2.5:7b-instruct-q4_K_M"
Write-Host "  3) (optional) set up a named Cloudflare Tunnel - see docs\GLORIX_LOCAL_SERVER_HUB.md"
Write-Host "  4) Run START_GLORIX_SERVER.bat"
Write-Host "`n  NOTE: .env.local is git-ignored. Never commit secrets." -ForegroundColor Yellow
