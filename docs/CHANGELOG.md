# GLORIX — Changelog

New entries go at the **top** in `## YYYY-MM-DD — Title (commit hash)` format. When a change affects any rule in `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `SYSTEM_DESIGN.md`, or `DECISIONS.md`, update those files in the same commit — this log records that something changed; the other documents must reflect the new current state.

---
## 2026-06-19 — Sanctions/export-control screening added (founder-reported critical gap); seller permission bug fixed (#11); dead code removed (#8, #21); roadmap dates updated (#12)

**Sanctions screening — the headline fix.** The founder personally tested the platform by attempting to create a tender and list a marketplace product with clearly sanctioned/export-controlled content. Neither was blocked, and no warning appeared — confirming that `sanctions: false` and `aiCheck.sanctionsOk: true` in `marketplace.js` are static demo values with zero connection to actual user input. This had already been flagged as a known limitation in `BUSINESS_RULES.md` (Sanctions list absence row, and the Legal.jsx sanctions-claim line) but never actually fixed. Left unaddressed, this is not just a missing feature — it is a real path for the platform itself to become a target of sanctions enforcement once it handles real trade.

Created `src/utils/sanctionsScreening.js`, a single module (`screenForSanctions()`) shared by both `Marketplace.jsx` and `CreateTender.jsx` rather than duplicated. It implements an honest two-tier model rather than overclaiming what keyword-matching can do:

- **Hard block**: unambiguous categories (weapons, military equipment, nuclear/chemical/biological materials) that are prohibited from civilian B2B trade under every major control regime without exception. Publication is fully disabled — no override exists in the UI.
- **Review required**: dual-use categories (mapped to the Wassenaar Arrangement / EU Regulation 2021/821 Annex I category structure — microelectronics, telecom, navigation, certain chemicals, aerospace components, military-spec metals, higher-scrutiny petroleum products). Publication is blocked until the user explicitly checks a box confirming they've reviewed the item themselves — the platform states it requires manual review, not that the item is "clear."

Both forms now show explicit, plain-language warning UI and disable their publish buttons accordingly. This is explicitly **not** a real integration with OFAC/EU/UN sanctions databases or export control classification (ECCN / EU Annex I) — that requires a real backend and database and remains correctly scoped to the Beta phase in `Roadmap.jsx`. What this closes is the much more basic and more urgent gap: there was previously *no check of any kind* on user-entered text. `docs/BUSINESS_RULES.md` updated in two places to draw this distinction precisely, so the existing honest disclosure isn't accidentally overwritten with a false "fully solved" claim.

**Found and fixed a Rules of Hooks bug while wiring this in.** The first pass at `CreateTender.jsx` placed a new `useState` call after the component's existing conditional `return` (added moments earlier for the seller-permission fix below) — meaning seller-type accounts would execute fewer hook calls than buyer-type accounts on the same component, a Rules of Hooks violation that can cause React state corruption or runtime errors. Fixed by moving all `useState` calls to the top of the component, before any conditional return.

**#11 closed.** The "Создать тендер" button was visible to all account types, including sellers, who are not permitted to create tenders. Fixed in two places: `Tenders.jsx` now hides the button when `!canBuy` (via `useAccountType()`); `CreateTender.jsx` now also guards the route itself — a seller navigating directly to `/create` by URL sees an explicit "not available for your account type" screen instead of the form.

**#8 closed.** Removed the dead `resolveContractLanguage` function from `LegalAI.jsx` (lines 14-64, including its explanatory comment) — re-confirmed zero call sites before deletion. The working version in `contractData.js` is unaffected.

**#21 closed.** Deleted `src/data/accountState.js` — confirmed zero imports anywhere in the codebase.

**#12 closed.** Updated stale dates in `Roadmap.jsx`: MVP moved from "Q3 2025" to "Q3 2026", Beta from "Q4 2025" to "Q1 2027", Production from "2026" to "2027". Phase contents unchanged, only timing.

Verified with `npm run build`: succeeds, main chunk grew modestly (651.62KB → 659.33KB, from the new screening module) — the 🔴#4 bundle optimization remains intact.

**Files changed**: `src/utils/sanctionsScreening.js` (new), `src/pages/Marketplace.jsx`, `src/pages/CreateTender.jsx`, `src/pages/Tenders.jsx`, `src/pages/LegalAI.jsx`, `src/pages/Roadmap.jsx`, `src/data/accountState.js` (deleted), `docs/BUSINESS_RULES.md`, `docs/SESSION_STATE.md`.

---


## 2026-06-19 — Merged isolated-session work into the real repository (commit cfd0253); fixed module-scope localStorage reads (🟠 #6)

**Part 1 — repository merge.** The previous three changelog entries (index.html recovery, demo disclaimers, AI-label rename + watermarks) were produced in a separate sandboxed session that had no git access to GitHub (the handover archive contained no `.git/` history, and direct token-based git remote setup was declined for security reasons in that session). The founder exported that session's work as a unified diff (`diff -ruN`) against the original handover snapshot. The diff's file headers pointed at two different temporary directory paths, which made it inapplicable via standard `git apply`/`patch` without manual correction; it was split into 14 per-file blocks, headers rewritten to relative paths, and applied cleanly via `patch -p0` with zero conflicts. Verified with a real `npm run build` (the previous session could only verify syntax, not a full build, due to the missing `index.html`). Committed and pushed as `cfd0253`. `docs/SESSION_STATE.md` was also consolidated — the three incremental "step" sections from the isolated session were merged into one clean current-state snapshot, with the original step-by-step detail preserved verbatim in the history section rather than discarded.

**Part 2 — 🟠 #6 closed.** `accountType` was previously read from `localStorage` at module scope in `mock.js`, `Marketplace.jsx`, and `Dashboard.jsx` — meaning the value was computed once when the module first loaded and never updated again without a full page reload. `AccountSelect.jsx` worked around this with `navigate('/')` followed by `window.location.reload()`, plus an unused `window.dispatchEvent(new Event('glorix_account_changed'))` with no subscribers.

Created `src/context/AccountContext.jsx` — a single React Context exposing `useAccountType()` (`accountType`, `canBuy`, `canSell`, `setAccountType()`). All consumers now read account type reactively instead of from a stale module-level constant:
- `mock.js`: `currentUser` (a static export) replaced with `getCurrentUser(accountType)`, a pure function with no import-time side effects
- `Marketplace.jsx`, `Dashboard.jsx`: module-scope `accountType`/`canBuy`/`canSell` removed, now read via the hook inside the component
- `DepositTrust.jsx`, `Profile.jsx`: switched from importing the static `currentUser` to calling `getCurrentUser(accountType)`
- `Sidebar.jsx`: direct `localStorage.getItem` replaced with the hook
- `AccountSelect.jsx`: **`window.location.reload()` removed** — switching accounts now calls `setAccountType()` and updates every subscribed component instantly, with no page reload
- `DocumentCenter.jsx`: found and fixed an adjacent duplication while making this change — `generateKP()` hardcoded company names per account type directly in the function instead of reusing the single source of truth (`users` in `mock.js`); now calls `getCurrentUser(accountType).name`
- `App.jsx`: wrapped in `<AccountProvider>`

Verified with `npm run build`: succeeds, main chunk size unchanged (651.62KB — the 🔴 #4 bundle optimization is unaffected), no `modulepreload` hints on the heavy chunks.

**Files changed**: `src/context/AccountContext.jsx` (new), `src/data/mock.js`, `src/pages/Marketplace.jsx`, `src/pages/Dashboard.jsx`, `src/pages/DepositTrust.jsx`, `src/pages/Profile.jsx`, `src/pages/AccountSelect.jsx`, `src/pages/DocumentCenter.jsx`, `src/components/Sidebar.jsx`, `src/App.jsx`, `docs/SESSION_STATE.md`.

---


## 2026-06-19 — index.html recovered, bundle size measured: 🔴 #4 fully closed (commit — see SESSION_STATE.md)

`index.html` was missing from the handover snapshot used to start this session (flagged as a blocker in the previous two changelog entries). The founder supplied the actual original file content directly, confirmed as the real source rather than a reconstruction. It contains a Google Fonts CDN `<link>` (Inter + Space Grotesk via `fonts.googleapis.com`), which confirms open audit item 🟡 #15 (Google Fonts blocked in Russia) as a real, present issue rather than a hypothetical one — not addressed in this entry, left as its own open item.

With `index.html` in place, `npm run build` succeeds. Measured the actual effect of the lazy-loading change made earlier in this session (previously logged as "not yet measured"):

- **Before** (per original audit): 1.76MB single bundle.
- **After**: the built `dist/index.html` loads only `index-DHuX0M06.js` (652KB raw, 171.25KB gzipped) plus a 2.65KB stylesheet on initial visit — confirmed by inspecting the generated HTML directly; no `modulepreload` hints point at the heavy chunks. `robotoFont.js` (734KB), jsPDF (360KB), `html2canvas` (200KB, a docx dependency), the `docx` library itself (151KB), and `purify.es` (26KB) — roughly 1.47MB combined — now load only when a user clicks a PDF/Word export button, not on page load.

This closes 🔴 #4 fully (previously logged as partial, since the measurement was blocked).

**Files changed**: `index.html` (new), `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Inline demo disclaimers in CreateTender / Marketplace / AccountVerification (commit — see SESSION_STATE.md)

Closed 🔴 #2 from the open audit list.

Added inline gold-styled "⚠ Демо-режим" notices (same visual treatment already used for the contract disclaimer text) at the point of action in each of the three flagged flows:

- **`CreateTender.jsx`** — above the "Опубликовать тендер" button.
- **`Marketplace.jsx`** — three locations: the buy-confirmation success screen ("Заказ размещён"), the payment step right before "Оплатить", and the seller's list-product success screen ("Товар размещён!"). The existing `alert('... (демо)')` was left in place but is no longer the only signal — the inline block now carries the disclosure since a dismissible browser alert is easy to miss.
- **`AccountVerification.jsx`** — near the required-documents upload checklist (clarifying the "Загрузить" buttons don't accept real files) and near "Активировать аккаунт продавца". This flow sits next to genuine legal text about administrative/criminal liability for unlicensed trading in most CIS countries, which made the missing disclaimer here the most consequential of the three.

**Noted but not fixed in this pass**: confirmed while editing `Marketplace.jsx` that `localStorage.getItem('glorix_account_type')` is read at module scope (line 4, before component definition) — exactly the pattern described in open item 🟠 #6. Left untouched, out of scope for this fix; flagged as the next logical candidate.

**Files changed**: `src/pages/CreateTender.jsx`, `src/pages/Marketplace.jsx`, `src/pages/AccountVerification.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Audit fixes: misleading AI label, draft watermarks, lazy-loaded exports, calcDeposit validation (commit — see SESSION_STATE.md)

Closed four items from the open audit list in `SESSION_STATE.md`.

**🔴 #1 — Misleading "Ставка ИИ" label.** Renamed to "Ставка депозита" in `Tenders.jsx`, `DepositTrust.jsx`, `CreateTender.jsx`, and the matching phrase in `RelationshipManager.jsx`. The underlying value is a tiered linear interpolation in `calcDeposit()` (`mock.js`), not an AI computation — the label now matches what the code actually does. `Dashboard.jsx`'s "ИИ-анализ" text was left untouched: it refers to the separate offer-comparison mock (`aiAnalysis`), a genuinely distinct feature, not the same mislabeling.

**🔴 #3 — No draft watermark on generated contracts.** PDF (`contractPdfExport.js`): added a diagonal "ПРОЕКТ / DRAFT" watermark on every page via jsPDF's `GState`/`saveGraphicsState` opacity API (verified present in installed jspdf 4.2.1). DOCX (`contractDocxExport.js`): the `docx` v9.7.1 library has no diagonal page-watermark API (verified directly against the package), so a prominent gold banner row — "ПРОЕКТ / DRAFT — документ не подписан и не имеет юридической силы" — was added at the top of the document body instead. Same protective intent, achieved with the technique each library actually supports.

**🔴 #4 (partial) — 1.76MB bundle, fonts/jspdf/docx loaded eagerly.** `downloadTextAsPdf`, `downloadTextAsDocx`, `downloadContractAsPdf`, `downloadContractAsDocx` were statically imported at module top-level in `Marketplace.jsx`, `DocumentCenter.jsx`, `LegalAI.jsx` despite only being called inside `onClick` handlers. Converted all four call sites across the three files to dynamic `import()` inside the click handler. This removes jsPDF, `docx`, and the two embedded fonts (`robotoFont.js` 434KB + `ptSerifFont.js` 119KB) from the initial bundle of every page that has an export button — they now load only when the user actually clicks export. **Not yet measured**: the project's `index.html` is missing from the current working tree (not present in the handover snapshot used to start this session), so `npm run build` fails with `UNRESOLVED_ENTRY` and the new bundle size could not be verified end-to-end. Flagged in `SESSION_STATE.md` as an open blocker — needs either the original `index.html` recovered from GitHub history or an explicit decision on its contents (it likely contained the Google Fonts `<link>` tag relevant to audit item 🟡 #15, and writing a new one blind risks inventing content for that exact item).

**🟠 #7 — `calcDeposit()` had no input validation.** Added: any non-finite or negative `amount` now returns `{ rate: 0, deposit: 0 }` instead of propagating `NaN` through the tiered-rate math.

**Explicitly not touched, with reason:**
- 🟡 #18 (Ukraine flag in `aiAnalysis` mock) — left untouched. This is a content judgment call with geopolitical sensitivity, not a bug; requires an explicit founder decision rather than being folded silently into an unrelated fix.
- 🔴 #5 (escrow licensing) — legal question, out of scope for a code session.

**Files changed**: `src/data/mock.js`, `src/pages/Tenders.jsx`, `src/pages/DepositTrust.jsx`, `src/pages/CreateTender.jsx`, `src/pages/RelationshipManager.jsx`, `src/utils/contractPdfExport.js`, `src/utils/contractDocxExport.js`, `src/pages/Marketplace.jsx`, `src/pages/DocumentCenter.jsx`, `src/pages/LegalAI.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-18 — Full project documentation system (commit `9fbfecd`)

Created 13-file documentation system in `docs/` as the single source of truth and durable continuity mechanism for future sessions. Built from a complete read-through of the entire codebase (every page, every data file, `App.jsx`, `package.json`, `vercel.json`, `vite.config.js`, full git history). Covers architecture, business rules, API reference, database schema, AI agents (honest inventory), security, deployment, integrations, decisions (with full rationale), roadmap, and this changelog. Replaces reliance on chat history for project continuity.

**Files created**: All 13 files in `docs/`.

---

## 2026-06-18 — Bilingual two-column contract redesign — screen/PDF/Word (commit `de7db0b`)

Major architectural addition to the document generation system (Pipeline B).

**Research**: Per-country contract-language law research for all 11 CIS countries, with verified legal source citations stored in `legalSources.js` → `contractLanguage` field per country. Full verified English translation of all 19 contract articles produced (`research/contract_en_translation_draft.md`).

**New language resolver**: `resolveContractLanguage(sellerCountry, buyerCountry)` in `contractData.js`. Decision tree: cross-border → always bilingual RU/EN; same-country → follows actual domestic law; Kazakhstan → bilingual KK+RU mandatory.

**New structured data model**: `buildContractStructured(f)` returns a typed object (18 articles, preamble, appendices, disclaimer, language metadata) consumed by all three renderers identically, eliminating screen/PDF/Word drift.

**Three new renderers**: `ContractTableView` component in `LegalAI.jsx` (screen), `contractPdfExport.js` (PDF with jsPDF hand-drawn table + pagination), `contractDocxExport.js` (Word with `docx` library Table).

**Safety mechanism**: `resolveColumnText(ruText, enText, lang)` helper — for any language other than `ru`/`en`, renders explicit certified-translation-required placeholder.

**Bug found and fixed**: All three renderers initially assumed column 1 = Russian, silently mislabeling Russian text as Kazakh for Kazakhstan contracts. Fixed by applying `resolveColumnText` independently per column based on actual resolved language, never by position. Verified by rendering real PDFs with `pdftoppm` and Word via LibreOffice headless conversion.

**PDF cosmetic fix**: `pdfSafeLangName()` map in `contractPdfExport.js` substitutes Russian-script column headers for languages whose scripts PT Serif lacks (Kazakh `Қ`, Tajik `ҷ/ӣ`, Georgian). Column headers only — not legal text.

**Known limitation accepted**: TJ, GE, AZ, KG, TM domestic-mono contracts render entirely as placeholders — no verified translations available. Founder accepted explicitly: "Оставить как есть — это demo."

**Files changed**: `src/data/legalSources.js`, `src/data/contractData.js` (new), `src/pages/LegalAI.jsx`, `src/utils/contractPdfExport.js` (new), `src/utils/contractDocxExport.js` (new), `research/contract_en_translation_draft.md` (new), `research/language_law_findings.md` (new).

---

## Earlier History (Reconstructed from Git Log)

### 2025 — `ec51eee` — Contract/Specification fixes + Document Center cross-link

Removed incorrect tax clause from contract template. Fixed date bug in Specification (Appendix №1) document. Added navigation cross-link between the Specification generator and Document Center.

### 2025 — `44d228a` — Verified national arbitration institutions for all 11 CIS countries

All named national arbitration bodies in the contract generator verified against real sources and corrected. Previously some entries had unverified or generic institution names — each is now the actual named body per that country's arbitration law.

### 2025 — `4a4342f` — Word (.docx) export added

Added `.docx` export alongside existing PDF export, using the `docx` library. This was the first iteration of Pipeline A's Word renderer (`docxExport.js`).

### 2025 — `7fa05c4` — Branded PDF letterhead

Professional PDF document design: GLORIX letterhead, logo treatment (GLO in text color, RIX in accent), PT Serif embedded font, page numbers, accent rule. Applied to both Pipeline A (`pdfExport.js`) and later Pipeline B.

### 2025 — `c165230` — Arbitration and law based on actual party countries

Fixed: applicable law and arbitration institution now derived from actual seller/buyer country data rather than a hardcoded default.

### 2025 — `86f680f` — Real PDF with embedded Cyrillic font (Roboto)

Replaced initial PDF approach (no font embedding, broken Cyrillic) with embedded Roboto font via base64 in `robotoFont.js`. PT Serif added later for legal documents.

### 2025 — `6dd03ba` — Vercel.json SPA routing fix

Added `vercel.json` with the `/(.*) → /index.html` rewrite rule. Fixes 404 on direct URL access or browser refresh on any deep-link route.

### 2025 — `228edd6` — Scrollable sidebar navigation

Fixed Sidebar overflow issue — nav items were getting cut off on shorter screens.

### 2025 — `3c054fd` — GLORIX v14: LegalAI full 20-article contract

Full 20-article (later 18-article after refactoring) contract in the Legal AI module, with proper preamble and article structure. First comprehensive contract template.

### 2025 — `d8900be` — GLORIX v13: Mirror penalties + CISG/English/Swiss law options

Added mirror-penalty standard (symmetric 0.1%/day, 10% cap, bilateral non-delivery penalty). Added international law selection options (CISG, English law, Swiss law) for cross-border contracts. Added TFD (real-contract) analysis that surfaced the original asymmetric penalty terms this standard fixes.

### 2025 — `dab7ce7` — GLORIX v12: Legal AI with 11-country CIS law database

11 CIS countries' legal source databases in `legalSources.js`. Article-based document generator for contract, oferta/offer, and claim document types. Foundation of the Legal AI module.

### 2025 — `ebb4146` — GLORIX v11: Excel paste, TN VED search, КП table format

Fixed: sellers couldn't create tenders (permission bug). Added Excel paste functionality and TN VED code search in Document Center. Reformatted commercial offer (КП) output as a structured table.

### 2025 — `5c9c0da` — GLORIX v10: Buyer/seller permission fixes + AI КП generator

Fixed buyer/seller permission gating. Added "Add product" form with AI-labeled КП generator (the first scripted-template document generator).

### 2025 — `b2afdb5` — GLORIX v9: Three real separate accounts

Three distinct demo accounts (buyer: Tashkent Agro LLC, seller: FerganaTex Export, both: BekabadMetal Group), each with own nav config, mock company profile, and trust score.

### 2025 — `0981db5` — GLORIX v8: Account types, Document Center, origin certificates

Three account types (buyer/seller/both) with KYC requirements. Document Center page. License verification flow. Certificate of origin types (CT-1, Form A, EUR.1, CT-EZ).

### 2025 — `af9570b` — GLORIX v7: Relationship Manager, Analytics, Price Alerts

Relationship Manager page (simulated). Analytics Dashboard (static). Price alerts concept.

### 2025 — `b1a2a68` — GLORIX v6: Onboarding, Legal ToS, Support/FAQ, Roadmap

5-step onboarding wizard. Platform Terms of Service / Oferta draft (`Legal.jsx`). Support + FAQ page. Roadmap and competitive analysis page. ⚠ ДЕМО badge on Sidebar.

### 2025 — `99f1a0b` — GLORIX v5: RFI working buttons, anonymous community chat, AI bot replies

RFI module: working "View answers" modal, anonymous community chat, first AI-bot reply simulation.

### 2025 — `5aa6f5a` — GLORIX v4: Marketplace with photos/specs/reviews, AI Bots simulation

Full Marketplace with product photos, grouped specs, reviews, `calcMarketplaceFee()`. AI Bots page with scripted scenario simulation.

### 2025 — `c5c1391` — GLORIX v3: CIPS Scorecard, ESG, RFI, Anti-Fraud, KPI

Supplier Scorecard with CIPS 10C / ESG / KPI / Anti-Fraud tabs. RFI module (initial). Full `cips.js` data model.
