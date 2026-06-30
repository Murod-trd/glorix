# GLORIX Local Server Hub

A reusable, growable **local backend hub** for the whole GLORIX project, hosted
temporarily on the founder's Windows laptop while the platform is in development.
When the platform is ready to launch, this is replaced by real cloud infra.

> Scope: this hub serves **all** GLORIX backend services — TN VED AI now, and
> future AI assistants, core backend, and databases later — behind ONE gateway
> and ONE START/STOP workflow. It is NOT TN-VED-only.

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
