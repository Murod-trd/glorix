# Backend Auth & Database Foundation (PR #2)

This document describes the **first real backend + database + authentication
foundation** for Glorix. It is a *foundation*, not a finished production auth
system. Read the "Honest status & limitations" section before relying on it.

## What this adds

- **Database schema** (Prisma): `User`, `Company`, `Membership`, `AuditLog`,
  and a placeholder `Tender` model.
- **Password hashing** with `bcryptjs`.
- **JWT** stateless authentication (`jsonwebtoken`).
- **Auth API** under the existing Vercel `/api/*` structure:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET  /api/auth/me`
  - `POST /api/auth/logout`
  - `GET  /api/companies/me`
  - `PATCH|POST /api/companies/me`
- **Frontend service** `src/services/authApi.js` and an additive, opt-in
  `src/context/AuthContext.jsx`, gated by `VITE_USE_REAL_AUTH` (default `false`).

It does **not** change the existing demo flow, the Vercel TF-IDF TN VED
endpoints, or the Python `backend/` service.

## Technology choice

| Concern | Choice | Why |
|---|---|---|
| ORM | **Prisma** | Recommended in the task; type-safe, migrations, SQLite↔Postgres. |
| Dev DB | **SQLite** (`file:./dev.db`) | Zero-config local development. |
| Prod DB | **PostgreSQL** | Switch `provider` to `postgresql` + set `DATABASE_URL`. |
| Hashing | **bcryptjs** | Pure JS — no native build step, safe on Vercel serverless. |
| Tokens | **JWT** (`jsonwebtoken`) | Stateless foundation; no session store needed yet. |
| Validation | Lightweight manual checks | Avoids adding a validation dependency for the foundation. |

## Data model (summary)

- **User**: `id`, `email` (unique), `passwordHash`, `fullName`, `role`,
  `status` (active/disabled/pending), timestamps.
- **Company**: `id`, `name`, `country`, `taxId` (alias: `registrationNumber`),
  `companyType` (buyer/supplier/both), `verificationStatus`
  (unverified/pending/verified/rejected — **placeholder, KYC is future work**),
  timestamps.
- **Membership**: links `User`↔`Company` with a `role`
  (owner/admin/procurement_manager/sales_manager/viewer). Unique per (user, company).
- **AuditLog**: `actorUserId?`, `action`, `entityType`, `entityId?`,
  `metadata` (JSON string), `createdAt`.
- **Tender** (placeholder only): minimal fields; the full tender system is **not**
  implemented in this PR.

## Local setup

```bash
# 1. Install deps (runs `prisma generate` via postinstall)
npm install

# 2. Configure environment
cp .env.example .env
#   set DATABASE_URL="file:./dev.db"
#   set JWT_SECRET to a strong random value:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the dev database & tables
npx prisma migrate dev --name init_auth_foundation

# 4. (Inspect data, optional)
npm run db:studio
```

> **Sandbox note (PR author):** In the CI/agent sandbox, Prisma's engine CDN
> (`binaries.prisma.sh`) is network-blocked (HTTP 403), so `prisma generate`,
> `prisma validate`, and `prisma migrate` **could not be executed here**. They
> must be run locally / on Vercel where the CDN is reachable. The frontend
> `npm run build` was verified and passes independently of Prisma.

## Testing the endpoints (after migrate)

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"supersecret","fullName":"Ann","companyName":"Acme","country":"UZ","companyType":"buyer"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"supersecret"}'

# Me (use token from register/login)
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <TOKEN>"

# Company
curl http://localhost:3000/api/companies/me -H "Authorization: Bearer <TOKEN>"
```

## Frontend integration (safe by default)

- `VITE_USE_REAL_AUTH=false` (default): the app keeps using the existing
  `localStorage` demo account flow (`AccountContext`). `AuthProvider` is mounted
  but **inert** — it makes no network calls.
- `VITE_USE_REAL_AUTH=true`: `AuthContext` / `authApi` may call `/api/auth/*`.
  This is opt-in and does not yet replace `AccountContext` across screens.

## Honest status & limitations

- This is a **foundation**, not production-grade security. No refresh tokens, no
  email verification, no rate limiting, no password reset, no CSRF/session
  hardening, no RBAC enforcement on business endpoints yet.
- `verificationStatus` is a **placeholder** — real KYC/company verification is
  future work.
- Production must use external **PostgreSQL** (switch the Prisma `provider`) and
  a strong `JWT_SECRET`.
- Tender, marketplace, escrow, payments, sanctions screening, and full frontend
  migration remain future work and are intentionally out of scope for this PR.
- The Python AI/RAG TN VED backend is **still not connected** to the frontend.
