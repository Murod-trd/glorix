# GLORIX — Deployment

## Summary

GLORIX deploys as a static site to Vercel, auto-triggered from pushes to the `main` branch of the GitHub repository. There are no serverless functions, no edge middleware, no environment variables, and no backend infrastructure of any kind currently in the deployment.

## Pipeline

1. **Source**: `https://github.com/Murod-trd/glorix.git`, default branch `main`.
2. **Trigger**: Vercel watches the GitHub repo and redeploys automatically on every push to `main`. There is no separate staging environment or preview-approval gate described in this repo's configuration beyond Vercel's standard automatic preview-deployment-per-branch behavior.
3. **Build command**: `npm run build`, which runs `vite build` (from `package.json`'s `scripts.build`). This produces a static `dist/` folder: a single `index.html` plus hashed, content-addressed JS/CSS asset files, ready to be served by any static file host.
4. **Routing configuration**: `vercel.json` contains exactly one rule —
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
   This is the standard SPA fallback: since `react-router-dom` handles all client-side routing, every request path (e.g. a deep link to `/tenders/t1` or a hard refresh on `/legal-ai`) must be served the same `index.html` and let the client-side router take over, rather than Vercel trying to find a matching static file at that path and 404ing.
5. **Production URL**: `glorix-theta.vercel.app`.

## Local development

- `npm run dev` — starts the Vite dev server with hot module reload.
- `npm run build` — production build (same command Vercel runs).
- `npm run preview` — serves the built `dist/` folder locally to sanity-check the production build before pushing.
- `npm run lint` — runs ESLint across the project.

## Environment variables / secrets

None exist today. No `.env` file is present in the repository, and no code reads `import.meta.env.*` for any API key or secret. If/when a real backend, payment integration, or AI API key is added (see `INTEGRATIONS.md` and `AI_AGENTS.md` for what that would involve), the corresponding secrets must be added as Vercel project environment variables (never committed to the repository) and the relevant client code must call a backend proxy rather than embedding any secret key directly in frontend bundle code, since anything in a Vite client build is publicly readable by anyone who opens devtools.

## What is not yet part of this deployment (forward-looking, MVP-phase)

Per the Roadmap's MVP-phase commitments: a real backend service (Node.js per the Roadmap's stated plan) and a PostgreSQL database will need their own deployment target (Vercel serverless/Edge functions, or a separate hosting target such as Railway/Render/a VPS, depending on what's chosen at that time) plus the corresponding environment variables, database connection secrets, and CI steps (migrations, backend tests) that don't exist yet. This document should be updated with that real pipeline once it exists, rather than guessed at now.
