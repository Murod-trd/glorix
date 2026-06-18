# GLORIX — System Design

This document covers the visual design system (tokens, shared classes, layout conventions) and the structural design of the document-generation/rendering system, which is the most architecturally interesting part of the frontend.

## Visual design tokens

All design tokens are CSS custom properties defined in `src/index.css` under `:root`. There is no design-token build step or Tailwind config — these are plain CSS variables consumed via `var(--token-name)` inside inline `style` objects throughout the codebase.

```css
--navy: #0A0F1E;        /* primary background */
--navy-2: #111827;      /* secondary background (modals, headers) */
--navy-3: #1a2236;      /* tertiary background (inputs, inset panels) */
--accent: #00D4AA;      /* brand teal/green — primary actions, success, "active" state */
--accent-dim: rgba(0, 212, 170, 0.12);
--accent-glow: rgba(0, 212, 170, 0.3);
--gold: #F5A623;        /* warnings, deposit/financial highlights, "yellow zone" */
--gold-dim: rgba(245, 166, 35, 0.12);
--red: #FF4D4D;         /* errors, danger actions, "red zone" */
--red-dim: rgba(255, 77, 77, 0.12);
--text: #E8EDF5;        /* primary text */
--text-2: #8A96A8;      /* secondary/muted text */
--text-3: #4A5568;      /* tertiary/placeholder text */
--border: rgba(255,255,255,0.07);
--border-2: rgba(255,255,255,0.12);
--card: rgba(255,255,255,0.04);
--card-hover: rgba(255,255,255,0.07);
--radius: 12px; --radius-sm: 8px; --radius-lg: 16px;
--font-display: 'Space Grotesk', sans-serif;   /* headings, numbers, logo */
--font-body: 'Inter', sans-serif;               /* body text */
--shadow: 0 4px 24px rgba(0,0,0,0.4);
--shadow-accent: 0 0 32px rgba(0, 212, 170, 0.15);
```

Dark navy background throughout; teal/green (`--accent`) is the primary brand color and doubles as the "good/active/success" semantic color; gold is reused for both "money/financial" emphasis and "caution/warning" states; red is reserved for genuine danger and the "red zone" trust tier.

## Shared utility classes (`src/index.css`)

A small set of reusable classes exist alongside the token-based inline styling: `.card` (the base bordered panel used everywhere), `.badge` + `.badge-green`/`.badge-gold`/`.badge-red` (status pills), `.btn` + `.btn-primary`/`.btn-ghost`/`.btn-danger` (buttons), `.tag` (small inline category/metadata chips), `.fade-in` (entrance animation), `.divider` (horizontal rule). Beyond these, every page builds its layout with one-off inline `style={{ }}` objects — there is no component library or shared layout primitives beyond `Sidebar`.

## Logo treatment

"GLO" in the default text color + "RIX" in `--accent` teal, set in `--font-display` with letter-spacing — this exact two-tone treatment is repeated consistently across the in-app header/sidebar, the PDF export header (drawn manually with `jsPDF` text calls), and the Word export header (built with `docx` `TextRun`s), so all three surfaces (screen, PDF, Word) carry the same brand mark.

## The document-generation system

GLORIX generates five kinds of trade documents from the `/legal-ai` page (`LegalAI.jsx`): **Contract** (Договор купли-продажи), **Offer** (Оферта поставщика), **Specification** (Приложение № 1), **Claim/Complaint** (Претензия), and **Acceptance** (Акцепт оферты). A sixth, simpler commercial-offer (КП) generator exists separately in `DocumentCenter.jsx` and inside the Marketplace "add product" flow, sharing the same generic plain-text exporters.

There are two parallel rendering pipelines in this codebase, because the Contract document was redesigned mid-project into a structured, two-column bilingual format while the other four document types remain simple plain-text templates. Both pipelines coexist and are both in active use.

### Pipeline A — plain-text documents (Offer, Specification, Claim, Acceptance, and the КП generators)

1. A `build*(formData)` function (`buildOffer`, `buildSpecification`, `buildClaim`, `buildAcceptance` in `LegalAI.jsx`; similar ad-hoc template functions in `DocumentCenter.jsx` and `Marketplace.jsx`) returns one long template-literal string.
2. The string is shown on screen inside a `<pre>` tag with `whiteSpace: 'pre-wrap'` and a serif font, styled to look like a printed document.
3. `src/utils/pdfExport.js` → `downloadTextAsPdf(text, filename)` draws the same string into a PDF using `jsPDF`, with a hand-coded GLORIX letterhead (logo, accent rule, footer with page numbers) and a heuristic line classifier (`isHeading`, `isDivider` equivalents) to decide which lines get bold/centered treatment.
4. `src/utils/docxExport.js` → `downloadTextAsDocx(text, filename)` does the equivalent using the real `docx` library's `Paragraph`/`TextRun`/`Header`/`Footer` components, with its own heading/divider heuristics (`isHeading()`, `isDivider()` functions defined in that file).

This pipeline is simple but fragile: because the "document" is just one big string, the PDF/Word renderers have to *guess* which lines are headings versus body text from regex patterns rather than being told explicitly.

### Pipeline B — structured bilingual Contract (the redesigned system)

This is the more robust pattern, built specifically because the plain-text approach could not safely support per-country bilingual legal text. It exists in three files that all consume one shared data shape:

1. **`src/data/contractData.js`** is the single source of truth. `buildContractStructured(formData)` returns one structured object: `{ title, num, city, date, year, seller, buyer, sellerCountryName, buyerCountryName, contractLang, appliedLaw, rate, maxP, sections: [{ heading: {ru, en}, clauses: [{ru, en}] }] (18 articles), appendices: {ru, en}, disclaimer: {ru, en} }`. Article 19 (signatures/banking details) is handled as dedicated top-level rendering logic rather than a clause section, since it is structurally a signature block, not prose.
2. **`resolveContractLanguage(sellerCountry, buyerCountry)`**, also in `contractData.js`, decides which language(s) the contract should render in (see `BUSINESS_RULES.md` for the full rule and `DECISIONS.md` for why it works this way). It returns `{ mode: 'bilingual'|'mono', primary, secondary, warning, mandatory?, requiresCertifiedTranslation?, nationalOnly?, unverifiedCaution? }`.
3. Three renderers consume the same structured object and apply the same column-resolution rule — never assume column order, always resolve text by checking each column's *actual* requested language:
   - **Screen**: the `ContractTableView` component inside `LegalAI.jsx` renders a real HTML `<table>`.
   - **PDF**: `src/utils/contractPdfExport.js` (`downloadContractAsPdf`) hand-draws a table with `jsPDF` (no table plugin), reusing the same letterhead/font pattern as Pipeline A's `pdfExport.js`, with row-height-aware pagination.
   - **Word**: `src/utils/contractDocxExport.js` (`downloadContractAsDocx`) uses the `docx` library's genuine `Table`/`TableRow`/`TableCell` components.

All three implement the identical helper pattern, `resolveColumnText(ruText, enText, lang)` (named consistently across all three files): if `lang === 'ru'` return the Russian text, if `lang === 'en'` return the English text, otherwise return an explicit placeholder string stating that text in that language requires professional legal translation. This function is applied independently to *both* the primary and secondary column on every row — it must never assume "column 1 is always Russian," because for Kazakhstan the resolver legitimately returns `primary: 'kk', secondary: 'ru'`. (A bug where exactly this wrong assumption caused real Russian text to render mislabeled as Kazakh was found and fixed during development — see `DECISIONS.md`.)

One PDF-specific wrinkle: the embedded PT Serif font lacks glyphs for Kazakh/Tajik Cyrillic-extended characters (Қ, ҷ, ӣ) and Georgian script. `contractPdfExport.js` therefore has a `pdfSafeLangName()` map that substitutes a Russian-script language label for the *column header only* in PDF output (e.g. "Казахский" instead of "Қазақша") — this is purely cosmetic and does not touch the legal text itself, which still goes through the same `resolveColumnText` safety check.

### Why two pipelines instead of migrating everything to Pipeline B

Pipeline B's structured-data approach is strictly better, but Offer/Specification/Claim/Acceptance have not been migrated to it. This is a known, accepted gap rather than an oversight — those four document types do not currently have the same bilingual-language requirement that motivated the Contract redesign, so the cost of migrating them has not yet been judged worth it. If any of those document types need real multi-language support in the future, they should be migrated to the Pipeline B pattern rather than growing more regex heuristics onto Pipeline A.
