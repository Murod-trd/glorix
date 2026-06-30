# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/backend-auth-foundation

## Last commit hash
6d18efd

## Git status before work
Clean. Synced to `origin/main` at `9043c98` (Merge pull request #1 — TN VED stabilization).

## Git status after work
Working tree clean after commit. Changed/added (no secrets, no node_modules, no dist, no *.db):
- M .gitignore, package.json, package-lock.json, src/App.jsx
- A prisma/schema.prisma
- A api/_lib/{db,auth,password,roles,http}.js
- A api/auth/{register,login,me,logout}.js
- A api/companies/me.js
- A src/services/authApi.js
- A src/context/AuthContext.jsx
- A .env.example, docs/BACKEND_AUTH_FOUNDATION.md, docs/ENVIRONMENT.md
- A ai_handoff/CLAUDE_REPORT.md

## What I read from the other agent report
`ai_handoff/CODEX_REPORT.md` does not exist on `origin/main` or this branch. No competing
`claude/*` or `codex/*` backend-auth branch exists. `list_pull_requests` (open) returned `[]`.
So there is no competing PR for this task. PR #1 (Codex, TN VED) is already merged into main.

## Main objective
Backend + Database + Real Auth Foundation

## Project direction
- Glorix remains React/Vite + Vercel. No architecture rewrite.
- Existing Vercel `/api/*` TN VED endpoints (classify, search, explain, classify-batch,
  _lib/engine.js, _data/**) are untouched.
- TN VED PR #1 is already merged; not touched here.
- Python TN VED backend under `backend/` is NOT connected to the frontend (still true).
- This PR adds an auth/database foundation only, behind a default-off feature flag.

## Files changed by this agent
- `prisma/schema.prisma` — new — User/Company/Membership/AuditLog + placeholder Tender models.
- `api/_lib/db.js` — new — Prisma client singleton for serverless.
- `api/_lib/password.js` — new — bcryptjs hash/verify.
- `api/_lib/auth.js` — new — JWT sign/verify, bearer extraction, getAuthUser, safeUser (strips passwordHash).
- `api/_lib/roles.js` — new — role/type/status enums + validators.
- `api/_lib/http.js` — new — CORS/OPTIONS + body/email helpers.
- `api/auth/register.js` — new — POST register (user+company+membership+audit, returns token).
- `api/auth/login.js` — new — POST login (verify, returns token + safe user/company).
- `api/auth/me.js` — new — GET current user/company/membership (Bearer).
- `api/auth/logout.js` — new — POST stateless logout.
- `api/companies/me.js` — new — GET/PATCH current company (no KYC).
- `src/services/authApi.js` — new — fetch client (register/login/getMe/logout/getMyCompany/updateMyCompany).
- `src/context/AuthContext.jsx` — new — additive, inert-by-default auth provider.
- `src/App.jsx` — modified — mount `AuthProvider` as outermost provider (inert when flag off).
- `package.json` — modified — add @prisma/client, bcryptjs, jsonwebtoken, prisma + scripts (postinstall: prisma generate).
- `package-lock.json` — modified — lockfile for new deps.
- `.gitignore` — modified — ignore `.env*`, `*.db`, prisma dev db (keeps `.env.example`).
- `.env.example`, `docs/BACKEND_AUTH_FOUNDATION.md`, `docs/ENVIRONMENT.md` — new — config + docs.

## Code changes made
Added a Prisma data model and a JWT auth layer exposed through new Vercel serverless
functions following the existing `export default function handler(req,res)` convention
(CORS header + OPTIONS short-circuit, `req.body`/`req.query`, `res.status().json()`).
Passwords are bcrypt-hashed; `passwordHash` is never returned. Frontend gets a thin fetch
client and an opt-in context, both gated by `VITE_USE_REAL_AUTH` (default `false`).

## Why these changes were made
To create the first real backend/DB/auth foundation (PR #2) without disturbing the working
demo or the deployed TF-IDF TN VED API. Default-off flag guarantees current behavior.

## Commands run
- `git fetch origin --prune && git checkout main && git reset --hard origin/main && git clean -fd`
- `git checkout -b claude/backend-auth-foundation`
- `npm install --ignore-scripts --no-audit --no-fund`
- `DATABASE_URL=file:./dev.db npx prisma validate` (and `prisma generate`)
- `npm run build`
- `node --check` on every new `.js`; `npx eslint` on new files

## Results
- `npm install --ignore-scripts` → `added 211 packages in 26s` (RC 0).
- `npm run build` → `✓ built in 2.19s` (RC 0). Only pre-existing chunk-size warning.
- `node --check` → OK for all 11 new JS files.
- `npx prisma validate` / `generate` → FAILED with `403 Forbidden` fetching
  `binaries.prisma.sh/.../libquery_engine...` and `schema-engine.gz`. This is a sandbox
  network block of Prisma's engine CDN, not a schema error. Must be run locally/Vercel.
- eslint on new files → no new error types beyond the repo's pre-existing
  `react-refresh/only-export-components` convention (same as existing `AccountContext.jsx`).
  (`api/_lib/engine.js` has a pre-existing `process` no-undef on main — not modified.)

## Tests passed
- Frontend production build (`npm run build`): PASS.
- `node --check` syntax validation of all new serverless + service files: PASS.

## Tests failed
- None of mine. Prisma engine-dependent commands could not execute in the sandbox
  (CDN 403). No Python files were touched, so Python tests were not rerun.

## Build status
`npm run build` PASS (vite, 2.19s). Frontend build is independent of Prisma (vite bundles
`src/` only; `@prisma/client` is imported solely by backend `api/_lib/db.js`).

## Frontend/demo compatibility
Demo/localStorage behavior remains the DEFAULT. `VITE_USE_REAL_AUTH` defaults to `false`;
`AuthProvider` is inert (no network) when off. `AccountContext` and all existing screens
are unchanged.

## Auth/database status
Real now: schema (User/Company/Membership/AuditLog/Tender placeholder), bcrypt hashing, JWT
sign/verify, and register/login/me/logout + companies/me endpoints (code complete, lint/syntax
clean). NOT yet executed against a live DB here because Prisma engines can't download in the
sandbox — migration must run locally/Vercel.

## Current blockers
- Prisma engine CDN blocked in sandbox → could not run `prisma validate/generate/migrate`.
  Provide exact local commands (see docs/BACKEND_AUTH_FOUNDATION.md). On Vercel this works.

## Next exact step
Locally or on Vercel: set `DATABASE_URL` + `JWT_SECRET`, run
`npx prisma generate && npx prisma migrate dev --name init_auth_foundation`, then smoke-test
`/api/auth/register`, `/api/auth/login`, `/api/auth/me`. For production, switch the Prisma
`provider` to `postgresql`.

## Handoff prompt for the other agent
> You are Codex. PR #2 (Claude branch `claude/backend-auth-foundation`) adds the backend
> auth/DB foundation: Prisma schema (User/Company/Membership/AuditLog/Tender placeholder),
> bcryptjs + JWT, and `/api/auth/{register,login,me,logout}` + `/api/companies/me`, plus
> `src/services/authApi.js` and an opt-in `AuthContext` gated by `VITE_USE_REAL_AUTH=false`.
> The frontend build passes; Prisma engine commands could NOT run in the sandbox (CDN 403),
> so migrations are pending local/Vercel execution. Do NOT create a competing branch.
> Review the PR; if you extend it, run `prisma migrate dev` locally and add real endpoint
> smoke tests, and keep `VITE_USE_REAL_AUTH` default `false`. Do not connect the Python TN
> VED backend to the frontend in this PR. Update only `ai_handoff/CODEX_REPORT.md`.
