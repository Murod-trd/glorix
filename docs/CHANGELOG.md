# GLORIX — Changelog

This file is a dated, human-readable log of material changes to the platform. It is maintained going forward from this point; entries before the "Documentation system" entry are reconstructed from git history for context and are not necessarily exhaustive of every commit, only the ones that changed product behavior or architecture in a notable way.

## 2026-06-18 — Documentation system established

Created the full 12-file documentation system in `docs/` (`MASTER_PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `SYSTEM_DESIGN.md`, `BUSINESS_RULES.md`, `API_REFERENCE.md`, `DATABASE_SCHEMA.md`, `AI_AGENTS.md`, `SECURITY.md`, `DEPLOYMENT.md`, `INTEGRATIONS.md`, `CHANGELOG.md`, `DECISIONS.md`) as the project's single source of truth, built from a complete read-through of the codebase rather than from memory or assumption. This document set is intended to be the durable continuity mechanism between work sessions going forward.

## 2026-06-18 — Bilingual two-column contract redesign (commit `de7db0b`)

Per-country contract-language law research, with verified sources gathered for all 11 CIS countries (`src/data/legalSources.js` → `contractLanguage` field per country). Built a language-resolution rule: cross-border deals always render bilingual Russian/English regardless of either party's national language law; same-country deals follow that country's actual legal rule (mono Russian where permitted, mono national language where legally required, bilingual-by-law only for Kazakhstan). Produced a full English legal translation of the contract preamble and all 19 articles. Introduced a new structured contract data model (`src/data/contractData.js`) consumed identically by three new renderers — screen (`ContractTableView` in `LegalAI.jsx`), PDF (`contractPdfExport.js`), Word (`contractDocxExport.js`) — to prevent the three output formats from drifting out of sync with each other. Added a safety mechanism so that any language without a verified legal translation (e.g. Kazakh, Tajik, Georgian) renders as an explicit certified-translation-required placeholder rather than fabricated legal text. During development, found and fixed a real bug where all three renderers wrongly assumed the first table column was always Russian, which silently mislabeled real Russian text as Kazakh for Kazakh-Kazakh domestic contracts — fixed via a uniform `resolveColumnText(ruText, enText, lang)` helper applied independently to each column based on the actual resolved language, never assumed column order. Verified the fix end-to-end with an isolated Node test harness rendering real PDFs (via `pdftoppm`) and Word documents (via LibreOffice headless conversion) for three scenarios: UZ–RU cross-border bilingual, KZ–KZ domestic mandatory-bilingual, TJ–TJ domestic mono-national (revealing, correctly, an entirely placeholder document since no verified Tajik translation exists yet — accepted as a known, intentional limitation for the current demo stage; see `DECISIONS.md`).

## 2026-06-18 — Specification/date fixes and Document Center cross-link (commit `ec51eee`)

Removed an incorrect tax clause from the contract template, fixed a date bug in the Specification (Приложение № 1) document, and added a cross-link between the Specification generator and the Document Center page so users are pointed to the right tool for the right document.

## Earlier history (reconstructed from git log, not exhaustively detailed)

- **Arbitration/applicable-law verification** (`44d228a`, `c165230`): verified and corrected the named national arbitration institutions for all 11 CIS countries, and fixed applicable-law/arbitration selection to be based on the actual contracting parties' countries rather than a fixed default.
- **Word export added** (`4a4342f`): added `.docx` export alongside the existing PDF export, using the `docx` library.
- **Branded PDF letterhead** (`7fa05c4`): introduced the professional PDF document design with the GLORIX letterhead, logo treatment, and embedded fonts.
- **Cyrillic font embedding** (`86f680f`): added real PDF export with an embedded Cyrillic-capable font (Roboto), fixing earlier Cyrillic rendering issues in generated PDFs.
- **SPA routing fix** (`6dd03ba`): added the `vercel.json` rewrite rule that fixes 404s on direct/deep-link route access — this is the rule documented in `DEPLOYMENT.md`.
- **Legal AI module build-out** (`3c054fd`, `d8900be`, `dab7ce7`): built out the Legal AI document generator from an initial 20-article contract through the mirror-penalty standard, CISG/English/Swiss law options, and an 11-country CIS legal-source database, eventually becoming the article-based, multi-document-type generator (`LegalAI.jsx`) described in `SYSTEM_DESIGN.md`.
- **Account/permissions fixes** (`ebb4146`, `5c9c0da`, `b2afdb5`): established the three-separate-account model (buyer/seller/both, each with its own nav config, mock company, and trust score), fixed buyer/seller permission gating (e.g. sellers being unable to create tenders), and added the Excel-paste / TN VED search / AI КП-generator features now found in `DocumentCenter.jsx` and `Marketplace.jsx`.

## Format for future entries

New entries go at the top, in `## YYYY-MM-DD — Short title (commit hash if applicable)` format, with enough prose detail that someone reading only this file (not the diff) understands what changed and, where relevant, why. When a change affects any rule in `BUSINESS_RULES.md`, any architectural fact in `ARCHITECTURE.md`/`SYSTEM_DESIGN.md`, or any decision rationale in `DECISIONS.md`, update those files in the same work session — this changelog records that something changed; the other documents must reflect the new current state.
