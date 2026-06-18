# GLORIX — Roadmap & Strategic Positioning

**Source**: `src/pages/Roadmap.jsx` (shown to investors/partners at `/roadmap`), supplemented by `Legal.jsx` and `Onboarding.jsx` self-disclosures.

---

## Market Opportunity

| Metric | Value |
|---|---|
| CIS B2B e-commerce volume (2026 projection) | $2.1 trillion |
| Companies in CIS engaged in export | 180,000+ |
| Average competitor commission | 3–5% |
| GLORIX commission (marketplace) | 0.5–1.5% |

---

## Positioning Statement

> "GLORIX — единственная B2B платформа для СНГ с прозрачными тендерами, ИИ-анализом реальной стоимости сделки и полным CIPS-совместимым закупочным циклом."

Three core pain points solved:
1. **Corruption in tenders** → anonymous bidding until close
2. **Hidden costs** → AI TCO analysis + Incoterms
3. **Fraud** → escrow deposit + company verification

---

## 4-Phase Roadmap

### Phase 1: Demo ✅ Current

**Period**: Now

All items below are ✅ implemented as client-side demo/simulation:

- Tender cycle (5 deadline stages)
- Marketplace with photos and specifications
- AI TCO analysis + Incoterms (simulated)
- Deposit and trust rating system
- RFI module (CIPS standard)
- Supplier Scorecard 10C + ESG
- Anti-fraud check (simulated)
- AI-bot deal simulation
- Anonymous participant forum
- Bilingual legal document generation (RU/EN + per-country law)
- Document Center (КП, offers, specs, claims, acceptances)
- Analytics dashboard (static)
- Relationship Manager (simulated)

---

### Phase 2: MVP 🚧 Next

**Period**: Q3 2025 + 6 months (note: this date is from the in-product roadmap; actual timeline subject to founder decision)

| Feature | Status | Notes |
|---|---|---|
| Real authentication (JWT) | 🚧 | Replace localStorage account-type with real auth |
| PostgreSQL database | 🚧 | All mock data becomes real persisted records |
| Node.js backend API | 🚧 | REST API as sketched in `API_REFERENCE.md` Part 2 |
| Real government registry verification | 🚧 | my.gov.uz, egov.kz, nalog.gov.ru, e-taxes.gov.az, napr.gov.ge |
| Payme / Kaspi escrow integration | 🚧 | Real deposit + payout flow |
| Email + Telegram notifications | 🚧 | Tender stage changes, offers, deposit confirmations |
| Mobile PWA | 🚧 | Progressive Web App on top of current React SPA |
| First 10 real companies onboarded | 🚧 | Actual user acquisition milestone |

---

### Phase 3: Beta 🚧 Planned

**Period**: Q4 2025 + 3 months

| Feature | Status | Notes |
|---|---|---|
| Real AI (OpenAI / Claude API) | 🚧 | Document drafting, TCO analysis, chat support |
| Real sanctions screening | 🚧 | OFAC, EU Consolidated List, UN Sanctions List |
| Carrier tracking API | 🚧 | FESCO, Globaltruck, Deliver integration |
| Contract builder tool | 🚧 | Enhanced version of current Legal AI |
| KYC / AML verification | 🚧 | Full identity + anti-money-laundering checks |
| 50+ verified companies | 🚧 | Growth milestone |
| First monetization (commission) | 🚧 | 0.5–1.5% marketplace fee, escrow fee |

---

### Phase 4: Production 🚧 Planned

**Period**: 2026

| Feature | Status | Notes |
|---|---|---|
| Global expansion (beyond CIS) | 🚧 | MENA, SEA, potentially EU corridors |
| Own escrow license | 🚧 | Own payment institution license (major regulatory undertaking) |
| 1С and ERP integration | 🚧 | Data exchange with 1C Enterprise, SAP, Oracle |
| Native mobile app (iOS / Android) | 🚧 | Beyond PWA |
| Procurement analytics platform | 🚧 | Spend analysis, savings tracking, category intelligence |
| SRM platform (supplier relationship management) | 🚧 | Full SRM on top of current basic relationship manager |
| API for corporate clients | 🚧 | White-label / embedded procurement capabilities |
| 500+ companies | 🚧 | Scale milestone |

---

## Competitive Analysis

| Competitor | Their Strengths | Their Weaknesses | GLORIX Advantage |
|---|---|---|---|
| go4WorldBusiness | Large database, 30 years in market | Outdated UI, no AI, no TCO analysis, no CIS focus | ✓ AI analysis, ✓ CIS focus, ✓ Escrow, ✓ CIPS |
| Alibaba B2B | Global reach, huge database | No tenders, no anonymity, many fraudsters | ✓ Tenders, ✓ Anonymity, ✓ Verification |
| Uzum Business | Local UZ leader | UZ only, no tenders, no B2B specifics | ✓ CIS region, ✓ Tenders, ✓ Incoterms |
| TenderPro / Zakupki (government platforms RU) | Government procurement | Government procurement only, no marketplace, no AI | ✓ Private sector, ✓ Marketplace, ✓ AI |

---

## Target Partners

| Category | Named Examples | Role |
|---|---|---|
| Banks / escrow | Payme, Click, Kaspi, Тинькофф | Escrow and payment infrastructure |
| Logistics | FESCO, Globaltruck, Deliver | Shipment tracking, waybill integration |
| Chambers of Commerce | ТПП Узбекистана (UzCCI), НПП «Атамекен» (Kazakhstan), ТПП РФ | Company verification, CT-1 certificate issuance, arbitration/mediation |
| Customs brokers | GTL, AsstrA, Meridian | Customs clearance, compliance documentation |
| ERP systems | 1С, SAP, Oracle | Procurement process integration for enterprise clients |
| Business associations | UzCCI, KAZENERGY, РСПП | First customer acquisition channel |

---

## Monetization Model

| Revenue Stream | Phase | Mechanism |
|---|---|---|
| Marketplace commission | Beta | 0.5–1.5% of order value (see `BUSINESS_RULES.md` §Rule 2) |
| Tender deposit fee | Beta | % of escrow held (model TBD — may keep deposit return mechanism or charge a small holding fee) |
| Premium subscriptions | Production | Enhanced features for high-volume buyers/sellers |
| API access for enterprise | Production | Programmatic procurement for corporate clients |
| Compliance/verification services | Production | Premium KYC/AML, legal document review |

---

## Known Gaps vs. Stated Positioning

| Stated Claim | Current Reality | Resolution Path |
|---|---|---|
| "AI analysis" | Hardcoded static data and random picks | Real LLM API (Beta) |
| "Automatic company verification through government registries" | Progress bar animation, no API call | Government registry integration (MVP) |
| "Sanctions list checking" | Static `sanctionsOk: true` flag | Real OFAC/EU/UN screening (Beta) |
| "Escrow deposits" | Client-side calculation, no money moves | Payment partner integration (MVP) |
| "Anonymous bidding" | UI convention only, same data visible to all in demo | Server-enforced anonymity (MVP) |
