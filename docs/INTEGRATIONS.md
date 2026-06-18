# GLORIX — Integrations

## Current real integrations (what's actually wired up today)

GLORIX has no third-party *service* integrations today — no payment processor, no bank, no logistics API, no government registry API, no AI provider. The only real integrations are client-side npm libraries bundled into the frontend:

| Library | Purpose | Where used |
|---|---|---|
| `docx` (^9.7.1) | Generates real `.docx` Word files entirely client-side | `src/utils/docxExport.js`, `src/utils/contractDocxExport.js` |
| `jspdf` (^4.2.1) | Generates real `.pdf` files entirely client-side, including embedded custom fonts | `src/utils/pdfExport.js`, `src/utils/contractPdfExport.js`, `src/utils/ptSerifFont.js`, `src/utils/robotoFont.js` |
| `lucide-react` (^1.18.0) | Icon set | available throughout, though many pages currently use plain Unicode glyphs/emoji instead |
| `react-router-dom` (^7.17.0) | Client-side routing | `App.jsx`, every page navigation |
| `react` / `react-dom` (^19.2.6) | UI framework | everywhere |

No backend SDKs, no payment SDKs, no analytics SDKs (no Google Analytics, no Mixpanel, no Sentry), no map/geolocation libraries are present, despite country flags and destinations appearing throughout the UI as plain emoji/text rather than any mapping integration.

## Future integrations named in the product's own Roadmap (`Roadmap.jsx`)

These are the partner categories the founders themselves identified as targets — listed here as a faithful record of stated intent, not as integrations that exist or as commitments this document is making on the founders' behalf:

| Category | Named examples | Intended role |
|---|---|---|
| Banks / payment-escrow | Payme, Click, Kaspi, Тинькофф | Escrow and payment infrastructure (currently 100% simulated) |
| Logistics | FESCO, Globaltruck, Deliver | Shipment tracking, waybill integration |
| Chambers of commerce | ТПП Узбекистана (UzCCI), НПП «Атамекен» (Kazakhstan), ТПП РФ | Company verification, certificate-of-origin (CT-1) issuance, arbitration/mediation |
| Customs brokers | GTL, AsstrA, Meridian | Customs clearance, compliance documentation |
| ERP systems | 1С, SAP, Oracle | Procurement-process integration for larger corporate clients |
| Business associations | UzCCI, KAZENERGY, РСПП | Customer acquisition channel, not a technical integration |

The Roadmap's MVP phase (Q3 2025 + 6 months per the in-product copy) also names: real JWT-based authentication, a PostgreSQL database, a Node.js backend API, real government-registry verification, "Payme / Kaspi (Escrow)" integration specifically, email/Telegram notifications, and a mobile PWA. The Beta phase additionally names a real AI integration ("OpenAI / Claude API" — see `AI_AGENTS.md`), real sanctions-list filtering, carrier-tracking API integration, a contract-builder tool, and KYC/AML verification.

## Government registries referenced (not yet integrated, referenced as data sources in UI copy)

`Legal.jsx`'s jurisdiction table and `Onboarding.jsx`'s company-verification step reference, but do not call: `my.gov.uz` (Uzbekistan), `egov.kz` (Kazakhstan), `nalog.gov.ru` (Russia), `e-taxes.gov.az` (Azerbaijan), `napr.gov.ge` (Georgia). Real integration with these would be part of the MVP-phase "real government-registry verification" Roadmap item.

## Guidance for adding any new integration

Per this assistant's standing tool-use safety rules: connecting a new third-party service (an MCP connector, a payment API, a new npm package that talks to an external service) should go through the same evaluation any new dependency gets — check what data it would receive, whether it requires secrets (which must go in Vercel environment variables, never committed — see `DEPLOYMENT.md`), and whether the integration is something the founder explicitly asked for versus something picked unilaterally. Update this file the same day any new real integration is wired up, so it never drifts from being the accurate record of what's actually connected versus merely planned.
