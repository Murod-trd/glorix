# Environment Variables

Copy `.env.example` to `.env` and fill real values. **Never commit `.env`.**

| Variable | Scope | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | Backend (Prisma) | Yes (for auth) | DB connection string. Dev: `file:./dev.db` (SQLite). Prod: external PostgreSQL. |
| `JWT_SECRET` | Backend (auth) | Yes (for auth) | Secret used to sign/verify JWTs. Must be long & random in production. |
| `VITE_USE_REAL_AUTH` | Frontend (Vite) | No (default `false`) | `false` = demo/localStorage flow. `true` = frontend may call `/api/auth/*`. |

## Notes

- **SQLite is for local dev only.** The committed `prisma/schema.prisma` uses
  `provider = "sqlite"`. For production, change it to `postgresql` and set
  `DATABASE_URL` to your managed Postgres (e.g. Neon, Supabase, RDS), then run
  `prisma migrate deploy`.
- **`JWT_SECRET`** generate with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- On **Vercel**, set `DATABASE_URL`, `JWT_SECRET`, and (optionally)
  `VITE_USE_REAL_AUTH` in Project → Settings → Environment Variables.
- The existing Vercel TF-IDF TN VED endpoints (`/api/classify`, `/api/search`,
  `/api/explain`, `/api/classify-batch`) require **no** environment variables and
  are unaffected by this change.

## Never commit

`.env`, `.env.local`, secrets, JWT secrets, database passwords, local `*.db`
files, `node_modules`, generated caches/logs, Qdrant local storage, Python
caches. These are covered by `.gitignore`.
