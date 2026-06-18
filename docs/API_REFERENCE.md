# GLORIX — API Reference

## ❌ No Backend API Exists

GLORIX has no server, no REST/GraphQL endpoint, no webhook receiver, and makes zero `fetch`/`axios` calls to any first-party backend. Every "interaction" is a client-side function call against in-memory JavaScript data, often wrapped in artificial `setTimeout(..., 1500–2000)` to simulate network latency.

This document covers: (1) every real client-side function signature the code depends on today, and (2) the implied future backend API shape derived from current data flows.

---

## Part 1 — Client-Side Function Signatures (✅ Real, Implemented Today)

### `src/data/mock.js`

```ts
calcDeposit(amount: number): { rate: number, deposit: number }
```
Tiered escrow deposit calculation. See `BUSINESS_RULES.md` §Rule 1 for full algorithm.

**Exports**: `currentUser`, `tenders`, `stats`, `aiAnalysis`, `depositRates`, `calcDeposit`

---

### `src/data/marketplace.js`

```ts
calcMarketplaceFee(amount: number): number  // returns rate as decimal, e.g. 1.5
```
Marketplace transaction fee rate. See `BUSINESS_RULES.md` §Rule 2.

**Exports**: `products`, `categories`, `calcMarketplaceFee`

---

### `src/data/contractData.js`

```ts
resolveContractLanguage(
  sellerCountry: string,   // ISO 2-letter e.g. 'UZ', 'KZ'
  buyerCountry: string
): {
  mode: 'bilingual' | 'mono',
  primary: string,         // language code: 'ru' | 'en' | 'kk' | 'tg' | 'ka' | 'az' | 'ky' | 'tk'
  secondary: string | null,
  warning: string | null,
  mandatory?: boolean,
  requiresCertifiedTranslation?: boolean,
  nationalOnly?: boolean,
  unverifiedCaution?: boolean,
}
```
Language-resolution rule. See `BUSINESS_RULES.md` §Rule 5.

```ts
buildContractStructured(formData: {
  seller: string, buyer: string,
  sellerCountry: string, buyerCountry: string,
  goods: string, amount: string, currency: string,
  incoterms: string, deliveryDays: string, payTerms: string,
  penaltyRate: string, maxPenalty: string,
  scope: 'international' | 'cis' | string,
  intLaw: string,          // ID from internationalLaw array
  contractNum: string, city: string, date: string,
}): ContractStructured    // See DATABASE_SCHEMA.md for full shape
```

**Exports**: `LANG_NAMES`, `resolveContractLanguage`, `buildContractStructured`

---

### `src/pages/LegalAI.jsx` (internal functions, not exported)

```ts
buildContract(formData: object): string        // Legacy plain-text builder (mostly superseded)
buildOffer(formData: object): string
buildSpecification(formData: object): string
buildClaim(formData: object): string
buildAcceptance(formData: object): string
```
Pipeline A plain-text document builders. Return template-literal strings with form data substituted.

---

### `src/utils/pdfExport.js`

```ts
downloadTextAsPdf(text: string, filename: string): void
```
Renders a plain-text string into a branded PDF (GLORIX letterhead, PT Serif font, page numbers) and triggers browser download.

---

### `src/utils/docxExport.js`

```ts
downloadTextAsDocx(text: string, filename: string): Promise<void>
```
Renders a plain-text string into a branded Word `.docx` file and triggers browser download.

---

### `src/utils/contractPdfExport.js`

```ts
downloadContractAsPdf(data: ContractStructured, filename: string): void
```
Renders the structured bilingual contract object as a two-column PDF table (jsPDF hand-drawn, with row-height-aware pagination) and triggers browser download.

---

### `src/utils/contractDocxExport.js`

```ts
downloadContractAsDocx(data: ContractStructured, filename: string): Promise<void>
```
Renders the structured bilingual contract object as a real Word `.docx` table (`docx` library `Table`/`TableRow`/`TableCell`) and triggers browser download.

---

### `src/data/accounts.js`

**Exports**: `accountTypes`, `originCertTypes`, `docTemplates`
No functions — pure data constants.

---

### `src/data/cips.js`

**Exports**: `suppliers`, `rfiList`, `rfiAnswers`, `kpiHistory`, `antiFraudChecks`, `communityMessages`
No functions — pure data constants.

---

### `src/data/legalSources.js`

**Exports**: `legalSources`, `internationalSources`, `docTypes`, `internationalLaw`, `mirrorPenalties`
No functions — pure data constants.

---

## Part 2 — 🚧 Implied Future Backend API (MVP Phase Planning Reference)

Not committed. Derived from current UI flows and mock data shapes. Validate against real MVP requirements before implementing.

### Authentication

| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ companyName, taxId, country, email, password }` | `{ userId, token }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | — | `{ user }` |
| POST | `/api/auth/logout` | — | `{ ok }` |

### Company / KYC

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/companies/verify` | Registry lookup by country + taxId |
| GET | `/api/companies/:id` | |
| POST | `/api/companies/:id/documents` | Upload KYC docs |
| GET | `/api/companies/:id/trust-score` | Server-computed, not client-trusted |

### Tenders

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/tenders` | With filters: status, category, country |
| POST | `/api/tenders` | Requires auth + deposit |
| GET | `/api/tenders/:id` | |
| POST | `/api/tenders/:id/offers` | Seller submits offer (anonymous until close) |
| POST | `/api/tenders/:id/close` | D5 trigger: reveal identities, select winner |

### Marketplace

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/products` | With filters |
| POST | `/api/products` | Seller creates listing |
| POST | `/api/orders` | Buyer purchases (triggers escrow flow) |

### Escrow / Deposits

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/deposits` | Create escrow hold |
| POST | `/api/deposits/:id/release` | Release to seller after delivery confirmed |
| GET | `/api/deposits/:id/status` | |

### Documents

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/documents/generate` | `{ type, formData }` → file URL or base64 |
| GET | `/api/documents/:id` | Retrieve generated document |

### Compliance

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/compliance/screen` | Sanctions screening against real OFAC/EU/UN lists |
| GET | `/api/compliance/status/:companyId` | Current compliance status |

### Critical: Fields That Must Be Server-Side Trusted

The following must **never** be derived from client-supplied state in a real backend:
- Trust score (currently a client-side formula — trivially fabricated by any client)
- Deposit amounts (currently `calcDeposit()` on the client)
- Sanctions status (currently static `aiCheck.sanctionsOk: true` flags)
- Offer anonymity enforcement during tender (currently only a UI convention)
- Account type / permissions (currently from an editable localStorage key)
