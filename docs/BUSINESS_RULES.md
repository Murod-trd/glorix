# GLORIX — Business Rules

All rules below are ✅ implemented in client-side code unless marked otherwise. File/function references given so rules and implementation cannot silently drift.

---

## Rule 1: Escrow Deposit Rate

**File**: `src/data/mock.js` → `calcDeposit(amount)`
**Also referenced in**: `/deposit` page (`DepositCalculator`), `Legal.jsx` oferta §5, `Onboarding.jsx` step 4

Tiered rate applied to the **tender/deal value**. Both buyer and seller deposit independently at this rate. Deposit is described as held on GLORIX escrow and returned within 24h of successful deal completion.

| Tender Value | Rate | Notes |
|---|---|---|
| ≤ $10,000 | 15% (flat) | |
| $10,000 – $50,000 | 15% → 10% (linear interpolation) | |
| $50,000 – $1,000,000 | 10% → 5% (linear interpolation) | |
| > $1,000,000 | Continues down to 0.5% floor at $10,000,000 | `Math.max(0.5, ...)` |

**Exact algorithm** (must not be changed without updating this doc and the Deposit page UI):
```js
if (amount <= 10000) return { rate: 15, deposit: amount * 0.15 };
if (amount <= 50000) {
  const rate = 15 - (15 - 10) * ((amount - 10000) / (50000 - 10000));
  return { rate: +rate.toFixed(2), deposit: +(amount * rate / 100).toFixed(0) };
}
if (amount <= 1000000) {
  const rate = 10 - (10 - 5) * ((amount - 50000) / (1000000 - 50000));
  return { rate: +rate.toFixed(2), deposit: +(amount * rate / 100).toFixed(0) };
}
const rate = Math.max(0.5, 5 - (5 - 0.5) * Math.min(1, (amount - 1000000) / 9000000));
return { rate: +rate.toFixed(2), deposit: +(amount * rate / 100).toFixed(0) };
```

---

## Rule 2: Marketplace Transaction Fee

**File**: `src/data/marketplace.js` → `calcMarketplaceFee(amount)`
**Also referenced in**: Roadmap metrics (0.5–1.5% vs. competitors' 3–5%)

Separate, lower fee on **direct marketplace purchases** (not tender deals). Charged to buyer.

| Order Value | Fee Rate |
|---|---|
| ≤ $5,000 | 1.5% (flat) |
| $5,000 – $50,000 | 1.5% → 0.5% (linear interpolation) |
| ≥ $50,000 | 0.5% (flat) |

This fee is GLORIX's primary stated monetization mechanism for the marketplace vertical. The escrow deposit (Rule 1) is a trust/fraud mechanism, not revenue — it is returned.

---

## Rule 3: Trust Score

**Formula**: `successDeals / totalDeals × 100` (percentage)

**Applied identically in**: `mock.js` (`currentUser`), `cips.js` (each `supplier`), `DepositTrust.jsx` (`TrustRating`)

Three zones with hard consequences:

| Zone | Threshold | Consequences |
|---|---|---|
| 🟢 Green | ≥ 70% | Standard terms, no restrictions |
| 🟡 Yellow | 30% – 69% | Deposit rate +5 percentage points; limit on concurrent tenders |
| 🔴 Red | < 30% | Mandatory 100% prepayment; hard financial/account limits |

The consequences are described in `Legal.jsx`, `DepositTrust.jsx`, and `Support.jsx` FAQ. They are ❌ not yet enforced in code (no backend to enforce them) but are part of the platform contract with users.

---

## Rule 4: Mirror-Penalty Contract Standard

**File**: `src/data/legalSources.js` → `mirrorPenalties`
**Applied in**: `buildContractStructured()` in `contractData.js`, `buildContract()` in `LegalAI.jsx`

**Origin**: Reverse-engineered from real uploaded supplier contracts ("ТФД contracts") that were found to have asymmetric, buyer-favoring penalty clauses. GLORIX's stated differentiator is symmetric, mirror-image penalties for both parties.

**Asymmetries found in source contracts** (that GLORIX fixes):
- Supplier late-delivery penalty: 0.5%/day, capped at 5% → Buyer equivalent: 0.1%/day (not mirrored)
- Non-delivery penalty: 10% applied only to supplier, no equivalent for buyer non-acceptance
- Suspension: buyer could suspend without penalty; supplier could not

**GLORIX platform standard** (symmetric, applied identically to both parties):

| Event | Rate | Cap | Both Parties |
|---|---|---|---|
| Delivery / acceptance delay | 0.1% per day | 10% of contract value | ✅ Yes |
| Non-delivery / non-acceptance | 10% of contract value + prepayment return | — | ✅ Yes |
| Payment delay | 0.1% per day | 10% of contract value | ✅ Yes |
| Suspension | Either party, 5 business days' notice | Substantiated compensation only | ✅ Yes |

**This standard is non-negotiable** — any future contract-editing feature must not silently re-introduce asymmetric terms. If a counterparty wants different terms, that deviation must be explicit, named, and surfaced in the UI.

---

## Rule 5: Bilingual Contract Language Rule

**File**: `src/data/contractData.js` → `resolveContractLanguage(sellerCountry, buyerCountry)`
**Also in**: `src/pages/LegalAI.jsx` (legacy copy with identical logic)

Per-country language-law data: `src/data/legalSources.js` → `legalSources[].contractLanguage`

**Decision tree**:

1. **Different countries (cross-border)** → Always `mode: 'bilingual', primary: 'ru', secondary: 'en'`, regardless of either party's domestic language law.
2. **Same country** → Look up `legalSources` for that country's `domesticRule`:
   - `'mono'` → `mode: 'mono', primary: 'ru'` (Russian permitted domestically — UZ, RU, TJ in practice)
   - `'bilingual_mandatory'` → `mode: 'bilingual'` with both languages from `domesticLanguage` field. **Kazakhstan only**: `primary: 'kk', secondary: 'ru'`
   - `'national_required'` or `'national_must_prevail'` → `mode: 'mono', primary: <national language>`
   - `'caution'` → `mode: 'mono', primary: <national language>` with warning string; legal source not fully verified
   - No data found → Default `mode: 'mono', primary: 'ru'`

**Per-country rules** (as of June 2026, verified from legal sources):

| Country | Code | Domestic Rule | Contract Language |
|---|---|---|---|
| Uzbekistan | UZ | mono | Russian permitted for B2B |
| Kazakhstan | KZ | bilingual_mandatory | **KK + RU both required** |
| Russia | RU | mono | Russian |
| Azerbaijan | AZ | caution | Azerbaijani (verification weak) |
| Georgia | GE | national_required | Georgian |
| Tajikistan | TJ | mono | Russian permitted |
| Kyrgyzstan | KG | caution | Kyrgyz (verification weak) |
| Turkmenistan | TM | caution | Turkmen (verification weak) |

---

## Rule 6: Certified-Translation Safety Mechanism

**Applied in all three contract renderers** (screen: `ContractTableView` in `LegalAI.jsx`; PDF: `contractPdfExport.js`; Word: `contractDocxExport.js`)

**Rule**: For any contract column whose resolved language is **not** `'ru'` or `'en'`, every clause in that column renders as:
```
[<LanguageName>: текст требует профессионального юридического перевода]
```

This mechanism exists because GLORIX has no verified professional legal translator for Kazakh, Tajik, Georgian, Azerbaijani, Kyrgyz, or Turkmen. A wrong comma in a legal contract can change its meaning.

**Implementation pattern** (identical helper in all three renderers — must stay consistent):
```js
function resolveColumnText(ruText, enText, lang) {
  if (lang === 'ru') return ruText;
  if (lang === 'en') return enText;
  return `[${LANG_NAMES[lang] || lang}: текст требует профессионального юридического перевода]`;
}
```

Applied **independently per column** based on each column's actual resolved language — **never** assumed from column position (left=RU, right=other). The Kazakh bug (see `DECISIONS.md`) was caused by exactly this assumption.

**Known consequence**: TJ, GE, AZ, KG, TM domestic-mono contracts render entirely as placeholders — no usable legal text. Accepted as-is for Demo stage. Real fix = obtain professional verified translations, then add to `contractData.js`.

**PDF-only cosmetic**: `contractPdfExport.js` has a `pdfSafeLangName()` map that substitutes Russian-script column headers (e.g. "Казахский" not "Қазақша") because the embedded PT Serif font lacks Kazakh/Tajik extended Cyrillic/Georgian glyphs. This affects column headers only — not legal text content.

---

## Rule 7: CIPS 10C Supplier Evaluation

**File**: `src/data/cips.js` → `suppliers[].cips10c`
**Rendered at**: `/suppliers` (`SupplierScorecard.jsx`)

Ten scores (0–100 each), averaged for a headline score. Based on CIPS (Chartered Institute of Procurement & Supply) "10C" methodology:

| # | Dimension | What it measures |
|---|---|---|
| 1 | Competence | Technical capability and expertise |
| 2 | Capacity | Ability to fulfil order volumes |
| 3 | Commitment | Willingness to partner and meet obligations |
| 4 | Control | Internal management and governance quality |
| 5 | Cash | Financial stability and creditworthiness |
| 6 | Consistency | Track record of meeting agreed standards |
| 7 | Cost | Price competitiveness vs. market |
| 8 | Compatibility | Cultural and operational fit |
| 9 | Compliance | Regulatory, legal, and ethical adherence |
| 10 | Culture | Values alignment and ESG commitment |

---

## Rule 8: ESG Scoring

**File**: `src/data/cips.js` → `suppliers[].esg`

| Metric | Type | Notes |
|---|---|---|
| Environmental | Score 0–100 | |
| Social | Score 0–100 | |
| Governance | Score 0–100 | |
| CO₂ Certified | Boolean | |
| Labor Compliant | Boolean | |
| Diversity Index | Score | |

---

## Rule 9: KPI Metrics

**File**: `src/data/cips.js` → `suppliers[].kpi`

Per CIPS practice, these are to be agreed before contract signature:

| KPI | Unit |
|---|---|
| On-time delivery | % |
| Quality score | % |
| Average response time | Hours |
| Dispute rate | % |
| Average lead time | Days |

---

## Rule 10: Anti-Fraud Checks (10-point)

**File**: `src/data/cips.js` → `suppliers[].antiFraud`, `antiFraudChecks`

6 automatic + 4 manual checks. A supplier's `riskLevel` (`low`/`medium`/`high`) and any `redFlags` array drive the risk badge.

| Check | Type | Notes |
|---|---|---|
| Registry verification | Automatic | ❌ Simulated (static boolean) |
| Address verification | Automatic | ❌ Simulated |
| Bank account verification | Automatic | ❌ Simulated |
| Tax status check | Automatic | ❌ Simulated |
| Sanctions list absence | Automatic | ❌ Simulated — static `aiCheck.sanctionsOk: true` |
| Litigation history | Automatic | ❌ Simulated |
| Beneficial owner check | Manual | Demo only |
| ESG declaration signed | Manual | Demo only |
| Anti-bribery policy accepted | Manual | Demo only |
| Production audit completed | Manual | Demo only |

---

## Rule 11: CIPS 13-Stage Procurement Cycle

Referenced explicitly in `RFIModule.jsx` as the platform's conceptual backbone:

1. Identify need → 2. Market analysis → 3. **RFI** (→ GLORIX RFI module) → 4. Pre-qualification → 5. **Tender** (→ GLORIX tenders) → 6. Evaluation (→ GLORIX AI Analysis) → 7. Negotiation → 8. **Contract** (→ GLORIX Legal AI) → 9. Delivery → 10. **KPI** (→ GLORIX Supplier Scorecard) → 11. SRM (→ GLORIX Relationship Manager) → 12. Closure → 13. Asset management

---

## Rule 12: Tender Lifecycle

5 fixed deadline stages per tender (D1–D5):

| Stage | Label | Who acts |
|---|---|---|
| D1 | Buyer's technical requirements | Buyer |
| D2 | Seller offers | Sellers (anonymous) |
| D3 | Specification agreement | Both |
| D4 | Final price + delivery terms | Both |
| D5 | Tender result | Platform |

**Critical anonymity rule**: All sellers remain anonymous to the buyer (and vice versa) until D5. Stated explicitly in `TenderDetail`, `Support.jsx` FAQ, and `Legal.jsx` oferta as a deliberate anti-corruption/anti-collusion design choice. Breaking anonymity early is described as a "grave violation of the Oferta."

---

## Rule 13: Account Types and KYC Documents

**File**: `src/data/accounts.js` → `accountTypes`

| Type | canBuy | canSell | KYC Required |
|---|---|---|---|
| Buyer | ✅ | ❌ | Registration cert + tax cert (auto-verified) |
| Seller | ❌ | ✅ | Above + trade license + certificate of origin + (optional) export license |
| Both | ✅ | ✅ | All seller docs |

**Category-specific additional documents for sellers**:
- Agro/Food: phytosanitary cert, veterinary cert, GOST grain-quality cert
- Electronics/IT: EAC conformity, CE marking, Technical Regulation declaration
- Chemicals: chemical-handling permit, MSDS, Ministry of Industry license
- Medical devices: Ministry of Health registration, ISO 13485, CE marking (class IIa+)
- Construction materials: GOST conformity cert, (if applicable) fire-safety cert

**Certificate of origin types** (`accounts.js` → `originCertTypes`):
CT-1 (CIS), Form A/GSP (developing countries to EU/US), EUR.1 (EU trade agreements), CT-EZ (EAEU), General commercial certificate of origin

---

## Rule 14: Tender Anonymity

All sellers remain anonymous to the buyer (and vice versa) until the tender closes (D5 deadline reached). This is a deliberate anti-corruption/anti-collusion design choice. Stated in:
- `TenderDetail.jsx` UI ("все продавцы анонимны до завершения тендера")
- `Support.jsx` FAQ
- `Legal.jsx` oferta text (described as a grave violation if broken by the platform)

---

## Rule 15: Platform ToS / Oferta Status

**File**: `src/pages/Legal.jsx`

Self-labeled in the UI as "⚠ Демо-версия — не юридически обязывающий документ." Key substantive points:
- Platform only for verified legal entities (no individuals or unincorporated sole traders)
- Platform is a technological intermediary only — not liable for goods quality, spec accuracy, or contract performance
- Sanctions compliance claimed against OFAC, EU Consolidated List, UN Sanctions List (❌ simulated — static flags)
- Jurisdiction table: UZ, KZ, RU, AZ, GE (registry, law, currency, dispute notes)
- Privacy: UZ personal data law, Russia Federal Law 152-FZ, KZ personal data law, GDPR for EU participants
