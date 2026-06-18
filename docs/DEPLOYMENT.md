# GLORIX — Deployment

## Current Deployment (✅ Live)

| Item | Value |
|---|---|
| Platform | Vercel (static site) |
| Production URL | `glorix-theta.vercel.app` |
| Source repo | `github.com/Murod-trd/glorix` (private) |
| Deploy branch | `main` |
| Deploy trigger | Auto-deploy on push to `main` |
| Build command | `npm run build` → `vite build` |
| Output directory | `dist/` |
| Serverless functions | ❌ None |
| Edge middleware | ❌ None |
| Environment variables | ❌ None |
| Vercel KV / Postgres | ❌ None |

## `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Single SPA fallback rule. Required because `react-router-dom` handles all client-side routing — without this, any direct URL access or browser refresh on a deep-link (e.g. `/legal-ai`, `/tenders/t1`) would 404. **Do not remove this rule.**

## Build Output

`vite build` produces `dist/`:
- `dist/index.html` — single HTML entry point
- `dist/assets/*.js` — hashed, content-addressed JS bundles
- `dist/assets/*.css` — hashed, content-addressed CSS bundles
- All fonts, icons embedded in JS bundles (base64 in `ptSerifFont.js`, `robotoFont.js`)

## Git Push Workflow (Mandatory Safety Process)

For every push from an assistant session:

```bash
git fetch origin
git log origin/main --oneline -1   # Confirm expected commit — no one else pushed
git push origin main-restored:main  # Fast-forward only
```

Branch naming: local branch is `main-restored`; pushes are mapped to remote `main`. **Always fast-forward only.** If a non-fast-forward is required, stop and get explicit founder approval.

## Local Development

```bash
npm run dev      # Vite dev server, hot reload, http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Serve dist/ locally (sanity check before push)
npm run lint     # ESLint
```

## ❌ What Is Not Part of This Deployment

| Item | Status | Notes |
|---|---|---|
| Backend / Node.js API | ❌ | MVP phase |
| PostgreSQL database | ❌ | MVP phase |
| Vercel serverless functions | ❌ | May be used in MVP |
| Environment variables / secrets | ❌ | Will be added when first API key / DB connection needed |
| CI/CD pipeline (tests, lint gate) | ❌ | Should be added before first real users |
| Staging environment | ❌ | Should be added before production real-user launch |
| Custom domain | ❌ | `glorix.com` or equivalent — planned |
| CDN / asset optimization | ✅ | Handled by Vercel automatically for static assets |

## 🚧 Planned Production Infrastructure (MVP/Beta Phase)

When a real backend is added, this section must be updated with:
- Chosen backend hosting (Vercel serverless functions, Railway, Render, VPS, etc.)
- Database hosting provider and connection string format
- Secrets management approach (Vercel env vars minimum)
- Migration strategy for the database
- CI/CD pipeline (at minimum: lint + build check on PR; migrate + deploy on merge to main)
- Staging environment configuration

**Do not commit this section until the real infrastructure is decided and tested** — everything above is planning, not specification.
