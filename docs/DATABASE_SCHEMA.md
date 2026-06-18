# GLORIX — Database Schema

## ❌ No Database Exists

There is no SQL or NoSQL database, no ORM, no persistence layer beyond one browser `localStorage` key (`glorix_account_type`: `'buyer' | 'seller' | 'both'`). All "records" are hardcoded arrays/objects in `src/data/*.js`, identical for every visitor.

This document records the **as-is mock data shape** as the de facto schema, so that future backend design has an accurate starting point. These shapes are NOT normalized — they denormalize for convenience of direct component consumption (e.g. full `seller` object embedded inside every `product`). A real schema would use foreign keys.

---

## Entity: User

**Source**: `src/data/mock.js` → `users.buyer | users.seller | users.both`

```js
{
  id: string,              // 'u1' | 'u2' | 'u3'
  name: string,            // Company name
  country: string,         // ISO 2-letter code 'UZ' | 'KZ' | 'RU' ...
  flag: string,            // Emoji flag
  role: 'buyer' | 'seller' | 'both',
  roleLabel: string,
  trustScore: number,      // 0–100, = successDeals/totalDeals*100
  totalDeals: number,
  successDeals: number,
  verified: boolean,
  joined: string,          // 'YYYY-MM-DD'
}
```

**Note**: `currentUser` exported from `mock.js` resolves from `localStorage.getItem('glorix_account_type')` at module load. This is the only runtime-variable piece of the mock data.

---

## Entity: Tender

**Source**: `src/data/mock.js` → `tenders[]` (3 entries)

```js
{
  id: string,
  title: string,
  category: string,
  status: 'active' | 'agreement' | 'completed',
  deadline: string,          // 'YYYY-MM-DD' — final deadline (D5)
  budget: { min: number, max: number, currency: string },
  quantity: string,          // e.g. '500 тонн'
  specs: [{ param: string, value: string }],
  incoterms: string,         // e.g. 'CIF', 'DAP', 'DDP'
  destination: string,
  offers: number,            // count of offers received
  deadlines: {
    d1: { label: string, date: string, done: boolean },
    d2: { label: string, date: string, done: boolean },
    d3: { label: string, date: string, done: boolean },
    d4: { label: string, date: string, done: boolean },
    d5: { label: string, date: string, done: boolean },
  },
  deposit: { rate: number, amount: number },
  buyerCountry: string,
  createdAt: string,
  winner?: {                 // only on completed tenders
    country: string, flag: string,
    totalCost: number, deliveryCost: number
  }
}
```

---

## Entity: AI Offer Comparison

**Source**: `src/data/mock.js` → `aiAnalysis.offers[]`

```js
{
  id: string,
  country: string, flag: string,
  productPrice: number, deliveryCost: number, totalCost: number,
  deliveryDays: number,
  trustScore: number,
  incoterms: string,
  aiNote: string,            // Hardcoded "AI" commentary
  recommended: boolean,      // Hardcoded — not computed at runtime
}
```

---

## Entity: Product / Marketplace Listing

**Source**: `src/data/marketplace.js` → `products[]` (6 entries)

```js
{
  id: string,
  title: string,
  category: string,
  seller: {                  // Denormalized — would be FK in real schema
    id: string, name: string, country: string, flag: string, city: string,
    trustScore: number, verified: boolean, totalDeals: number,
  },
  price: number, currency: string, unit: string,
  minOrder: number, maxOrder: number,
  stock: number, stockAuto: boolean,
  photo: string,             // URL
  photos: string[],
  specs: [{ group: string, items: [{ p: string, v: string }] }],
  certifications: string[],
  deliveryDays: { min: number, max: number },
  incoterms: string[],
  sanctions: boolean,
  rating: number, reviews: number,
  reviewsList: [{ company: string, rating: number, text: string, date: string }],
  aiCheck: {
    sanctionsOk: boolean,    // Static — not actually checked
    specsVerified: boolean,  // Static
    qualityRisk: 'low' | 'medium' | 'high',
  },
  tags: string[],
}
```

---

## Entity: Supplier

**Source**: `src/data/cips.js` → `suppliers[]` (3 entries)

```js
{
  id: string,
  name: string, country: string, flag: string, city: string,
  verified: boolean, trustScore: number, since: string,
  totalDeals: number, successDeals: number,
  categories: string[],
  cips10c: {
    competence: number, capacity: number, commitment: number,
    control: number, cash: number, consistency: number,
    cost: number, compatibility: number, compliance: number, culture: number,
  },          // All 0–100
  esg: {
    environmental: number, social: number, governance: number,
    co2certified: boolean, laborCompliant: boolean, diversityScore: number,
  },
  kpi: {
    onTimeDelivery: number,   // %
    qualityScore: number,     // %
    responseTime: number,     // hours
    disputeRate: number,      // %
    avgLeadDays: number,
  },
  antiFraud: {
    registryVerified: boolean, addressVerified: boolean,
    bankVerified: boolean, taxVerified: boolean,
    redFlags: string[],
    riskLevel: 'low' | 'medium' | 'high',
  },
  rfiResponses: number,
  activeContracts: number,
}
```

---

## Entity: RFI

**Source**: `src/data/cips.js` → `rfiList[]`, `rfiAnswers` (keyed by RFI id)

```js
// RFI
{
  id: string,
  title: string,
  status: 'active' | 'closed',
  createdAt: string, deadline: string,
  category: string,
  questions: string[],
  responses: number,
  buyers: number,
}

// RFI Answer
{
  id: string,
  anonymous: boolean,
  country: string, flag: string,
  answers: string[],          // One answer per question
  submittedAt: string,
  trustScore: number, verified: boolean,
  aiScore: number,            // 0–100, hardcoded
  aiNote: string,             // Hardcoded commentary
}
```

---

## Entity: Account Type

**Source**: `src/data/accounts.js` → `accountTypes[]`

```js
{
  id: 'buyer' | 'seller' | 'both',
  title: string, icon: string, color: string, desc: string,
  canBuy: boolean, canSell: boolean,
  requiredDocs: [{ id: string, label: string, auto: boolean, required: boolean }],
  categoryDocs?: [{ category: string, docs: string[] }],
  features: string[],
  restrictions: string[],
}
```

---

## Entity: Legal Source / Contract Language Rule

**Source**: `src/data/legalSources.js` → `legalSources[]` (11 entries, one per CIS country)

```js
{
  country: string,             // Display name e.g. 'Узбекистан'
  flag: string, code: string,  // ISO 2-letter
  contractLanguage?: {
    verified: boolean,
    domesticLanguage: string,  // e.g. 'ru', 'kk+ru', 'tg'
    domesticRule: 'mono' | 'bilingual_mandatory' | 'national_required' | 'national_must_prevail' | 'caution',
    foreignPartyRule: string,
    note: string,
  },
  sites: [{ name: string, url: string, desc: string, official: boolean, type: string }],
  mainCode?: string,           // Civil code citation
  nationalArbitration?: string, // Named arbitration institution
}
```

---

## Entity: Mirror Penalty Standard

**Source**: `src/data/legalSources.js` → `mirrorPenalties`

```js
{
  source: string,              // Description of source contracts analyzed
  asymmetriesFound: [{ issue: string, supplierTerm: string, buyerTerm: string }],
  glorixStandard: [{ event: string, rate: string, cap: string, symmetric: boolean }],
}
```

---

## Entity: Contract (Structured Bilingual)

**Source**: Return shape of `buildContractStructured(f)` in `src/data/contractData.js`

```js
{
  title: { ru: string, en: string },
  num: string, city: string, date: string, year: number,
  seller: string, buyer: string,
  sellerCountryName: string, buyerCountryName: string,
  contractLang: {
    mode: 'bilingual' | 'mono',
    primary: string,           // language code
    secondary: string | null,
    warning: string | null,
    mandatory?: boolean,
    requiresCertifiedTranslation?: boolean,
    nationalOnly?: boolean,
    unverifiedCaution?: boolean,
  },
  appliedLaw: string,         // Resolved law citation
  rate: string, maxP: string, // Penalty rate + cap
  sections: [{
    heading: { ru: string, en: string },
    clauses: [{ ru: string, en: string }],
  }],   // 18 articles
  appendices: { ru: string, en: string },
  disclaimer: { ru: string, en: string },
}
```

---

## 🚧 Planned Backend Schema (MVP Phase)

A real PostgreSQL schema will be designed fresh from actual MVP requirements. Key normalizations over the mock shapes above:
- `companies` table (currently denormalized inside users, suppliers, sellers)
- `products.seller_id → companies.id` (currently embedded)
- `trust_score` server-computed from real `deals` table (currently static in mock)
- `audit_log` table for all compliance actions
- `documents` table for generated contract metadata
- `sessions` / `auth` tables for real JWT auth

This is a MVP-phase design task, not prescribed here. See `ROADMAP.md`.
