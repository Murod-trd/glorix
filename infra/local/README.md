# GLORIX Local Server Hub (infra/local)

Temporary local backend hub for the **whole** GLORIX project, run from the
founder's Windows laptop during development. One START/STOP workflow brings up
the entire selected stack (not one AI at a time).

```
infra/local/
  docker-compose.local.yml   # gateway + qdrant + tnved (+ future profiles)
  gateway/Caddyfile          # the ONLY public surface (via tunnel)
  services.example.json      # service/route registry (copy to services.json)
  .env.local.example         # copy to .env.local (git-ignored)
```

## Disk prep FIRST (small C:, large G:)

Heavy data must live on **G:**, not C:. Create/use `G:\GLORIX_SERVER` with
subfolders `repo, docker-data, ollama-models, qdrant-data, hf-cache, logs, backups`.
`first-time-setup-glorix-server.ps1` creates these and fills `.env.local`.
Then move **Docker Desktop's disk image** to `G:\GLORIX_SERVER\docker-data` and set
**`OLLAMA_MODELS=G:\GLORIX_SERVER\ollama-models`** before pulling the model.
Full details + troubleshooting: `docs/GLORIX_LOCAL_SERVER_HUB.md` →
"Disk space and G: drive setup". Keep >= 20-30 GB free on C:.

## Topology

```
Internet ──HTTPS──> Cloudflare Tunnel ──> Gateway (Caddy :8787, localhost only)
                                              ├── /health            -> static hub health
                                              ├── /tnved/*  (strip)  -> tnved FastAPI :8000
                                              └── /ai/* /core/* /auth/*  (future, commented)

Internal-only (NEVER public): Qdrant :6333, Ollama :11434 (host), Docker, DB.
```

## Run

```powershell
# from anywhere:
scripts\windows\first-time-setup-glorix-server.ps1   # once
scripts\windows\START_GLORIX_SERVER.bat              # start whole stack
scripts\windows\STATUS_GLORIX_SERVER.bat             # check
scripts\windows\STOP_GLORIX_SERVER.bat               # stop whole stack
```

Or directly with compose:

```bash
cd infra/local
docker compose --env-file .env.local -f docker-compose.local.yml --profile core up -d --build
```

## Adding a future service (no new buttons)

1. Add the service to `docker-compose.local.yml` with its own `profiles: ["future-ai"]` (or `future-core`/`database`).
2. Add a route in `gateway/Caddyfile` (uncomment a placeholder, e.g. `/ai/legal/*`).
3. Register it in `services.json`.
4. `START_GLORIX_SERVER` brings it up as part of the stack (extend the profile list in `start-glorix-server.ps1`).

Secrets and `.env.local` are **never** committed.
