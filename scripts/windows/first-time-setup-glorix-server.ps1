# GLORIX Local Server Hub - FIRST TIME SETUP (storage-aware)
# Checks prerequisites and prepares local config + G: storage folders.
# Installs NOTHING silently. Never overwrites secrets without confirmation.
$ErrorActionPreference = "SilentlyContinue"
$Repo    = (Resolve-Path "$PSScriptRoot\..\..").Path
$Infra   = Join-Path $Repo "infra\local"
$EnvEx   = Join-Path $Infra ".env.local.example"
$EnvFile = Join-Path $Infra ".env.local"

function Have($c){ [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function FreeGB($letter){ try { [math]::Round((Get-PSDrive $letter -ErrorAction Stop).Free/1GB,1) } catch { $null } }
function Update-EnvPaths($file,$root){ (Get-Content $file -Raw).Replace('G:\GLORIX_SERVER', $root) | Set-Content $file -NoNewline -Encoding UTF8 }

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX LOCAL HUB - FIRST TIME SETUP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "`nPrerequisites (nothing is installed automatically):"
if (Have docker)      { Write-Host "  [OK] Docker CLI found" -ForegroundColor Green } else { Write-Host "  [--] Docker Desktop MISSING -> https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow }
if (Have ollama)      { Write-Host "  [OK] Ollama found" -ForegroundColor Green }       else { Write-Host "  [--] Ollama MISSING -> https://ollama.com/download" -ForegroundColor Yellow }
if (Have cloudflared) { Write-Host "  [OK] cloudflared found" -ForegroundColor Green }  else { Write-Host "  [--] cloudflared MISSING -> https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" -ForegroundColor Yellow }

# ---- Storage drive selection (prefer G:) ----
Write-Host "`nStorage drive (keep heavy data OFF C:):"
$root = $null
if (Test-Path "G:\") {
  $free = FreeGB "G"
  Write-Host "  [OK] G: found (free $free GB). Default root: G:\GLORIX_SERVER" -ForegroundColor Green
  $root = "G:\GLORIX_SERVER"
} else {
  Write-Host "  [!] G: drive not found." -ForegroundColor Yellow
  $sel = Read-Host "  Enter a drive letter for GLORIX storage (e.g. D), or press Enter to ABORT"
  if (-not $sel) { Write-Host "  [X] No drive selected. Aborting." -ForegroundColor Red; exit 1 }
  $sel = ($sel -replace '[:\\]','').ToUpper()
  if (-not (Test-Path "$sel`:\")) { Write-Host "  [X] Drive $sel`: not found. Aborting." -ForegroundColor Red; exit 1 }
  $root = "$sel`:\GLORIX_SERVER"
}

$drv  = $root.Substring(0,1)
$free = FreeGB $drv
if ($drv -eq "C") {
  Write-Host "  [!!] STRONG WARNING: C: is the small system drive. Heavy server data will fill it" -ForegroundColor Red
  Write-Host "       and can destabilize Windows. G: is strongly recommended." -ForegroundColor Red
  $ok = Read-Host "  Type YES to continue on C: anyway"
  if ($ok -ne "YES") { Write-Host "  [X] Aborted (good choice)." -ForegroundColor Yellow; exit 1 }
}
if ($null -ne $free -and $free -lt 80) {
  Write-Host "  [!] Drive $drv`: has only $free GB free (recommended >= 80 GB for models + images + KB)." -ForegroundColor Yellow
}

# ---- Create folders ----
$subs = @("repo","docker-data","ollama-models","qdrant-data","hf-cache","logs","backups")
foreach ($s in $subs) { New-Item -ItemType Directory -Force -Path (Join-Path $root $s) | Out-Null }
Write-Host "  [OK] Created folders under $root :" -ForegroundColor Green
$subs | ForEach-Object { Write-Host "        $root\$_" }

# ---- .env.local ----
Write-Host "`nLocal env file:"
if (Test-Path $EnvFile) {
  Write-Host "  [OK] infra\local\.env.local exists - NOT overwritten (keeps your settings/secrets)" -ForegroundColor Green
  $upd = Read-Host "  Update its storage paths to $root ? (y/N)"
  if ($upd -eq "y") { Update-EnvPaths $EnvFile $root; Write-Host "  [OK] Storage paths updated." -ForegroundColor Green }
} else {
  Copy-Item $EnvEx $EnvFile
  if ($root -ne "G:\GLORIX_SERVER") { Update-EnvPaths $EnvFile $root }
  Write-Host "  [OK] Created infra\local\.env.local with storage root $root" -ForegroundColor Green
}

Write-Host "`nNext steps:"
Write-Host "  1) Docker Desktop > Settings > Resources > Advanced > Disk image location = $root\docker-data"
Write-Host "  2) Set Windows env var  OLLAMA_MODELS=$root\ollama-models  then restart Ollama"
Write-Host "  3) ollama pull qwen2.5:7b-instruct-q4_K_M   (ONLY after step 2, or it lands on C:)"
Write-Host "  4) (optional) set up a named Cloudflare Tunnel - see docs\GLORIX_LOCAL_SERVER_HUB.md"
Write-Host "  5) Run START_GLORIX_SERVER.bat"
Write-Host "`n  NOTE: .env.local is git-ignored. Never commit secrets." -ForegroundColor Yellow
