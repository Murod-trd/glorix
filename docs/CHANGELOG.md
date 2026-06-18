# GLORIX — Changelog

New entries go at the **top** in `## YYYY-MM-DD — Title (commit hash)` format. When a change affects any rule in `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `SYSTEM_DESIGN.md`, or `DECISIONS.md`, update those files in the same commit — this log records that something changed; the other documents must reflect the new current state.

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
