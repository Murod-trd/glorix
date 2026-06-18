# GLORIX — System Design

## Design Tokens (`src/index.css` → `:root`)

All tokens are plain CSS custom properties. No build step, no Tailwind. Consumed via `var(--token)` inside inline `style={{ }}` objects throughout all components.

```css
/* Backgrounds */
--navy: #0A0F1E;               /* primary background */
--navy-2: #111827;             /* secondary (modals, panel headers) */
--navy-3: #1a2236;             /* tertiary (inputs, inset panels) */

/* Brand / Semantic Colors */
--accent: #00D4AA;             /* brand teal — primary CTA, success, active state */
--accent-dim: rgba(0,212,170,0.12);
--accent-glow: rgba(0,212,170,0.3);
--gold: #F5A623;               /* financial highlights + caution/warning */
--gold-dim: rgba(245,166,35,0.12);
--red: #FF4D4D;                /* errors, danger, red-zone trust */
--red-dim: rgba(255,77,77,0.12);

/* Typography */
--text: #E8EDF5;               /* primary text */
--text-2: #8A96A8;             /* secondary/muted */
--text-3: #4A5568;             /* placeholder/tertiary */

/* Borders / Cards */
--border: rgba(255,255,255,0.07);
--border-2: rgba(255,255,255,0.12);
--card: rgba(255,255,255,0.04);
--card-hover: rgba(255,255,255,0.07);

/* Radius */
--radius: 12px;
--radius-sm: 8px;
--radius-lg: 16px;

/* Fonts */
--font-display: 'Space Grotesk', sans-serif;  /* headings, numbers, logo */
--font-body: 'Inter', sans-serif;             /* body text */

/* Shadows */
--shadow: 0 4px 24px rgba(0,0,0,0.4);
--shadow-accent: 0 0 32px rgba(0,212,170,0.15);
```

**Color semantics**:
- `--accent` (teal) = good / active / confirmed / brand
- `--gold` = money/financial emphasis AND caution/warning (context-dependent)
- `--red` = danger / error / red-zone trust tier

## Shared Utility Classes (`src/index.css`)

Beyond tokens, a small set of reusable classes exists. Everything else is one-off inline styles.

| Class | Purpose |
|---|---|
| `.card` | Base bordered panel (used everywhere) |
| `.badge` | Status pill base |
| `.badge-green` / `.badge-gold` / `.badge-red` | Status pill variants |
| `.btn` | Button base |
| `.btn-primary` / `.btn-ghost` / `.btn-danger` | Button variants |
| `.tag` | Small inline category/metadata chip |
| `.fade-in` | Entrance animation |
| `.divider` | Horizontal rule |

## Logo Treatment

"**GLO**" in `--text` + "**RIX**" in `--accent` teal, set in `--font-display` with letter-spacing. This exact two-tone treatment is replicated consistently across:
- Screen (all pages, Sidebar header)
- PDF exports (`jsPDF` text calls in both `pdfExport.js` and `contractPdfExport.js`)
- Word exports (`docx` `TextRun`s in `docxExport.js` and `contractDocxExport.js`)

All three surfaces must continue to carry the same brand mark.

## Sidebar (`src/components/Sidebar.jsx`)

Fixed 220px left column. Account-type-aware: different nav items shown based on `localStorage.getItem('glorix_account_type')`. Carries a permanent `⚠ ДЕМО` badge linking to `/roadmap`. The `canBuy`/`canSell` flags gate which nav items appear.

---

## Document Generation System

GLORIX generates trade documents from `/legal-ai` (`LegalAI.jsx`). There are **two parallel rendering pipelines** (coexistence is intentional — see `DECISIONS.md`).

### Pipeline A — Plain-Text Documents (Offer, Specification, Claim, Acceptance, КП)

Used for: Оферта поставщика, Приложение №1, Претензия, Акцепт оферты, commercial offers (КП) from `DocumentCenter.jsx` and `Marketplace.jsx`.

**Flow**:
1. `build*(formData)` function returns one long template-literal string (`buildOffer`, `buildSpecification`, `buildClaim`, `buildAcceptance` in `LegalAI.jsx`)
2. Shown on screen in `<pre style={{ whiteSpace: 'pre-wrap' }}>`
3. → `downloadTextAsPdf(text, filename)` (`pdfExport.js`): jsPDF draws the string with a GLORIX letterhead + heuristic heading/divider classification (`isHeading`, `isDivider` pattern matchers)
4. → `downloadTextAsDocx(text, filename)` (`docxExport.js`): same via `docx` library `Paragraph`/`TextRun`

**Weakness**: renderers guess structure from regex patterns over a flat string — fragile if formatting conventions change.

### Pipeline B — Structured Bilingual Contract (Договор купли-продажи)

Used exclusively for the Contract document type. Built because a flat string cannot safely represent per-country bilingual legal text with per-column language safety checks.

**Three files share one data shape**:

| File | Role |
|---|---|
| `src/data/contractData.js` | Single source of truth: `buildContractStructured(f)` + `resolveContractLanguage()` |
| `LegalAI.jsx` → `ContractTableView` | Screen renderer (HTML `<table>`) |
| `src/utils/contractPdfExport.js` | PDF renderer (jsPDF hand-drawn table, pagination) |
| `src/utils/contractDocxExport.js` | Word renderer (`docx` `Table`/`TableRow`/`TableCell`) |

**`ContractStructured` shape** returned by `buildContractStructured(f)`:
```
{
  title: {ru, en},
  num, city, date, year,
  seller, buyer, sellerCountryName, buyerCountryName,
  contractLang: { mode, primary, secondary, warning, mandatory?, requiresCertifiedTranslation?, nationalOnly?, unverifiedCaution? },
  appliedLaw, rate, maxP,
  sections: [{ heading: {ru, en}, clauses: [{ru, en}] }],  // 18 articles
  appendices: {ru, en},
  disclaimer: {ru, en}
}
```
Article 19 (signatures + banking details) is handled as dedicated top-level rendering logic in all three renderers, not as a clause section.

**The `resolveColumnText` pattern** (mandatory in ALL contract renderers, never assume column order):
```js
function resolveColumnText(ruText, enText, lang) {
  if (lang === 'ru') return ruText;
  if (lang === 'en') return enText;
  return `[${LANG_NAMES[lang]}: текст требует профессионального юридического перевода]`;
}
```
Applied independently to each column's actual `contractLang.primary` / `contractLang.secondary`. Never derive text from column position.

**PDF-only cosmetic**: `pdfSafeLangName()` in `contractPdfExport.js` substitutes Russian-script column headers for languages whose scripts PT Serif cannot render (Kazakh `Қ`, Tajik `ҷ/ӣ`, Georgian). Affects column headers only — not legal text.

---

## Page-Level Patterns

All pages follow the same conventions:
- Default export is a function component
- Top-level `<div className="fade-in" style={{ padding: '32px 36px' }}>` wrapper
- Section headers: `<div style={{ fontSize: 12, color: 'var(--text-2)', letterSpacing: 1 }}>UPPERCASE LABEL</div>` then `<h1>`
- Data displayed from imported `src/data/*.js` constants directly
- Action buttons that would submit/save in production show `alert('Демо версия')` or similar
- "Upload" document actions toggle a boolean in local state — no actual upload
