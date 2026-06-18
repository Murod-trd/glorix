# GLORIX — Database Schema

## There is currently no database

GLORIX has no SQL or NoSQL database, no ORM, and no persistence layer of any kind beyond a single browser `localStorage` key (`glorix_account_type`, one of `'buyer' | 'seller' | 'both'`) that survives only on one device in one browser. All "records" — tenders, products, suppliers, users, RFIs, messages — are hardcoded JavaScript arrays/objects in `src/data/*.js`, identical for every visitor, reset on every page reload except for that one localStorage preference.

This document records the *as-is shape* of that mock data as the de facto current schema, so that (a) any future real database design has an accurate, complete starting point rather than having to be reverse-engineered from the UI again, and (b) nobody mistakes the mock data's structure for a designed, normalized schema — it isn't one; it's whatever shape was convenient for each page component to consume directly.

## Entity shapes (as found in `src/data/*.js`)

### User (`mock.js` → `users.buyer|seller|both`, exposed as `currentUser`)
```
{ id, name, country, flag, role: 'buyer'|'seller'|'both', roleLabel,
  trustScore: number, totalDeals: number, successDeals: number,
  verified: boolean, joined: 'YYYY-MM-DD' }
```

### Tender (`mock.js` → `tenders[]`)
```
{ id, title, category, status: 'active'|'agreement'|'completed',
  deadline: 'YYYY-MM-DD',
  budget: { min, max, currency }, quantity: string,
  specs: [{ param, value }],
  incoterms, destination, offers: number,
  deadlines: { d1..d5: { label, date, done: boolean } },
  deposit: { rate, amount }, buyerCountry, createdAt,
  winner?: { country, flag, totalCost, deliveryCost } }
```

### AI offer comparison (`mock.js` → `aiAnalysis.offers[]`)
```
{ id, country, flag, productPrice, deliveryCost, totalCost,
  deliveryDays, trustScore, incoterms, aiNote, recommended: boolean }
```

### Product / marketplace listing (`marketplace.js` → `products[]`)
```
{ id, title, category,
  seller: { id, name, country, flag, city, trustScore, verified, totalDeals },
  price, currency, unit, minOrder, maxOrder, stock, stockAuto: boolean,
  photo, photos: [],
  specs: [{ group, items: [{ p, v }] }],
  certifications: [], deliveryDays: { min, max }, incoterms: [],
  sanctions: boolean, rating, reviews,
  reviewsList: [{ company, rating, text, date }],
  aiCheck: { sanctionsOk, specsVerified, qualityRisk: 'low'|'medium'|'high' },
  tags: [] }
```

### Supplier (`cips.js` → `suppliers[]`)
```
{ id, name, country, flag, city, verified, trustScore, since,
  totalDeals, successDeals, categories: [],
  cips10c: { competence, capacity, commitment, control, cash,
             consistency, cost, compatibility, compliance, culture },  // each 0–100
  esg: { environmental, social, governance, co2certified: boolean,
         laborCompliant: boolean, diversityScore },
  kpi: { onTimeDelivery, qualityScore, responseTime, disputeRate, avgLeadDays },
  antiFraud: { registryVerified, addressVerified, bankVerified, taxVerified,
               redFlags: [string], riskLevel: 'low'|'medium'|'high' },
  rfiResponses, activeContracts }
```

### RFI (`cips.js` → `rfiList[]`, `rfiAnswers{}`)
```
RFI:    { id, title, status: 'active'|'closed', createdAt, deadline,
          category, questions: [string], responses, buyers }
Answer: { id, anonymous, country, flag, answers: [string] (one per question),
          submittedAt, trustScore, verified, aiScore: number, aiNote }
```

### Account type (`accounts.js` → `accountTypes[]`)
```
{ id: 'buyer'|'seller'|'both', title, icon, color, desc,
  canBuy, canSell,
  requiredDocs: [{ id, label, auto: boolean, required: boolean }],
  categoryDocs?: [{ category, docs: [string] }],
  features: [], restrictions: [] }
```

### Legal source / contract-language rule (`legalSources.js` → `legalSources[]`)
```
{ country, flag, code,
  contractLanguage?: { verified: boolean, domesticLanguage, domesticRule,
                        foreignPartyRule, note },
  sites: [{ name, url, desc, official: boolean, type }] }
```

### Contract — structured bilingual model (`contractData.js` → return shape of `buildContractStructured`)
```
{ title: {ru, en}, num, city, date, year, seller, buyer,
  sellerCountryName, buyerCountryName,
  contractLang: { mode: 'bilingual'|'mono', primary, secondary, warning,
                  mandatory?, requiresCertifiedTranslation?, nationalOnly?,
                  unverifiedCaution? },
  appliedLaw, rate, maxP,
  sections: [{ heading: {ru, en}, clauses: [{ru, en}] }],   // 18 articles
  appendices: {ru, en}, disclaimer: {ru, en} }
```

## Why no schema migration plan is included here

A real schema (with proper normalization, foreign keys, indexes, and migration tooling) should be designed fresh against actual MVP requirements rather than mechanically translating the shapes above into tables — several of these mock shapes denormalize data in ways that only make sense for a single static demo page (e.g. embedding a full `seller` object inside every `product`, embedding full nested `cips10c`/`esg`/`kpi` objects inside every `supplier`) and would need real foreign-key relationships (`products.seller_id → companies.id`, etc.) in a production schema. This is intentionally left as an MVP-phase design task — see `Roadmap.jsx`'s stated MVP-phase commitment to a PostgreSQL backend — rather than prescribed here.
