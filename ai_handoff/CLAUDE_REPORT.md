# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/local-server-storage-drive-g

## Last commit hash
585e24f

## Main objective
Make the local server hub store all heavy data on G: (large drive), protecting the small C: drive.

## Changes (docs/scripts/config only — no app logic)
- infra/local/.env.local.example — added storage vars: GLORIX_LOCAL_ROOT, GLORIX_REPO_DIR,
  GLORIX_DOCKER_DATA, OLLAMA_MODELS, QDRANT_STORAGE, HF_HOME, TRANSFORMERS_CACHE, GLORIX_LOG_DIR
  (all under G:\GLORIX_SERVER). Kept existing port/tunnel/mode vars.
- infra/local/docker-compose.local.yml — documented that the Qdrant named volume lives wherever
  Docker Desktop's disk image is (move it to G:), plus a commented explicit-G:-bind option with the
  Windows colon/long-syntax caveat. No data on C: when disk image relocated.
- scripts/windows/first-time-setup-glorix-server.ps1 — detect drives, prefer G:, else prompt/abort;
  create G:\GLORIX_SERVER\{repo,docker-data,ollama-models,qdrant-data,hf-cache,logs,backups};
  create .env.local from example (no overwrite without confirm) and inject the chosen root; warn if
  < 80 GB free; strong warning + YES gate if C:.
- scripts/windows/start-glorix-server.ps1 — load .env.local; print storage root + free space; refuse
  C: unless confirmed; export OLLAMA_MODELS/HF_HOME/TRANSFORMERS_CACHE BEFORE model/KB work; logs to
  GLORIX_LOG_DIR; print storage root in summary.
- scripts/windows/status-glorix-server.ps1 — show free space on root drive + Ollama model path,
  Qdrant storage path, HF cache, log path.
- docs/GLORIX_LOCAL_SERVER_HUB.md — new "Disk space and G: drive setup (do this FIRST)" section:
  what lives on G: vs C:, Docker Desktop disk-image relocation, Ollama OLLAMA_MODELS-before-pull,
  troubleshooting (C: still filling, Docker on C:, Ollama on C:, G: low, model download failed).
- infra/local/README.md — "Disk prep FIRST" section.

## Storage root design
G:\GLORIX_SERVER with subfolders repo, docker-data, ollama-models, qdrant-data, hf-cache, logs, backups.

## C: protection measures
Docker disk image -> G:\GLORIX_SERVER\docker-data; OLLAMA_MODELS -> G: (set before pull); HF_HOME/
TRANSFORMERS_CACHE -> G:; logs -> G:; scripts refuse/great-warn on C:; docs say keep >=20-30 GB free on C:.

## Sandbox run?
NO. No Docker/Ollama/GPU/pwsh in sandbox. Scripts/config prepared and structurally validated only
(JSON+YAML parsed, .bat->.ps1 checked, PowerShell brace balance checked). Not runtime-tested here.

## Validation logs
- npm run build -> built (RC 0; only pre-existing chunk-size warning).
- services.example.json JSON OK; docker-compose.local.yml YAML OK.
- .bat invoke matching .ps1 via %~dp0; PS brace counts balanced.
- No src/api/backend/prisma/package.json changes; generated documents untouched.
- infra/local/.env.local git-ignored; no secrets staged (.env.local.example placeholders only).

## Merged to main
Yes — fast-forward (docs/scripts/config only). See hash above.

## Honest status
Prepared and merged. Storage now defaults to G: with C: protections + troubleshooting. Not
runtime-tested in sandbox; founder runs first-time-setup on the laptop. Legacy autofill stays disabled.

## Handoff prompt for the other agent
> You are Codex. Claude made the local hub store heavy data on G:\GLORIX_SERVER (Docker disk image,
> Ollama models, Qdrant, HF cache, logs) and protect C:. Changes are docs/scripts/config only. Not run
> in sandbox. Do not move data to C:, do not commit .env.local, do not re-enable legacy autofill.
> Update only CODEX_REPORT.md.
