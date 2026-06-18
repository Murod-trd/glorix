# GLORIX — API Reference

## There is currently no backend API

This needs to be stated plainly: GLORIX has no server, no REST/GraphQL endpoint, no webhook receiver, and makes no `fetch`/`axios` calls to any first-party backend anywhere in the codebase. Every "request/response" interaction in the product is a client-side function call against in-memory JavaScript data, often wrapped in an artificial `setTimeout(..., 1500)` purely to simulate network latency for UX purposes. This document therefore has two purposes: (1) record the actual callable function signatures that exist today, since they are the real interface other code in this repo depends on, and (2) sketch the API surface that a real backend would need to expose, derived directly from what the current mock-data shape and UI flows already assume.

## Part 1 — Existing client-side functions (the de facto "API" today)

### `src/data/mock.js`

- `calcDeposit(amount: number) → { rate: number, deposit: number }` — tender escrow deposit calculation. See `BUSINESS_RULES.md` §1.
- `currentUser` — the active mock user object, derived from `localStorage.getItem('glorix_account_type')` at module load time.
- `tenders` — static array of 3 mock tenders.
- `aiAnalysis` — static object with 3 mock offers for the one demo tender, plus an `aiNote`/`recommended` flag per offer.
- `depositRates` — the 4-tier rate table backing `calcDeposit` and the `/deposit` rate-table UI.
- `stats` — static dashboard counters (`activeTenders`, `countries`, `totalVolume`, `avgTrustScore`).

### `src/data/marketplace.js`

- `calcMarketplaceFee(amount: number) → number` — marketplace transaction fee percentage. See `BUSINESS_RULES.md` §2.
- `products` — static array of 6 mock marketplace listings, each with nested `seller`, `specs` (grouped), `certifications`, `reviewsList`, `aiCheck`.
- `categories` — static category list used for marketplace filtering.

### `src/data/accounts.js`

- `accountTypes` — the 3 account-type definitions (buyer/seller/both) with `requiredDocs`, `categoryDocs`, `features`, `restrictions`.
- `originCertTypes` — the 5 certificate-of-origin types (CT‑1, Form A, EUR.1, CT‑EZ, general).
- `docTemplates` — the 7-entry document template catalog.

### `src/data/cips.js`

- `suppliers` — 3 mock suppliers with full CIPS 10C / ESG / KPI / Anti-Fraud nested data.
- `rfiList`, `rfiAnswers` — mock RFI requests and their (anonymous) supplier answers, including pre-computed `aiScore`/`aiNote` per answer.
- `kpiHistory` — 6 months of mock KPI trend data.
- `antiFraudChecks` — the 10-check definition list.
- `communityMessages` — seed messages for the anonymous RFI-page community chat.

### `src/data/legalSources.js`

- `legalSources` — per-country array (11 CIS countries) with cited legal-source links and a `contractLanguage` object per country (see `BUSINESS_RULES.md` §5).
- `internationalSources`, `internationalLaw`, `docTypes` — supporting reference data for the Legal AI document generator's law-selection UI.
- `mirrorPenalties` — the mirror-penalty standard object. See `BUSINESS_RULES.md` §4.

### `src/data/contractData.js`

- `resolveContractLanguage(sellerCountry: string, buyerCountry: string) → { mode, primary, secondary, warning, mandatory?, requiresCertifiedTranslation?, nationalOnly?, unverifiedCaution? }` — the bilingual-contract language decision function. See `BUSINESS_RULES.md` §5 and `DECISIONS.md`.
- `buildContractStructured(formData: object) → ContractStructured` — builds the full structured contract object (18 articles + preamble + appendices + disclaimer + language metadata) consumed by all three contract renderers. See `SYSTEM_DESIGN.md`.
- `LANG_NAMES` — language-code → native-script display-name map.

### `src/pages/LegalAI.jsx` (internal, not exported elsewhere)

- `buildContract(formData) → string` — legacy plain-text contract builder, superseded by `buildContractStructured` for the screen/PDF/Word table renderers but still present in the file.
- `buildOffer(formData) → string`, `buildSpecification(formData) → string`, `buildClaim(formData) → string`, `buildAcceptance(formData) → string` — the four remaining plain-text document builders (Pipeline A in `SYSTEM_DESIGN.md`).

### `src/utils/`

- `downloadTextAsPdf(text: string, filename: string) → void` (`pdfExport.js`) — generic plain-text → branded PDF.
- `downloadTextAsDocx(text: string, filename: string) → Promise<void>` (`docxExport.js`) — generic plain-text → branded Word document.
- `downloadContractAsPdf(data: ContractStructured, filename: string) → void` (`contractPdfExport.js`) — structured bilingual contract → branded PDF table.
- `downloadContractAsDocx(data: ContractStructured, filename: string) → Promise<void>` (`contractDocxExport.js`) — structured bilingual contract → branded Word table.

## Part 2 — Implied API surface for a real backend (MVP-phase planning reference)

This is a forward-looking sketch, not a contract anyone has committed to. It exists so that whoever builds the real backend (per the Roadmap's MVP phase) has a starting point derived from what the current frontend already assumes about shape and behavior, rather than designing from a blank page. Treat every endpoint below as a proposal to validate against real product requirements at MVP time, not as something already decided.

| Concern | Plausible endpoint(s) | Backed by current mock shape in |
|---|---|---|
| Auth / session | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | `AccountSelect.jsx`, `Onboarding.jsx` |
| Company verification | `POST /companies/verify` (registry lookup by country + tax ID) | `Onboarding.jsx` step 1, `AccountVerification.jsx` |
| Tenders | `GET/POST /tenders`, `GET /tenders/:id`, `POST /tenders/:id/offers` | `mock.js` tenders shape, `Tenders.jsx`, `CreateTender.jsx` |
| Marketplace | `GET/POST /products`, `POST /orders` | `marketplace.js` products shape, `Marketplace.jsx` |
| Escrow / deposits | `POST /deposits`, `POST /deposits/:id/release` | `calcDeposit`, `DepositTrust.jsx`, Onboarding step 4 |
| Trust score | `GET /users/:id/trust-score` (server-computed, not client-trusted) | `DepositTrust.jsx` formula |
| RFI | `GET/POST /rfi`, `POST /rfi/:id/responses` | `cips.js` rfiList/rfiAnswers |
| Supplier scorecard | `GET /suppliers/:id/scorecard` | `cips.js` suppliers shape |
| Document generation | `POST /documents/generate` (type, formData) → file | `LegalAI.jsx`, `DocumentCenter.jsx` |
| Sanctions screening | `POST /compliance/screen` (entity, country) against real OFAC/EU/UN lists | `Legal.jsx` §6, `Marketplace.jsx` `aiCheck.sanctionsOk` |

Critically: trust score, deposit verification, and sanctions screening must be **server-computed and server-trusted** in any real implementation — none of the current client-side equivalents (`calcDeposit`, the trust-score arithmetic, the static `aiCheck.sanctionsOk` flags) should ever be taken as authoritative once a backend exists, since a client can trivially fabricate any value a backend would otherwise compute.
