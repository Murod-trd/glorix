# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/glorix-local-server-hub

## Last commit hash
53a5d1a

## Main objective
Create a reusable LOCAL SERVER HUB for the whole GLORIX project (not TN-VED-only) with ONE START/STOP workflow.

## What was added (docs/scripts/config only — no app logic)
- infra/local/docker-compose.local.yml — gateway + qdrant + tnved; future profiles (future-ai/future-core/database).
- infra/local/gateway/Caddyfile — gateway; /health static, /tnved/* (prefix stripped), commented future routes.
- infra/local/services.example.json — service/route registry (no secrets).
- infra/local/.env.local.example — local ports/tunnel/mocks=0 placeholders.
- infra/local/README.md — hub overview.
- scripts/windows/{START,STOP,STATUS}_GLORIX_SERVER.bat + start/stop/status/first-time-setup .ps1.
- docs/GLORIX_LOCAL_SERVER_HUB.md — full architecture, routes, Vercel wiring, security.
- .gitignore — ignore infra/local/.env.local, services.json, logs/.

## Architecture
Internet → Cloudflare Tunnel → Gateway (Caddy :8787, localhost-bound) → internal services.
ONLY the gateway is public. Qdrant (6333), Ollama (11434, host), Docker, DB stay internal (127.0.0.1).
Gateway: /health (static), /tnved/* → tnved:8000 with /tnved STRIPPED, future /ai/* /core/* /auth/* commented.

## One START/STOP workflow
- START: scripts\windows\START_GLORIX_SERVER.bat  (whole `core` profile: gateway+qdrant+tnved; checks Docker/Ollama/model; health checks; optional tunnel; prints Vercel env values; logs to logs/local-server/).
- STOP:  scripts\windows\STOP_GLORIX_SERVER.bat
- STATUS: scripts\windows\STATUS_GLORIX_SERVER.bat
No per-AI buttons; future services join via compose profiles + a gateway route.

## TNVED_AI_API_URL wiring
Gateway strips /tnved, so set in Vercel: TNVED_AI_API_URL=https://glorix-local-api.<domain>/tnved
(plus TNVED_AI_TIMEOUT_MS=8000, VITE_TNVED_AI_ONLY=true, future GLORIX_BACKEND_URL=https://glorix-local-api.<domain>).
Verified mapping: /tnved/health → localhost:8000/health (matches proxy _client.js expectations).

## Sandbox run?
NO. Sandbox has no Docker Desktop, no Ollama, no GPU, no pwsh. Scripts/configs are prepared and
structurally validated (JSON+compose YAML parsed; .bat→.ps1 refs checked; brace balance checked)
but NOT runtime-tested here. They run on the founder's Windows laptop.

## Validation logs
- npm run build → ✓ built (RC 0; only pre-existing chunk-size warning).
- services.example.json → JSON OK. docker-compose.local.yml → YAML OK.
- .bat invoke matching .ps1 via %~dp0. PowerShell brace counts balanced. ($Profile renamed to $StackProfile.)
- No changes to src/, api/, backend/, prisma/, package.json. Generated documents untouched. No secrets committed.

## Legacy / safety
Legacy TN VED autofill remains DISABLED. Qdrant/Ollama/Docker/DB never exposed publicly. .env.local git-ignored.

## What the founder must do first (on the laptop)
1. Install Docker Desktop, Ollama, cloudflared (links in first-time-setup script).
2. Run first-time-setup-glorix-server.ps1 (creates infra/local/.env.local).
3. ollama pull qwen2.5:7b-instruct-q4_K_M
4. Build the TN VED knowledge base in real mode (see docs/TNVED_AI_DEPLOYMENT.md).
5. Create a named Cloudflare Tunnel → set GLORIX_PUBLIC_TUNNEL_URL in .env.local.
6. START_GLORIX_SERVER.bat → verify /tnved/health → set Vercel env → redeploy.

## Honest status
Prepared and merged (docs/scripts/config only). Not runtime-tested in sandbox. Not yet activated in
production (founder must run it on the laptop + set Vercel env).

## Handoff prompt for the other agent
> You are Codex. Claude added infra/local/* + scripts/windows/* + docs/GLORIX_LOCAL_SERVER_HUB.md: a
> growable local backend hub with ONE START/STOP workflow. Only the Caddy gateway (:8787) is public via
> tunnel; Qdrant/Ollama/DB stay internal; /tnved prefix is stripped for the FastAPI backend. It was not
> run in the sandbox (no Docker/Ollama). Do not expose internal services, do not commit .env.local, do
> not re-enable legacy autofill. Update only CODEX_REPORT.md.
