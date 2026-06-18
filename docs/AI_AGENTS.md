# GLORIX — AI Agents

## The one fact that matters most in this document

**There is no real AI or LLM integration anywhere in the running GLORIX application.** No API call to OpenAI, Anthropic, or any other model provider exists in the codebase. Every feature labeled "ИИ" (AI) in the product is one of two things: a hardcoded, pre-written sequence of strings revealed on a timer, or a `Math.random()` pick from a small fixed list of canned responses. This is stated explicitly so that nobody — including a future session of this assistant — designs around, advertises, or budgets for capabilities that do not exist yet. The Roadmap page itself is honest about this: it lists "Реальный ИИ (OpenAI / Claude API)" as a Beta-phase (not current) deliverable.

## Inventory of every "AI" surface in the product

### 1. AI-Bots (`/ai-bots`, `AIBots.jsx`)
**What it looks like:** two animated bot personas (буyer bot, seller bot) that "converse" through four selectable scenarios (wheat tender, urgent marketplace purchase, fraud-prevention, RFI→tender CIPS cycle), with realistic-looking back-and-forth messages appearing with delays.
**What it actually is:** every message in every scenario is a complete, pre-written string baked into the `scenarios` array in the source file, played back via `setTimeout` at hand-tuned delays (`step.delay`, ranging roughly 500–2000ms). There is no generation, no branching logic, no model call. It is a scripted storytelling/demo device, functionally equivalent to a slideshow.

### 2. RFI community chatbot (`/rfi`, inside `RFIModule.jsx`)
**What it looks like:** an "ИИ-ассистент GLORIX" that responds in the anonymous community forum when a user sends a message.
**What it actually is:** `botResponses`, a 4-string array; on send, after a `setTimeout(..., 2000)` "typing" delay, one entry is chosen via `Math.random()` and inserted (with one literal `{query}` placeholder string-replaced, not understood). No connection whatsoever to the actual text the user typed.

### 3. Support chat (`/support`, `Support.jsx`)
Same pattern as #2: `autoResponses`, a 3-string array, random pick after a 1500ms delay. One of the three canned responses is itself an honest admission: "...In the production version this process will be fully automated. In the demo, some functions are simulated."

### 4. Relationship Manager chat (`/manager`, `RelationshipManager.jsx`)
Same pattern again: `replies`, a 4-string array, random pick after a 2000ms delay, regardless of what the user actually typed.

### 5. "AI" document drafting (commercial offers / КП)
Appears in three places: the Marketplace "add product" modal's КП generator, `DocumentCenter.jsx`'s КП generator, and the five document builders in `LegalAI.jsx` (`buildContract`/`buildOffer`/`buildSpecification`/`buildClaim`/`buildAcceptance`, and the newer `buildContractStructured`). **What it actually is:** plain deterministic string templating — the form fields the user typed are substituted into a fixed template literal. There is no language generation, no drafting intelligence, no model inference. The `generateKP()` functions wrap this templating in an artificial `setTimeout(..., 1500–2000)` purely so the UI can show a "◎ ИИ генерирует КП..." loading state, even though the actual computation is instantaneous string interpolation.

### 6. "AI-recommended" offer in tender analysis (`/ai-analysis`, `AIAnalysis.jsx`)
The `recommended: true` flag and the `aiNote` text on the "best" offer are static fields hardcoded directly into the one mock tender's data in `mock.js` — there is no comparison computation happening at render time; the "AI" already decided, permanently, at data-authoring time.

### 7. "AI-verified" / "AI-checked" badges throughout the UI
Phrases like "ИИ проверил все товары: санкционные списки..." (Marketplace), "ИИ автоматически проверит компанию через госреестр" (Onboarding), `aiCheck: { sanctionsOk: true, specsVerified: true }` (every product in `marketplace.js`), and the Anti-Fraud `auto: true` checks in `cips.js` are all **static, pre-set boolean/string values in the mock data** — no check is actually executed against any external registry, sanctions list, or specification database. They describe what a future real system should do, not something the current code does.

### 8. RFI answer scoring (`cips.js` → `rfiAnswers`)
Each mock RFI answer carries a pre-authored `aiScore` (0–100) and `aiNote` — again, hand-written into the static data, not computed from the actual answer text by any algorithm.

## What real integration would require

If/when GLORIX adds genuine AI capability (the Roadmap names this as a Beta-phase item, alongside real sanctions-list integration and KYC/AML), the minimum honest scope is: a real backend (see `API_REFERENCE.md`/`DATABASE_SCHEMA.md`, since none exists today) that proxies calls to a model provider, server-side prompt construction using real user/tender/product data instead of static strings, real document-drafting prompts grounded in the actual legal source material already gathered in `src/data/legalSources.js` and `research/`, and replacing every `Math.random()`/fixed-array response with a genuine model call. None of the current UI affordances (chat windows, "ИИ печатает..." typing indicators, generate buttons) need to change shape — only what happens behind them.

## Relationship to the bilingual contract safety mechanism

It's worth flagging explicitly: the certified-translation placeholder system described in `BUSINESS_RULES.md` §6 and `DECISIONS.md` is **not** an AI safety feature in the sense of guarding model output — there is no model generating that text in the first place. It's a plain deterministic rule (`if lang !== 'ru' && lang !== 'en', show placeholder`) that happens to exist for the same underlying reason a real AI safety guard would: GLORIX has no verified way to produce correct legal text in those languages, so it must not pretend otherwise. If real AI-assisted translation is ever added for those languages, this rule should be the first thing re-evaluated, and only relaxed once an actual professional-grade, verified translation pipeline exists — not simply because a model can now produce plausible-looking output in that language.
