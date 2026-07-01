# GLORIX - Build the TN VED knowledge base INSIDE the running tnved container.
# Reads full Excel + PDFs and indexes into the Docker Qdrant service.
$ErrorActionPreference = "Stop"
$Repo    = (Resolve-Path "$PSScriptRoot\..\..").Path
$Infra   = Join-Path $Repo "infra\local"
$Compose = Join-Path $Infra "docker-compose.local.yml"
$EnvFile = Join-Path $Infra ".env.local"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GLORIX - BUILD TN VED KNOWLEDGE BASE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  This indexes the FULL TN VED Excel (>10k codes) + 100 PDFs into" 
Write-Host "  the Docker Qdrant service using the REAL embedder (no mocks)." 
Write-Host "  [!] First build downloads a ~2 GB embedder model and can take a" -ForegroundColor Yellow
Write-Host "      LONG time (tens of minutes on CPU). Keep the laptop awake." -ForegroundColor Yellow
Write-Host ""

# Ensure the container is running
$running = (& docker ps --filter "name=glorix_tnved" --filter "status=running" --format "{{.Names}}") 2>$null
if (-not $running) {
  Write-Host "  [X] glorix_tnved is not running. Start the stack first:" -ForegroundColor Red
  Write-Host "      scripts\windows\START_GLORIX_SERVER.bat"
  exit 1
}

Write-Host "  Running build inside glorix_tnved ..." -ForegroundColor Green
docker compose --env-file $EnvFile -f $Compose --profile core exec tnved python build_knowledge_base.py
$rc = $LASTEXITCODE
Write-Host ""
if ($rc -eq 0) {
  Write-Host "  [OK] Build finished. Verify:" -ForegroundColor Green
  Write-Host "       curl http://localhost:8787/tnved/health   (expect codes_count > 10000, pdf_chunks_count > 0)"
} else {
  Write-Host "  [X] Build exited with code $rc. Check the output above." -ForegroundColor Red
}
exit $rc
