# GLORIX — AI Agents

## The Most Important Fact in This Document

**There is no real AI or LLM integration anywhere in the running GLORIX application.** Zero API calls to OpenAI, Anthropic, Google, or any other model provider. The Roadmap explicitly lists "Реальный ИИ (OpenAI / Claude API)" as a **Beta-phase** (not current) deliverable.

Every "AI" feature is one of two implementation patterns:
- **Pattern A**: A hardcoded array of pre-written strings played back via `setTimeout` (scripted storytelling)
- **Pattern B**: `Math.random()` pick from a small fixed array of canned responses

---

## Inventory of Every "AI" Surface

### 1. AI-Bots — `/ai-bots` (`AIBots.jsx`) ❌ Simulated

**What it looks like**: Two animated bot personas (buyer bot, seller bot) having realistic back-and-forth conversations across four selectable scenarios:
- Wheat tender (B2B procurement workflow)
- Urgent marketplace purchase
- Fraud prevention scenario
- Full RFI → Tender CIPS 13-stage cycle walkthrough

**What it actually is**: Pattern A. Every message in every scenario is a complete, pre-written string baked into the `scenarios` const array in the source file. Played back sequentially via `setTimeout(fn, step.delay)` with hand-tuned delays (500–2000ms). Zero generation. Zero branching. Functionally equivalent to a timed slideshow. Used as a sales/investor demo narrative tool.

---

### 2. RFI Community Chatbot — `/rfi` (`RFIModule.jsx`) ❌ Simulated

**What it looks like**: An "ИИ-ассистент GLORIX" that responds in the anonymous community forum.

**What it actually is**: Pattern B. `const botResponses = [4 strings]`. On user send → `setTimeout(fn, 2000)` → `Math.random()` picks one. One response has a `{query}` placeholder string-replaced with whatever the user typed — not understood, just textually inserted.

---

### 3. Support Chat — `/support` (`Support.jsx`) ❌ Simulated

**What it looks like**: Live support chat with "GLORIX Support Team."

**What it actually is**: Pattern B. `const autoResponses = [3 strings]`. On send → `setTimeout(fn, 1500)` → `Math.random()` picks one. Notably, one of the three canned responses is an honest self-disclosure: *"In the production version this process will be fully automated. In the demo, some functions are simulated."*

---

### 4. Relationship Manager Chat — `/manager` (`RelationshipManager.jsx`) ❌ Simulated

**What it looks like**: Personal account manager who responds to client queries.

**What it actually is**: Pattern B. `const replies = [4 strings]`. On send → `setTimeout(fn, 2000)` → `Math.random()` picks one. Response is independent of what the user typed.

---

### 5. AI Document Drafting (`LegalAI.jsx`, `DocumentCenter.jsx`, `Marketplace.jsx`) ❌ Simulated

**What it looks like**: "ИИ генерирует КП...", "AI is drafting your offer...", generates complete trade documents.

**What it actually is**: Plain deterministic string templating. Form field values are substituted into fixed template literals. The `generateKP()` functions wrap this in a `setTimeout(..., 1500–2000)` purely for the UX loading state. The actual computation is instantaneous JavaScript string interpolation — zero AI involved.

This applies to all five document builders:
- `buildOffer()`, `buildSpecification()`, `buildClaim()`, `buildAcceptance()` in `LegalAI.jsx`
- `buildContractStructured()` in `contractData.js` (the structured bilingual contract)
- КП generators in `DocumentCenter.jsx` and `Marketplace.jsx`

---

### 6. AI-Recommended Tender Offer — `/ai-analysis` (`AIAnalysis.jsx`) ❌ Simulated

**What it looks like**: AI analysis of three supplier offers, highlighting the recommended best choice with reasoning.

**What it actually is**: The `recommended: true` flag and `aiNote` text are static fields hardcoded directly in `mock.js` → `aiAnalysis.offers[]`. The "AI" decided at data-authoring time, permanently. No runtime computation happens. The displayed "reasoning" is a hand-written string.

---

### 7. AI-Verified / AI-Checked Badges Throughout UI ❌ Simulated

**Appearances**:
- Marketplace: "ИИ проверил все товары: санкционные списки..."
- Onboarding: "ИИ автоматически проверит компанию через госреестр"
- `marketplace.js` products: `aiCheck: { sanctionsOk: true, specsVerified: true, qualityRisk: 'low' }`
- `cips.js` anti-fraud checks: `auto: true` on 6 of 10 checks

**What it actually is**: Static boolean/string values hardcoded in the mock data files. No check is executed against any external registry, sanctions list, or specification database. These describe **what a future real system should do**, not what the current code does.

---

### 8. RFI Answer AI Scoring — `cips.js` ❌ Simulated

Each mock RFI answer carries `aiScore: number` (0–100) and `aiNote: string` — hand-written into static data, not computed from the actual answer text.

---

## What Real AI Integration Requires (🚧 Beta Phase)

Per the Roadmap, real AI arrives in Beta. Minimum scope for honest AI:

1. **A real backend** (MVP phase prerequisite — see `API_REFERENCE.md`, `DEPLOYMENT.md`)
2. **Server-side LLM proxy** — API keys must never be in frontend bundle code
3. **Document drafting**: real prompt construction using actual form data, company profiles, and the legal source material already in `src/data/legalSources.js` and `research/`
4. **TCO/offer analysis**: real comparison computation from actual offer data, not static hardcoded recommendations
5. **Company verification**: real government registry API calls (see `INTEGRATIONS.md` for the registries)
6. **Sanctions screening**: real OFAC/EU/UN list lookups, not static boolean flags
7. Replace every `Math.random()`/fixed-array chat response with real LLM calls
8. The `setTimeout` UX delays can remain — they don't need to change

The current UI affordances (chat windows, loading spinners, "ИИ печатает..." indicators) are already in place and suitable for wiring to real AI — only the implementation behind them needs replacing.

---

## Relationship to the Translation Safety Mechanism

The certified-translation placeholder system (`BUSINESS_RULES.md` §Rule 6) is **not** a guard on AI output — there is no AI generating that text. It's a deterministic rule that exists for the same reason any AI safety guard would: GLORIX cannot verify legal text in certain languages, so it must not produce it. If real AI-assisted translation is added for Kazakh/Tajik/Georgian/etc., this rule must be the first thing re-evaluated — and should only be relaxed once a professional-grade, legally-verified translation pipeline (not just "the model can produce plausible output") is in place.
