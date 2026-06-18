# GLORIX — Integrations

## ✅ Current Real Integrations (npm Libraries Only)

No third-party *service* integrations exist today. GLORIX makes zero external API calls of any kind.

| Library | Version | Purpose | Used In |
|---|---|---|---|
| `docx` | ^9.7.1 | Real `.docx` Word file generation, fully client-side | `utils/docxExport.js`, `utils/contractDocxExport.js` |
| `jspdf` | ^4.2.1 | Real `.pdf` generation with embedded fonts, fully client-side | `utils/pdfExport.js`, `utils/contractPdfExport.js` |
| `lucide-react` | ^1.18.0 | Icon set | Sidebar and some pages |
| `react-router-dom` | ^7.17.0 | Client-side routing | `App.jsx`, navigation throughout |
| `react` + `react-dom` | ^19.2.6 | UI framework | Everywhere |

**Absent**: no analytics SDK (no GA, Mixpanel, Sentry), no map library, no HTTP client library (no axios/fetch wrapper — there is nothing to call), no auth library, no payment SDK.

---

## ❌ Not Integrated (Planned — See Roadmap Phases)

### MVP Phase — Payments / Escrow

| Partner | Country/Region | Integration Type | Role |
|---|---|---|---|
| Payme | Uzbekistan | REST API | Escrow deposits + payouts |
| Click | Uzbekistan | REST API | Escrow alternative |
| Kaspi Pay | Kazakhstan | REST API | Escrow for KZ |
| Тинькофф | Russia | REST API | Escrow for RU |

Currently simulated: `calcDeposit()` computes the deposit amount client-side but no money ever moves. The Onboarding page explicitly states: "В production версии потребуется верификация банковского счёта компании и внесение депозита через партнёрский банк."

### MVP Phase — Government Registry Verification

| Registry | Country | Endpoint type |
|---|---|---|
| my.gov.uz (UZINFOCOM) | Uzbekistan | REST API |
| egov.kz | Kazakhstan | REST API |
| nalog.gov.ru | Russia | REST API (FNS EGRUL) |
| e-taxes.gov.az | Azerbaijan | REST API |
| napr.gov.ge | Georgia | REST API |

Currently simulated: Onboarding "ИИ проверит компанию через госреестр" is a progress-bar animation with no actual API call.

### MVP Phase — Notifications

| Channel | Notes |
|---|---|
| Email (transactional) | Tender stage changes, offer received, deposit confirmed. Provider TBD (SendGrid, Resend, etc.) |
| Telegram bot | Alternative notification channel, common in CIS region |

### Beta Phase — Real AI / LLM

| Provider | Use Case |
|---|---|
| OpenAI (GPT-4) or Anthropic (Claude API) | Document drafting, TCO analysis, chat support |
| Server-side only | API key never in frontend bundle |

### Beta Phase — Sanctions Screening

| List | Authority |
|---|---|
| SDN List | OFAC (US Treasury) |
| EU Consolidated Sanctions List | European Union |
| UN Sanctions List | United Nations |
| National lists | Per-country (UZ, KZ, RU, AZ, GE) |

### Beta Phase — Logistics Tracking

| Partner | Notes |
|---|---|
| FESCO | Russian/CIS container shipping |
| Globaltruck | CIS road freight |
| Deliver | CIS last-mile/regional |

### Production Phase — ERP Integration

| System | Integration Type |
|---|---|
| 1С (1C Enterprise) | API / data exchange (standard for CIS SMBs) |
| SAP | REST API |
| Oracle | REST API |

### Production Phase — Partner Organizations (non-technical, BD channel)

| Organization | Type | Role |
|---|---|---|
| ТПП Узбекистана (UzCCI) | Chamber of Commerce | Company verification, CT-1 certificates, arbitration |
| НПП «Атамекен» (Kazakhstan) | Chamber | Same for KZ |
| ТПП РФ | Chamber | Same for RU |
| GTL, AsstrA, Meridian | Customs brokers | Clearance + compliance documentation |
| UzCCI, KAZENERGY, РСПП | Business associations | Customer acquisition channel |

---

## Integration Security Rules (Standing)

Per project security policy (`SECURITY.md`):
1. All payment/escrow integrations must go server-side — GLORIX frontend must never handle raw card or bank credentials
2. All AI API keys must be server-side environment variables — never in the frontend Vite bundle (publicly readable in devtools)
3. When connecting a new third-party service, update this file on the same day
4. Any new npm dependency must be assessed for: data it could access, whether it requires secrets, whether it introduces a new attack surface
