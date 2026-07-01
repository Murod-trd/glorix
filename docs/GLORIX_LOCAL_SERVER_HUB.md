# GLORIX Local Server Hub

A reusable, growable **local backend hub** for the whole GLORIX project, hosted
temporarily on the founder's Windows laptop while the platform is in development.
When the platform is ready to launch, this is replaced by real cloud infra.

> Scope: this hub serves **all** GLORIX backend services — TN VED AI now, and
> future AI assistants, core backend, and databases later — behind ONE gateway
> and ONE START/STOP workflow. It is NOT TN-VED-only.

## Disk space and G: drive setup (do this FIRST)

This laptop has a small **C:** drive (~39 GB free) and a larger **G:** drive
(~120 GB free). Heavy local-server data MUST live on **G:**, never on C:.

### What goes on G: vs C:

| Lives on **G:** `G:\GLORIX_SERVER\...` | Stays on **C:** |
|---|---|
| `docker-data` (Docker images/containers/volumes, incl. Qdrant) | Windows + apps |
| `ollama-models` (the ~4.7 GB LLM) | Docker Desktop / Ollama program files |
| `qdrant-data`, `hf-cache` (embedder cache), `logs`, `backups`, `repo` | keep **>= 20-30 GB free** for stability |

Run `scripts\windows\first-time-setup-glorix-server.ps1` first — it creates
`G:\GLORIX_SERVER\{repo,docker-data,ollama-models,qdrant-data,hf-cache,logs,backups}`
and writes the paths into `infra\local\.env.local`.

### Docker Desktop — move its disk image to G:

By default Docker Desktop stores everything in a single virtual disk on C:.
Move it so images/containers/volumes land on G:

1. Docker Desktop → **Settings → Resources → Advanced**.
2. **Disk image location** → `G:\GLORIX_SERVER\docker-data`.
3. Set the **disk usage limit** to a sane value (e.g. **80-100 GB** if free).
4. Apply & Restart. Keep at least **20-30 GB free on C:** for Windows.

Because the Qdrant container uses a Docker named volume, moving the disk image is
what puts Qdrant data on G: (no fragile Windows bind-mount needed). Advanced users
can instead bind Qdrant to `QDRANT_STORAGE` — see the comments in
`infra/local/docker-compose.local.yml` (the `G:` drive colon needs compose long syntax).

### Ollama — store models on G:

The model is ~4.7 GB. **Set the path BEFORE pulling**, or it lands on C:

1. Set a Windows **user environment variable**:
   `OLLAMA_MODELS = G:\GLORIX_SERVER\ollama-models`
   (Start → "Edit environment variables for your account").
2. **Restart Ollama** (quit from the tray, start again) so it picks up the var.
3. Then pull the model:
   ```
   ollama pull qwen2.5:7b-instruct-q4_K_M
   ```

> WARNING: Do NOT run `ollama pull` before setting `OLLAMA_MODELS` and restarting
> Ollama — otherwise the model files are written to C: and fill the small drive.

`START_GLORIX_SERVER` also exports `OLLAMA_MODELS`, `HF_HOME`, and
`TRANSFORMERS_CACHE` (from `.env.local`) for the session before any model/KB work,
but the **persistent** Windows env var above is what fixes Ollama for good.

### Troubleshooting

- **C: still losing space:** Docker disk image not moved (re-check Settings →
  Resources → Advanced), or `OLLAMA_MODELS` was set after a pull. Move the Docker
  image, delete the C: copy of the model, re-pull after setting `OLLAMA_MODELS`.
- **Docker still using C:** the disk image relocation needs an Apply & Restart;
  existing data may need to be re-pulled after the move.
- **Ollama still using C:** the env var wasn't applied before restart — set
  `OLLAMA_MODELS`, fully quit Ollama from the tray, start again, verify with
  `ollama list` after re-pull.
- **G: low on space:** raise/lower the Docker disk limit, remove unused images
  (`docker image prune`), or move `hf-cache`/`backups` elsewhere on G:.
- **Model download failed (storage):** free space on G:, confirm `OLLAMA_MODELS`
  points to an existing G: folder, then re-run `ollama pull`.

## Architecture

| Layer | What | Exposure |
|---|---|---|
| Gateway | Caddy reverse proxy, port `8787` | **Public** via Cloudflare Tunnel (only this) |
| TN VED AI | FastAPI (`backend/`), port `8000` | Internal only (via gateway `/tnved`) |
| Qdrant | Vector DB, port `6333` | **Internal only — never public** |
| Ollama | LLM runtime on the host, `11434` | **Internal only — never public** |
| Future AI / Core / DB | profiles `future-ai` / `future-core` / `database` | Internal; routed via gateway when enabled |

Only the **gateway** is published through the tunnel. Qdrant, Ollama, Docker, and
any database stay private (bound to `127.0.0.1`).

## Gateway routes

| Public path | Forwards to | Notes |
|---|---|---|
| `/health` | static | hub health (no internal call) |
| `/tnved/health` | `tnved:8000/health` | **`/tnved` prefix is stripped** |
| `/tnved/classify` | `tnved:8000/classify` | |
| `/tnved/classify/explain` | `tnved:8000/classify/explain` | |
| `/ai/procurement/*` | future | commented placeholder |
| `/ai/legal/*`, `/ai/contract/*` | future | commented placeholder |
| `/core/*` | future core API | commented placeholder |
| `/auth/*` | future backend auth | commented placeholder |

Prefix stripping matters: the Vercel `/api/tnved-ai` proxy expects
`TNVED_AI_API_URL` to be a base that serves `/health`, `/classify`,
`/classify/explain` at its root. With the `/tnved` prefix stripped by the
gateway, `TNVED_AI_API_URL = https://<public>/tnved` works correctly:
`https://<public>/tnved/health` → `localhost:8000/health`.

## One START/STOP workflow

| Action | Command |
|---|---|
| First-time setup | `scripts\windows\first-time-setup-glorix-server.ps1` |
| **START** (whole stack) | `scripts\windows\START_GLORIX_SERVER.bat` |
| **STOP** (whole stack) | `scripts\windows\STOP_GLORIX_SERVER.bat` |
| **STATUS** | `scripts\windows\STATUS_GLORIX_SERVER.bat` |

`START_GLORIX_SERVER` orchestrates the entire `core` profile (gateway + qdrant +
tnved), checks Docker/Ollama/model, runs health checks, optionally starts the
tunnel, and prints the exact Vercel env values. There is no per-AI button.

## Build the TN VED knowledge base (first run)

The TN VED backend needs its knowledge base indexed into the Docker Qdrant service
before `/tnved/health` reports real `codes_count` / `pdf_chunks_count`. After the
stack is up (`START_GLORIX_SERVER`), run once:

```
scripts\windows\BUILD_TNVED_KB.bat
```
(equivalently: `docker compose --env-file infra/local/.env.local -f infra/local/docker-compose.local.yml --profile core exec tnved python build_knowledge_base.py`)

This reads the full Excel (`docs/reference_data/tnved`, mounted read-only) and the
100 PDFs (`docs/explanations`, mounted read-only) and indexes them into Qdrant using
the real embedder. **First build downloads a ~2 GB model and can take tens of minutes
on CPU — keep the laptop awake.** The embedder cache persists in a named volume, so
later rebuilds are faster.

Runtime wiring (set by compose, do not change): the container reaches Qdrant via
`QDRANT_URL=http://qdrant:6333` (`USE_EMBEDDED_QDRANT=0`) and Ollama on the host via
`OLLAMA_BASE_URL` / `OLLAMA_HOST=http://host.docker.internal:11434`.

## Connecting Vercel to the local hub

After the tunnel is up and `/tnved/health` is healthy, set in Vercel
(Production + Preview) and redeploy:

```
TNVED_AI_API_URL=https://glorix-local-api.<your-domain>/tnved
TNVED_AI_TIMEOUT_MS=8000
VITE_TNVED_AI_ONLY=true
# Future whole-backend base (when core/auth move off Vercel):
GLORIX_BACKEND_URL=https://glorix-local-api.<your-domain>
```

If you use a **temporary** tunnel URL (e.g. quick `cloudflared`/ngrok), the URL
changes each run — you must update the Vercel env and redeploy every time. A
**named Cloudflare Tunnel** gives a stable URL (recommended for the one-click flow).

### Named Cloudflare Tunnel (stable URL)

```bash
cloudflared tunnel login
cloudflared tunnel create glorix-local
# ~/.cloudflared/config.yml:
#   tunnel: glorix-local
#   credentials-file: C:\Users\<you>\.cloudflared\<id>.json
#   ingress:
#     - hostname: glorix-local-api.<your-domain>
#       service: http://localhost:8787
#     - service: http_status:404
cloudflared tunnel route dns glorix-local glorix-local-api.<your-domain>
```
Then put `GLORIX_PUBLIC_TUNNEL_URL=https://glorix-local-api.<your-domain>` in
`infra/local/.env.local` and re-run START.

## Security (read this)

- **Development/testing only.** Replace with real cloud infra before launch.
- The laptop must stay **on and awake** for the URL to work.
- Internet speed and IP/tunnel stability affect reliability.
- **Never** expose Qdrant, Ollama, Docker, Postgres, or Redis to the internet —
  only the gateway is public, and it does not route to those.
- Keep all `.env` / `.env.local` files **out of git** (already git-ignored).
- Do not run on untrusted public Wi-Fi without understanding the risk.
- **Stop server mode** (`STOP_GLORIX_SERVER`) when not in use.
- This hub does **not** re-enable legacy TN VED autofill; the platform still
  leaves codes blank when the backend is unavailable.

## Did the build sandbox run this stack?

No. The CI/agent sandbox cannot run Docker Desktop, Ollama, or a GPU, so these
scripts/configs are **prepared and structurally validated but not runtime-tested**
here. They are meant to run on the founder's Windows laptop. See
`docs/TNVED_AI_DEPLOYMENT.md` for the backend build/run details.
