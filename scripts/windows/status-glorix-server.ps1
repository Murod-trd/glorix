# GLORIX Local Server Hub - STATUS (storage-aware)
$ErrorActionPreference = "SilentlyContinue"
$Repo    = (Resolve-Path "$PSScriptRoot\..\..").Path
$Infra   = Join-Path $Repo "infra\local"
$EnvFile = Join-Path $Infra ".env.local"
$cfg = @{}
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object { $k,$v = $_ -split '=',2; $cfg[$k.Trim()] = $v.Trim() }
}
$GatewayPort = if ($cfg.GLORIX_LOCAL_GATEWAY_PORT) { $cfg.GLORIX_LOCAL_GATEWAY_PORT } else { "8787" }
$Root        = if ($cfg.GLORIX_LOCAL_ROOT) { $cfg.GLORIX_LOCAL_ROOT } else { "G:\GLORIX_SERVER" }
function FreeGB($letter){ try { [math]::Round((Get-PSDrive $letter -ErrorAction Stop).Free/1GB,1) } catch { "unknown" } }
function Check($name,$test){ if (& $test) { Write-Host ("  [OK]  {0}" -f $name) -ForegroundColor Green; return $true } else { Write-Host ("  [--]  {0}" -f $name) -ForegroundColor Yellow; return $false } }
function Probe($url){ try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 $url).StatusCode -eq 200 } catch { $false } }

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX LOCAL SERVER HUB - STATUS" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "`nStorage:"
$drv = $Root.Substring(0,1)
Write-Host "  Root         : $Root  (free $(FreeGB $drv) GB on $drv`:)"
Write-Host "  Ollama models: $(if($cfg.OLLAMA_MODELS){$cfg.OLLAMA_MODELS}else{'(default - check OLLAMA_MODELS!)'})"
Write-Host "  Qdrant data  : $(if($cfg.QDRANT_STORAGE){$cfg.QDRANT_STORAGE}else{'(Docker named volume / disk image location)'})"
Write-Host "  HF cache     : $(if($cfg.HF_HOME){$cfg.HF_HOME}else{'(default)'})"
Write-Host "  Logs         : $(if($cfg.GLORIX_LOG_DIR){$cfg.GLORIX_LOG_DIR}else{Join-Path $Root 'logs'})"

Write-Host "`nServices:"
$d = Check "Docker"               { try { docker info *> $null; $true } catch { $false } }
$o = Check "Ollama (11434)"       { Probe "http://localhost:11434/api/tags" }
$q = Check "Qdrant (6333)"        { Probe "http://localhost:6333/healthz" }
$g = Check "Gateway ($GatewayPort)"  { Probe "http://localhost:$GatewayPort/health" }
$t = Check "TN VED (/tnved/health)"  { Probe "http://localhost:$GatewayPort/tnved/health" }
$tn = Check "Cloudflare Tunnel"   { [bool](Get-Process cloudflared -ErrorAction SilentlyContinue) }

Write-Host ""
if ($d -and $g -and $t) { Write-Host "  READY: gateway + TN VED reachable" -ForegroundColor Green }
else { Write-Host "  NOT READY: some services are down (run START_GLORIX_SERVER)" -ForegroundColor Yellow }
