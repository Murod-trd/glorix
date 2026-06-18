# GLORIX — Architecture

## Tech Stack (✅ Implemented)

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | ^19.2.6 |
| Build Tool | Vite | ^8.0.12 |
| Routing | react-router-dom | ^7.17.0 |
| Icons | lucide-react | ^1.18.0 |
| PDF Generation | jspdf | ^4.2.1 |
| Word Generation | docx | ^9.7.1 |
| Linting | ESLint + react-hooks + react-refresh | ^10.3.0 |
| Language | JavaScript (JSX) — no TypeScript | — |
| Deployment | Vercel (static site) | — |

## What Does NOT Exist

| Item | Status | Notes |
|---|---|---|
| Backend server | ❌ | No Node.js, no Python, no serverless functions |
| Database | ❌ | No SQL, no NoSQL, no file storage |
| Authentication | ❌ | `localStorage.setItem('glorix_account_type', 'buyer'|'seller'|'both')` only |
| Payment/escrow rail | ❌ | All amounts computed client-side, never move |
| Real AI/LLM calls | ❌ | See `AI_AGENTS.md` |
| File upload backend | ❌ | "Uploading" flips local boolean state only |
| Environment variables | ❌ | No `import.meta.env` keys anywhere |
| State management lib | ❌ | Local `useState` per component only |
| Testing framework | ❌ | No Jest, no Vitest configured |
| CI/CD pipeline | ❌ | Push to main → Vercel auto-deploy only |
| TypeScript | ❌ | Plain JS/JSX throughout |

## Folder Structure

```
glorix/
├── public/
├── src/
│   ├── App.jsx              ← route table (all routes defined here)
│   ├── main.jsx             ← React root mount
│   ├── App.css              ← global styles (imports index.css tokens)
│   ├── index.css            ← design tokens (:root CSS variables) + shared utility classes
│   ├── components/
│   │   └── Sidebar.jsx      ← left nav, account-type-aware menu, ⚠ ДЕМО badge
│   ├── data/                ← ALL "backend" data as static JS modules
│   │   ├── mock.js          ← users, tenders, stats, AI analysis, depositRates, calcDeposit()
│   │   ├── accounts.js      ← account types, KYC docs, origin cert types, docTemplates
│   │   ├── accountState.js  ← 5-line in-memory account holder (largely superseded by localStorage)
│   │   ├── cips.js          ← suppliers (CIPS/ESG/KPI/antiFraud), RFI list+answers, community chat
│   │   ├── marketplace.js   ← product catalog, categories, calcMarketplaceFee()
│   │   ├── legalSources.js  ← per-country legal citations, contractLanguage rules, mirrorPenalties
│   │   └── contractData.js  ← structured bilingual contract model, resolveContractLanguage(), buildContractStructured()
│   ├── pages/               ← one file per route (see Routing table below)
│   │   ├── Dashboard.jsx
│   │   ├── Tenders.jsx      ← exports TenderList + TenderDetail (two routes, one file)
│   │   ├── CreateTender.jsx
│   │   ├── AIAnalysis.jsx
│   │   ├── DepositTrust.jsx ← exports DepositCalculator + TrustRating (two routes, one file)
│   │   ├── Profile.jsx
│   │   ├── AccountSelect.jsx
│   │   ├── Marketplace.jsx
│   │   ├── SupplierScorecard.jsx
│   │   ├── RFIModule.jsx
│   │   ├── AIBots.jsx
│   │   ├── Onboarding.jsx
│   │   ├── Legal.jsx        ← platform's own draft ToS/Oferta (not the document generator)
│   │   ├── LegalAI.jsx      ← trade document generator (contract/offer/spec/claim/acceptance)
│   │   ├── Support.jsx
│   │   ├── Roadmap.jsx
│   │   ├── RelationshipManager.jsx
│   │   ├── Analytics.jsx
│   │   ├── AccountVerification.jsx
│   │   └── DocumentCenter.jsx
│   └── utils/
│       ├── pdfExport.js          ← Pipeline A: plain-text → branded PDF
│       ├── docxExport.js         ← Pipeline A: plain-text → branded Word
│       ├── contractPdfExport.js  ← Pipeline B: structured bilingual contract → PDF
│       ├── contractDocxExport.js ← Pipeline B: structured bilingual contract → Word
│       ├── ptSerifFont.js        ← base64-embedded PT Serif font data
│       └── robotoFont.js         ← base64-embedded Roboto font data
├── research/                ← legal research notes (language-law findings, EN contract draft)
├── docs/                    ← this documentation system (13 files)
├── vercel.json              ← single SPA rewrite rule
├── vite.config.js
└── package.json
```

## Complete Route Table

All routes defined in `src/App.jsx`. Two routes render without the Sidebar layout; all others render inside fixed layout (Sidebar 220px left + main content area).

| Path | Component | File | Layout |
|---|---|---|---|
| `/onboarding` | `Onboarding` | `Onboarding.jsx` | No sidebar |
| `/account-select` | `AccountSelect` | `AccountSelect.jsx` | No sidebar |
| `/` | `Dashboard` | `Dashboard.jsx` | Sidebar |
| `/marketplace` | `Marketplace` | `Marketplace.jsx` | Sidebar |
| `/tenders` | `TenderList` | `Tenders.jsx` | Sidebar |
| `/tenders/:id` | `TenderDetail` | `Tenders.jsx` | Sidebar |
| `/create` | `CreateTender` | `CreateTender.jsx` | Sidebar |
| `/ai-analysis` | `AIAnalysis` | `AIAnalysis.jsx` | Sidebar |
| `/deposit` | `DepositCalculator` | `DepositTrust.jsx` | Sidebar |
| `/trust` | `TrustRating` | `DepositTrust.jsx` | Sidebar |
| `/profile` | `Profile` | `Profile.jsx` | Sidebar |
| `/suppliers` | `SupplierScorecard` | `SupplierScorecard.jsx` | Sidebar |
| `/rfi` | `RFIModule` | `RFIModule.jsx` | Sidebar |
| `/ai-bots` | `AIBots` | `AIBots.jsx` | Sidebar |
| `/legal` | `Legal` | `Legal.jsx` | Sidebar |
| `/legal-ai` | `LegalAI` | `LegalAI.jsx` | Sidebar |
| `/support` | `Support` | `Support.jsx` | Sidebar |
| `/roadmap` | `Roadmap` | `Roadmap.jsx` | Sidebar |
| `/manager` | `RelationshipManager` | `RelationshipManager.jsx` | Sidebar |
| `/analytics` | `Analytics` | `Analytics.jsx` | Sidebar |
| `/accounts` | `AccountVerification` | `AccountVerification.jsx` | Sidebar |
| `/documents` | `DocumentCenter` | `DocumentCenter.jsx` | Sidebar |

## Rendering Model

- Inline `style={{ }}` objects throughout (no CSS modules, no Tailwind, no styled-components)
- Small set of shared utility classes in `index.css`: `.card`, `.badge`, `.badge-green/.badge-gold/.badge-red`, `.btn/.btn-primary/.btn-ghost/.btn-danger`, `.tag`, `.fade-in`, `.divider`
- All state is local `useState`/`useRef`/`useEffect` per component — no global store
- Account permissions (`canBuy`/`canSell`) derived at module scope from `localStorage.getItem('glorix_account_type')`
- Two pages export two named components each (`Tenders.jsx` → `TenderList` + `TenderDetail`; `DepositTrust.jsx` → `DepositCalculator` + `TrustRating`)

## Known Technical Debt

- `accountState.js` (5-line in-memory holder) is largely superseded by direct localStorage reads throughout the codebase — two parallel account-state mechanisms exist
- Pipeline A document renderers (offer/spec/claim/acceptance) use regex-based heading detection in the PDF/Word exporters, which is fragile vs. Pipeline B's structured approach (accepted, see `DECISIONS.md`)
- No TypeScript — all data shapes are undocumented at the call sites; `DATABASE_SCHEMA.md` serves as the substitute type reference
- No tests of any kind configured
- `buildContract()` (legacy plain-text string builder, ~300 lines in `LegalAI.jsx`) still exists alongside `buildContractStructured()` — the legacy version is partially superseded but not yet removed
