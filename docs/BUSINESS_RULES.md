# GLORIX — Business Rules

This document is the canonical reference for every formula, threshold, and policy embedded in the platform. Where a rule is implemented in code, the exact file/function is named so the rule and the implementation can never silently drift apart.

## 1. Escrow deposit rate (tender deposits)

Implemented in `src/data/mock.js` → `calcDeposit(amount)`, also documented in-product on `/deposit` (`DepositCalculator`) and referenced in `Legal.jsx`'s oferta text and `Onboarding.jsx`.

Tiered, linearly-interpolated rate as a percentage of tender/deal value:

| Tender value | Rate |
|---|---|
| ≤ $10,000 | flat 15% |
| $10,000 – $50,000 | linear interpolation, 15% down to 10% |
| $50,000 – $1,000,000 | linear interpolation, 10% down to 5% |
| > $1,000,000 | continues interpolating down to a floor of 0.5%, fully reached at $10,000,000 |

Both buyer and seller deposit independently at this rate; the deposit is described as held on a GLORIX escrow account and returned within 24 hours of successful deal completion. Boundary values: $10,000 = 15%, $50,000 = 10%, $1,000,000 = 5%.

## 2. Marketplace transaction fee

Implemented in `src/data/marketplace.js` → `calcMarketplaceFee(amount)`. A separate, smaller tiered fee (not the same rate table as the tender deposit) charged to the buyer on direct marketplace purchases:

| Order value | Fee |
|---|---|
| ≤ $5,000 | flat 1.5% |
| $5,000 – $50,000 | linear interpolation, 1.5% down to 0.5% |
| ≥ $50,000 | flat 0.5% |

The Roadmap page states GLORIX's marketplace commission (0.5–1.5%) as a deliberate competitive differentiator against the stated 3–5% typically charged by competitors (go4WorldBusiness, Alibaba B2B, etc.).

## 3. Trust score

Formula (used identically across `mock.js`'s `currentUser`, `cips.js`'s `suppliers`, and the `/trust` page): **successful deals ÷ total deals × 100**.

Three zones with concrete consequences, defined in `DepositTrust.jsx` (`TrustRating`) and restated in `Legal.jsx` and `Support.jsx`:

| Zone | Range | Consequences |
|---|---|---|
| Green | ≥ 70% | Standard terms, no restrictions |
| Yellow | 30% – 69% | Deposit rate +5 percentage points; limit on number of concurrent tenders |
| Red | < 30% | Mandatory 100% prepayment; hard financial/account limits |

## 4. Mirror-penalty contract standard

This is GLORIX's stated core legal differentiator. Documented in `src/data/legalSources.js` → `mirrorPenalties`, and it has a real provenance: it was reverse-engineered from actual uploaded sample contracts ("ТФД") that the team found had asymmetric, buyer-favoring penalty clauses. Specific documented asymmetries found in those source contracts:

- Supplier late-delivery penalty 0.5%/day vs. buyer's 0.1%/day, capped at 5% — not mirrored.
- A 10% non-delivery penalty applied only to the supplier, with no equivalent buyer-side penalty.
- The buyer could suspend the contract without penalty; the supplier could not.

GLORIX's platform standard, applied uniformly to both parties in every generated contract:

- **Delivery delay**: 0.1% per day, capped at 10% total, applies to both sides identically.
- **Non-delivery / non-acceptance**: 10% penalty, with prepayment returned; explicitly symmetric — described as "10% за отказ от тендера обеих сторон" (10% for withdrawal from the tender, for both sides).
- **Payment delay**: 0.1% per day, capped at 10%, both sides.
- **Suspension**: either party may suspend with 5 business days' notice and is entitled to documented, substantiated compensation for costs incurred.

This standard is what `buildContract`/`buildContractStructured` actually generate into the penalty articles of every contract document, and it is the rule a future contract-editing feature must preserve if anyone is tempted to make penalty terms asymmetric again.

## 5. Bilingual contract language rule

Full detail and rationale: `DECISIONS.md`. Summary of the rule itself, implemented in `resolveContractLanguage()` in `src/data/contractData.js`:

- **Seller and buyer in different countries** → cross-border deal, not governed by either party's domestic language law → always render bilingual Russian/English.
- **Seller and buyer in the same country** → that country's actual domestic language law governs:
  - If the law permits Russian for B2B contracts between residents → single-language Russian (`mode: 'mono'`).
  - If the law requires the national language → single-language in that national language (`mode: 'mono', nationalOnly: true`), *unless* GLORIX does not have a verified legal translation for that language, in which case the rendered document shows an explicit certified-translation-required placeholder rather than fabricated text (see rule 6 below and `DECISIONS.md`).
  - **Kazakhstan is the sole exception**: its law mandates both Kazakh and Russian even for fully domestic deals (`domesticRule: 'bilingual_mandatory'`, `mode: 'bilingual', primary: 'kk', secondary: 'ru'`).
  - Azerbaijan, Kyrgyzstan, and Turkmenistan are flagged `domesticRule: 'caution'` — render mono in the national language but carry an explicit warning string, since the underlying legal-source verification for these is weaker than for the other countries.

## 6. Certified-translation safety mechanism

GLORIX has no verified professional legal translator for Kazakh, Tajik, Georgian, Azerbaijani, Kyrgyz, or Turkmen. Per explicit founder instruction, a single incorrect comma in a contract can change its legal meaning, so the platform must never invent or substitute legal text in a language it cannot verify.

Rule, implemented identically (via a `resolveColumnText`/`resolveColumnText`-equivalent helper) in all three contract renderers (screen, PDF, Word): for any contract column whose resolved language is **not** `ru` or `en`, every clause in that column renders as `[<LanguageName>: текст требует профессионального юридического перевода]` ("text requires professional legal translation") instead of any generated prose. This applies per-column, independent of which physical position (left/right) that language occupies — see `SYSTEM_DESIGN.md` for the historical bug this guards against.

**Known consequence, accepted as-is for now**: for the mono-mode countries whose national language has no verified translation (Tajikistan, Georgia, Azerbaijan, Kyrgyzstan, Turkmenistan in `caution` mode), the *entire* generated contract is currently just a sequence of placeholders with no usable legal text — safe, but non-functional for actually transacting in those single-language jurisdictions until real professional translations are obtained. The founder has explicitly accepted this gap as correct for the current demo stage (see `DECISIONS.md`).

## 7. CIPS 10C supplier evaluation, ESG, KPI, and Anti-Fraud scoring

Data model: `src/data/cips.js`; rendered on `/suppliers` (`SupplierScorecard.jsx`).

- **CIPS 10C**: ten 0–100 scores per supplier — competence, capacity, commitment, control, cash, consistency, cost, compatibility, compliance, culture — averaged for a headline score. Modeled on the Chartered Institute of Procurement & Supply's "10C" supplier-evaluation framework.
- **ESG**: environmental / social / governance scores (0–100 each) plus booleans for CO₂ certification and labor-law compliance, and a diversity index.
- **KPI**: on-time-delivery %, quality score %, average response time (hours), dispute rate %, average lead time (days) — explicitly framed as metrics that, per CIPS practice, should be agreed before contract signature.
- **Anti-Fraud**: ten checks (`antiFraudChecks` in `cips.js`), six automatic (registry verification, address verification, bank verification, tax status, sanctions-list absence, litigation history) and four manual (beneficial-owner check, ESG declaration signed, anti-bribery policy accepted, production audit). A supplier's `riskLevel` (`low`/`medium`/`high`) and any `redFlags` array drive the risk badge shown in the UI.

## 8. CIPS 13-stage procurement cycle

Referenced explicitly in `RFIModule.jsx` as the platform's conceptual backbone: 1. Identify need → 2. Market analysis → 3. RFI → 4. Pre-qualification → 5. Tender → 6. Evaluation → 7. Negotiation → 8. Contract → 9. Delivery → 10. KPI → 11. SRM (supplier relationship management) → 12. Closure → 13. Asset management. The RFI module explicitly maps itself to stages 2–4; the AI-Bots "RFI → Tender" scenario walks through the entire cycle end to end as a sales/demo narrative.

## 9. Tender lifecycle

Every tender has five fixed deadline stages (`deadlines: {d1..d5}` in `mock.js`): D1 buyer's technical requirements, D2 seller offers, D3 specification agreement, D4 final price/delivery terms, D5 tender result. **All sellers remain anonymous to the buyer (and vice versa) until the tender closes** — stated explicitly in `TenderDetail`, `Support.jsx` FAQ, and the platform Oferta (`Legal.jsx`) as a deliberate anti-corruption/anti-collusion design choice, and described as a "grave violation of the Oferta" if the platform itself were to break that anonymity early.

## 10. Account types and KYC document requirements

Defined in `src/data/accounts.js` (`accountTypes`). Three account types: **Buyer** (`canBuy: true, canSell: false`), **Seller** (`canBuy: false, canSell: true`), **Both**. Buyer-only KYC: registration certificate + tax certificate (both auto-verified). Seller (and Both) additionally require: trade license, a country/trade-bloc-appropriate certificate of origin (CT‑1 for CIS, Form A/GSP, EUR.1 for the EU, CT‑EZ for the EAEU), and an optional export license. Category-specific additional documents apply on top of the base seller requirements: agro/food needs phytosanitary and veterinary certificates and a GOST grain-quality certificate; electronics/IT needs EAC conformity, CE marking, and a Technical Regulation declaration; chemicals needs a chemical-handling permit, an MSDS, and a Ministry of Industry license; medical devices needs Ministry of Health registration, ISO 13485, and CE marking (class IIa+); construction materials needs GOST conformity and, where applicable, a fire-safety certificate.

`AccountVerification.jsx` computes a verification level (`none`/`basic`/`full`) from which required documents have been "uploaded" (a local boolean toggle, not a real upload) and explicitly states, in its own copy, that selling without a valid trade license is an administrative or criminal offense in most CIS countries and that GLORIX is responsible for verifying sellers before allowing them to trade.

## 11. Platform Terms of Service / Oferta (current draft text)

The full current draft lives in `Legal.jsx` and is explicitly self-labeled in the UI as "⚠ Демо-версия — не юридически обязывающий документ" (demo version, not a legally binding document). Key substantive points beyond what's covered above: the platform restricts use to verified legal entities only (no individuals, no unincorporated sole proprietors); the platform explicitly disclaims responsibility for goods quality, specification accuracy, or contract performance, describing itself as a technological intermediary only; sanctions compliance is asserted against OFAC, the EU Consolidated List, the UN Sanctions List, and relevant national lists, with automatic checking claimed (see `AI_AGENTS.md` for the reality of that "automatic checking"); the jurisdiction table lists registry/law/currency/dispute notes for Uzbekistan, Kazakhstan, Russia, Azerbaijan, and Georgia; the GLORIX-template contract is described as applying automatically when both parties opt into it, when there's a contract conflict both sides agree to resolve via the template, or when a party expresses no preference; data-privacy commitments cite Uzbekistan's personal data law, Russia's Federal Law No. 152-FZ, Kazakhstan's personal data law, and GDPR for EU participants.

## 12. Document templates catalog

`src/data/accounts.js` → `docTemplates`: seven document types (commercial offer, invoice, packing list, technical specification, sale contract, certificate of origin, quality certificate), each flagged for whether AI drafting is enabled, whether GLORIX has internally verified the template's legal soundness (`glorixVerified`), and whether it's a "popular" template. Quality certificates and certificates of origin are explicitly noted as ultimately issued by an accredited lab / chamber of commerce or customs authority respectively — GLORIX only helps prepare the supporting data, not issue the certificate itself.
