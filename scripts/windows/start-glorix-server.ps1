# GLORIX Local Server Hub - START
# Temporary development backend server on this Windows laptop.
# Starts the WHOLE selected local stack (gateway + qdrant + tnved), not one AI at a time.

$ErrorActionPreference = "Stop"
$Repo     = (Resolve-Path "$PSScriptRoot\..\..").Path
$Infra    = Join-Path $Repo "infra\local"
$Compose  = Join-Path $Infra "docker-compose.local.yml"
$EnvFile  = Join-Path $Infra ".env.local"
$LogDir   = Join-Path $Repo "logs\local-server"
$StackProfile = "core"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Info($m){ Write-Host "  $m" }
function Ok($m){ Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "  [!] $m" -ForegroundColor Yellow }
function Err($m){ Write-Host "  [X] $m" -ForegroundColor Red }

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX LOCAL SERVER HUB - START" -ForegroundColor Cyan
Write-Host "  TEMPORARY development server mode" -ForegroundColor Cyan
Write-Host "  (replace with real cloud infra before launch)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Load .env.local (for ports / tunnel url). Create from example if missing.
if (-not (Test-Path $EnvFile)) {
  Warn ".env.local not found - creating from .env.local.example (edit it, then re-run)."
  Copy-Item (Join-Path $Infra ".env.local.example") $EnvFile
}
$cfg = @{}
Get-Content $EnvFile | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
  $k,$v = $_ -split '=',2; $cfg[$k.Trim()] = $v.Trim()
}
$GatewayPort = if ($cfg.GLORIX_LOCAL_GATEWAY_PORT) { $cfg.GLORIX_LOCAL_GATEWAY_PORT } else { "8787" }
$OllamaUrl   = if ($cfg.OLLAMA_BASE_URL) { $cfg.OLLAMA_BASE_URL } else { "http://localhost:11434" }
$OllamaModel = if ($cfg.OLLAMA_MODEL) { $cfg.OLLAMA_MODEL } else { "qwen2.5:7b-instruct-q4_K_M" }
$TunnelUrl   = $cfg.GLORIX_PUBLIC_TUNNEL_URL

# 1) Docker Desktop
Write-Host "`n[1/6] Docker Desktop..."
try { docker info *> $null; Ok "Docker is running" }
catch { Err "Docker Desktop is not running. Start Docker Desktop and re-run."; exit 1 }

# 2) Ollama on host
Write-Host "`n[2/6] Ollama (host)..."
$ollamaOk = $false
try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 "http://localhost:11434/api/tags" *> $null; $ollamaOk = $true; Ok "Ollama reachable on localhost:11434" }
catch { Warn "Ollama not reachable. Install: https://ollama.com/download  then: ollama serve" }

# 3) Model present
Write-Host "`n[3/6] LLM model..."
if ($ollamaOk) {
  $models = (& ollama list) 2>$null
  if ($models -match [regex]::Escape($OllamaModel)) { Ok "Model present: $OllamaModel" }
  else { Warn "Model missing. Run:  ollama pull $OllamaModel" }
} else { Warn "Skipping model check (Ollama not reachable). After install:  ollama pull $OllamaModel" }

# 4) Start the local stack (gateway + qdrant + tnved)
Write-Host "`n[4/6] Starting local stack (profile: $StackProfile)..."
Push-Location $Infra
try {
  docker compose --env-file $EnvFile -f $Compose --profile $StackProfile up -d --build 2>&1 | Tee-Object -FilePath (Join-Path $LogDir "compose-up.log")
  Ok "docker compose up complete"
} catch { Err "docker compose failed - see logs\local-server\compose-up.log"; Pop-Location; exit 1 }
Pop-Location

# 5) Health checks (give services time to boot)
Write-Host "`n[5/6] Health checks..."
Start-Sleep -Seconds 6
function Probe($url){ try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $url).StatusCode -eq 200 } catch { $false } }
if (Probe "http://localhost:$GatewayPort/health") { Ok "Gateway health OK (http://localhost:$GatewayPort/health)" } else { Warn "Gateway not healthy yet" }
if (Probe "http://localhost:$GatewayPort/tnved/health") { Ok "TN VED health OK (/tnved/health)" } else { Warn "TN VED not healthy yet (it builds embeddings/KB on first run - can take a while)" }

# 6) Tunnel (only if configured) + print activation values
Write-Host "`n[6/6] Public tunnel..."
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cf -and (Test-Path "$env:USERPROFILE\.cloudflared\config.yml")) {
  Start-Process -WindowStyle Hidden cloudflared -ArgumentList "tunnel run glorix-local"
  Ok "Started named Cloudflare Tunnel 'glorix-local'"
} else {
  Warn "No named tunnel configured. To expose the gateway, set up a Cloudflare Tunnel:"
  Info "  cloudflared tunnel login"
  Info "  cloudflared tunnel create glorix-local"
  Info "  # route it to http://localhost:$GatewayPort  (see docs/GLORIX_LOCAL_SERVER_HUB.md)"
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX local server is UP (development mode)" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Local gateway : http://localhost:$GatewayPort"
Write-Host "  Hub health    : http://localhost:$GatewayPort/health"
Write-Host "  TN VED health : http://localhost:$GatewayPort/tnved/health"
if ($TunnelUrl) {
  Write-Host "  Public URL    : $TunnelUrl"
  Write-Host "`n  Set these in Vercel (Production + Preview), then redeploy:" -ForegroundColor Yellow
  Write-Host "    TNVED_AI_API_URL=$TunnelUrl/tnved"
  Write-Host "    TNVED_AI_TIMEOUT_MS=8000"
  Write-Host "    VITE_TNVED_AI_ONLY=true"
  Write-Host "    GLORIX_BACKEND_URL=$TunnelUrl   # for future backend services"
} else {
  Write-Host "`n  Public URL not set. After you create the tunnel, put it in infra\local\.env.local as" -ForegroundColor Yellow
  Write-Host "  GLORIX_PUBLIC_TUNNEL_URL=https://glorix-local-api.<your-domain>  then re-run START."
}
Write-Host "  Logs: logs\local-server\"
