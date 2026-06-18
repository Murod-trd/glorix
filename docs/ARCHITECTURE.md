# GLORIX — Architecture

## Summary

GLORIX is a single-page application (SPA) built with React 19 and Vite, deployed as a static site. There is no backend service, no database, no authentication provider, and no server-side rendering. Every page is a client-side React component that reads from static JavaScript data modules under `src/data/`. This document describes the structure as it actually exists in the repository.

## Tech stack

| Layer | Technology | Version (from `package.json`) |
|---|---|---|
| UI framework | React | ^19.2.6 |
| Build tool / dev server | Vite | ^8.0.12 |
| Routing | react-router-dom | ^7.17.0 |
| Icons | lucide-react | ^1.18.0 |
| PDF generation | jspdf | ^4.2.1 |
| Word (.docx) generation | docx | ^9.7.1 |
| Linting | ESLint (+ react-hooks, react-refresh plugins) | ^10.3.0 |
| Language | JavaScript (JSX), no TypeScript | — |

No backend framework, no ORM, no database client, no HTTP client library (no axios/fetch wrapper — there are no network calls to make), no state management library (Redux/Zustand/etc. — state is local `useState` per component), no testing framework is configured.

## What does NOT exist (read this before assuming otherwise)

- No backend server or API of any kind.
- No database (SQL or NoSQL).
- No real authentication or session management. "Login" is `AccountSelect.jsx` writing one of three fixed string values (`'buyer' | 'seller' | 'both'`) to `localStorage.getItem('glorix_account_type')` and reloading the page.
- No real payment, escrow, or banking integration. All deposit/escrow amounts shown are computed client-side from formulas in `src/data/mock.js` and `src/data/marketplace.js` and never actually move money.
- No real AI/LLM API calls. See `AI_AGENTS.md` for the full inventory.
- No file storage / document upload backend. "Uploading a document" anywhere in the UI is a checkbox or button that flips local component state; nothing is sent anywhere.
- No environment variables / secrets are read anywhere in the app (confirmed: no `import.meta.env` usage tied to API keys in the codebase).

## Folder structure

```
src/
  App.jsx              — route table (see Routing below)
  main.jsx             — React root mount
  App.css, index.css   — global styles and design tokens (see SYSTEM_DESIGN.md)
  components/
    Sidebar.jsx         — left navigation, account-type-aware menu
  data/                 — all "backend" data lives here, as plain JS modules
    mock.js             — current user, tenders, dashboard stats, AI-analysis offers, deposit-rate table, calcDeposit()
    accounts.js         — account type definitions, KYC document requirements, origin-certificate types, document template catalog
    accountState.js     — trivial in-memory account-type holder (5 lines, largely superseded by localStorage)
    cips.js             — suppliers, RFI list + answers, KPI history, anti-fraud checks, community chat messages
    marketplace.js       — product catalog, categories, calcMarketplaceFee()
    legalSources.js      — per-country legal source citations, contract-language law data, international law options, mirror-penalty standard
    contractData.js      — structured bilingual contract data model + language resolver (buildContractStructured, resolveContractLanguage)
  pages/                — one file per route (16 files; two files export two route components each)
  utils/
    pdfExport.js, docxExport.js       — generic plain-text document → PDF/Word exporters (used by offer/spec/claim/acceptance/КП documents)
    contractPdfExport.js, contractDocxExport.js — structured two-column bilingual contract → PDF/Word exporters
    ptSerifFont.js, robotoFont.js     — base64-embedded font data for PDF generation
research/               — legal research notes (language-law findings, English contract translation draft) produced during development, kept as source material
```

## Routing

Defined entirely in `src/App.jsx` using `react-router-dom`'s `BrowserRouter`/`Routes`/`Route`. Two routes (`/onboarding`, `/account-select`) render outside the main layout (no sidebar). Every other route renders inside a fixed layout: `<Sidebar />` plus a `<main>` with `marginLeft: 220` containing a nested `<Routes>`.

| Path | Component | Notes |
|---|---|---|
| `/onboarding` | `Onboarding` | 5-step first-run wizard, no persistence |
| `/account-select` | `AccountSelect` | the "login" screen — picks one of 3 demo accounts |
| `/` | `Dashboard` | |
| `/marketplace` | `Marketplace` | |
| `/tenders` | `TenderList` (named export from `Tenders.jsx`) | |
| `/tenders/:id` | `TenderDetail` (named export from `Tenders.jsx`) | |
| `/create` | `CreateTender` | 4-step tender creation wizard |
| `/ai-analysis` | `AIAnalysis` | static TCO comparison of 3 mock offers |
| `/deposit` | `DepositCalculator` (named export from `DepositTrust.jsx`) | |
| `/trust` | `TrustRating` (named export from `DepositTrust.jsx`) | |
| `/profile` | `Profile` | |
| `/suppliers` | `SupplierScorecard` | CIPS 10C / ESG / KPI / Anti-Fraud tabs |
| `/rfi` | `RFIModule` | RFI list + anonymous community chat |
| `/ai-bots` | `AIBots` | scripted buyer/seller bot dialogue scenarios |
| `/legal` | `Legal` | platform's own draft Terms of Service / Oferta |
| `/legal-ai` | `LegalAI` | the trade-document generator (contract/offer/spec/claim/acceptance) |
| `/support` | `Support` | FAQ + canned-response chat |
| `/roadmap` | `Roadmap` | strategy, competitive analysis, market sizing — investor/partner-facing content |
| `/manager` | `RelationshipManager` | personal account-manager simulation |
| `/analytics` | `Analytics` | static procurement spend/savings dashboard |
| `/accounts` | `AccountVerification` | account types, seller verification flow, origin-certificate (CT-1 etc.) info |
| `/documents` | `DocumentCenter` | commercial-offer builder with HS/TN VED code lookup |

## Rendering model

Every page component is a default (or named) export of a function component using inline `style={{ ... }}` objects almost exclusively (no CSS modules, no Tailwind, no styled-components — see `SYSTEM_DESIGN.md` for the small set of shared utility classes that do exist in `index.css`, e.g. `.card`, `.badge`, `.btn`). All state is local component state via `useState`/`useRef`/`useEffect`; there is no global store. Several pages read `localStorage.getItem('glorix_account_type')` directly at module scope to compute `canBuy`/`canSell` flags that gate which UI is shown.

## Build & deploy pipeline

`npm run build` runs `vite build`, producing a static `dist/` bundle (`index.html` + hashed JS/CSS assets). `vercel.json` contains a single SPA rewrite rule (`/(.*) → /index.html`) so client-side routing works on refresh/deep-link. There are no serverless functions, no Vercel KV/Postgres, no edge middleware. See `DEPLOYMENT.md` for the full pipeline and `INTEGRATIONS.md` for the dependency list.

## Where to look for more detail

- Business formulas and policy logic embedded in the above files: `BUSINESS_RULES.md`.
- The five document-generation features (contract/offer/spec/claim/acceptance) and the bilingual contract renderer system: `SYSTEM_DESIGN.md` and `BUSINESS_RULES.md`.
- Every "AI" surface and how it's actually implemented: `AI_AGENTS.md`.
