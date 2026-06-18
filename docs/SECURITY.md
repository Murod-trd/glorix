# GLORIX — Security

## Current Security Posture

GLORIX today has **minimal security surface** because it has no backend, no database, and no real authentication. This section documents the current (correct for a demo, inadequate for production) state and what real security work is required.

---

## ✅ What Exists (Demo Stage)

### "Authentication"
`AccountSelect.jsx` writes one of `'buyer' | 'seller' | 'both'` to `localStorage.setItem('glorix_account_type', value)`.
- No password
- No identity verification
- No session token
- No expiry
- Anyone can edit the value in browser devtools to switch personas

### Authorization
`canBuy`/`canSell` flags derived client-side from localStorage string. Used only to conditionally render UI.
- No server enforcing these permissions
- No server exists

### Data Confidentiality
"Tender anonymity" (sellers hidden from buyers until close, anonymous RFI forum) is a purely UI presentation choice over identical mock data visible to all visitors.
- No actual access control
- Full data visible in bundled JS

### Input Handling
Form fields throughout accept arbitrary text with no sanitization.
- No SQL injection attack surface (no SQL database)
- No stored XSS (nothing persisted server-side)
- Content only interpolated back into the same client's DOM/PDF/Word

### Secrets
None in the codebase. No API keys, no `.env` file, no `import.meta.env` credentials.

### Dependencies
Standard npm tree: `docx`, `jspdf`, `lucide-react`, `react`, `react-dom`, `react-router-dom`.
- No automated vulnerability scanning configured (no Dependabot, no `npm audit` in CI)

---

## ❌ What Does Not Exist (Production Requirements)

### Real Authentication (MVP Phase)
- Server-issued JWT tokens with expiry and rotation
- Passwords handled by identity provider (never by this assistant or any AI tool directly — standing project rule)
- Or OAuth/SSO via government identity systems where available

### Real Authorization (MVP Phase)
- Every privileged action (create tender, submit offer, release escrow) authorized server-side against authenticated user's actual role
- Never trust client-supplied account type or role claims

### Real KYC / Company Verification (MVP Phase)
- Government registry lookups server-side against:
  - `my.gov.uz` (Uzbekistan)
  - `egov.kz` (Kazakhstan)
  - `nalog.gov.ru` (Russia)
  - `e-taxes.gov.az` (Azerbaijan)
  - `napr.gov.ge` (Georgia)
- Currently simulated as static boolean flags in mock data

### Real Escrow / Payment Security (Beta Phase)
- PCI-DSS scope minimization (GLORIX should never handle raw card/bank credentials)
- Idempotent transaction handling
- Reconciliation against partner bank/payment system
- Per standing project rule: financial credentials are never entered or handled by any AI assistant on the user's behalf

### Real Sanctions Screening (Beta Phase)
- OFAC (US Treasury), EU Consolidated Sanctions List, UN Sanctions List
- Relevant national lists (CIS country-specific)
- Currently: static `aiCheck.sanctionsOk: true` in every mock product

### Data Protection Compliance (Production Phase)
`Legal.jsx` commits to:
- Uzbekistan personal data law
- Russia Federal Law 152-FZ
- Kazakhstan personal data law
- GDPR (for EU participants)

Real technical backing required when actual personal/company data is collected:
- Data residency decisions
- Breach notification process (72h under GDPR)
- Data subject request handling
- DPA with any sub-processors

### Infrastructure Hardening (MVP Phase)
- Dependency vulnerability scanning (Dependabot or equivalent)
- Rate limiting on all API endpoints
- Audit logging for all compliance-relevant actions
- Secrets management via a real secrets manager (Vercel environment variables minimum; HashiCorp Vault or equivalent for production)

---

## Standing Rules for This Assistant on Security Topics

Per project-wide standing rules (stored in memory and this document):
1. **Never enter, request, or handle financial credentials, passwords, or API keys** on the user's behalf
2. **Never modify access-control or sharing permissions** without explicit confirmation
3. All future backend/auth/payment/escrow work = **Level 3 (critical) task** — full cross-module validation required before any change
4. If building auth: stop and confirm identity provider choice with the founder before implementing — this is a major architectural decision with long-term lock-in implications
