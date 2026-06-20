# GLORIX — Decisions

This document records *why* significant choices were made. The *what* lives in `BUSINESS_RULES.md`, `ARCHITECTURE.md`, and `SYSTEM_DESIGN.md`. Rationale is preserved permanently here because it's exactly what otherwise only lives in a chat transcript and gets lost.

---

## Decision 1: Bilingual Contract Language Rule (Country-Law-Driven, Not Fixed)

**Decision**: Contract language is determined by a country-law resolver, not a free-form user choice or a fixed default. Cross-border deals always render bilingual RU/EN. Same-country deals follow each country's actual domestic contract-language law.

**Rationale**: A generic RU-only or RU/EN-only template cannot legally serve 11 CIS countries with different binding legal requirements for what language a commercial contract must be in. This is not a UX decision — it's a legal compliance decision. Getting it wrong can make a contract legally unenforceable or invalid. The research phase produced per-country verified legal source citations (stored in `legalSources.js` and `research/language_law_findings.md`) specifically to ground this rule in real law rather than assumption.

**Implementation**: `resolveContractLanguage(sellerCountry, buyerCountry)` in `contractData.js`.

---

## Decision 2: Kazakhstan as the Mandatory Bilingual Exception

**Decision**: Kazakhstan domestic B2B contracts must render both Kazakh and Russian (`primary: 'kk', secondary: 'ru'`), even when both parties are KZ companies.

**Rationale**: Kazakhstan's language law genuinely requires this for domestic business contracts — it is not a design choice but a legal requirement verified from the Kazakhstani legal sources in `legalSources.js`. This makes Kazakhstan the only country in the CIS where a same-country deal produces a bilingual document.

---

## Decision 3: The Certified-Translation Placeholder Mechanism

**Decision**: For any contract column whose resolved language is not `'ru'` or `'en'`, every clause renders as an explicit "[LanguageName: текст требует профессионального юридического перевода]" placeholder rather than any generated or approximated text.

**Rationale**: GLORIX has no verified professional legal translator for Kazakh, Tajik, Georgian, Azerbaijani, Kyrgyz, or Turkmen. A wrong word in a legal contract can change its enforceable meaning and expose a business to legal liability. This is a direct application of the founder's standing rule: "zero tolerance for invented legal content — if something can't be verified, show that honestly rather than papering over the gap."

**Why not machine translation?**: Machine-translated legal text looks professional but may be legally wrong in subtle, case-specific ways that a non-native speaker of the target language would not catch. The consequence of a silently wrong contract clause is worse than an obviously incomplete one, because the former might not be challenged until there's an actual dispute.

---

## Decision 4: The Kazakh Column-Order Bug (Canonical Safety Example)

**What happened**: During implementation of the bilingual contract system, all three renderers (screen, PDF, Word) initially assumed the table's first column was always Russian and the second was always the "other" language. This silently broke for Kazakhstan: the resolver correctly returns `primary: 'kk', secondary: 'ru'`, but the renderers were showing real Russian legal text mislabeled as Kazakh in column 1 and Kazakh placeholders labeled as Russian in column 2 — precisely the kind of legally dangerous mislabeling the safety mechanism was designed to prevent.

**Discovery**: The bug was found by deliberately building an isolated Node test harness, generating real PDFs, rendering them to PNG with `pdftoppm`, and visually inspecting the Kazakhstan test case — not by code review or reasoning. The bug was invisible in code review because the assumption (column 1 = Russian) was local and seemed reasonable in isolation.

**Fix**: A uniform `resolveColumnText(ruText, enText, lang)` helper applied independently per column based on each column's actual `contractLang.primary` / `contractLang.secondary` language code — never derived from column position (left vs. right). This pattern is now mandatory in all three renderers and must never be replaced with a position-assumption.

**Lesson**: When building multi-language rendering, test with the language-combination that has a non-obvious column assignment (Kazakhstan KK+RU, not just the default RU+EN). Static code review is insufficient — render to the real output format and inspect it.

---

## Decision 5: Leaving TJ/GE/AZ/KG/TM as Placeholder-Only for Now

**Decision**: Domestic contracts in Tajikistan, Georgia, Azerbaijan, Kyrgyzstan, and Turkmenistan (in `caution` mode) render as entirely placeholder documents — no usable legal text — rather than blocking the whole feature until verified translations are available.

**Founder's words**: "Оставить как есть (плейсхолдеры) — это demo, реальный перевод потом."

**Rationale**: Shipping a safe-but-non-functional document for 5 jurisdictions is strictly better than either (a) blocking the entire bilingual contract feature indefinitely, or (b) shipping legally unverifiable text. This is a known, bounded, intentional gap, not an oversight.

**Correct future resolution**: Obtain and verify professional legal translations for these languages through an actual professional translation service (not machine translation), then add the verified text as additional language data in `contractData.js`. Do not resolve this by weakening the safety check.

---

## Decision 6: Two Parallel Document-Rendering Pipelines

**Decision**: The Contract document was redesigned into a structured-data, three-renderer pattern (Pipeline B), while Offer/Specification/Claim/Acceptance remain on the plain-text-template pattern (Pipeline A). They were deliberately NOT unified.

**Rationale**: The plain-text approach cannot safely support per-country bilingual rendering with per-column language safety checks — a single string cannot represent "this clause has a Russian version and a Kazakh version that must render side-by-side and independently apply the safety check." Migrating all five document types to Pipeline B in the same pass would have required a much larger rewrite of documents that don't currently have a bilingual requirement.

**Future guidance**: If Offer/Specification/Claim/Acceptance ever need real multi-language support, migrate them to Pipeline B's structured pattern at that time. Do not try to extend Pipeline A to support this — that would re-introduce the exact fragility the structured approach was built to eliminate.

---

## Decision 7: This Documentation System as Real Committed Files

**Decision**: The "permanent project knowledge base" requested by the founder is implemented as 13 real Markdown files committed to the repository, not as an assumption that AI session memory or conversation history will carry this knowledge.

**Rationale**: An AI assistant has no true persistent memory between sessions beyond (a) Anthropic's separate memory-fact system, which stores extracted facts rather than full technical documents, and (b) whatever is actually committed to the repository. Telling the founder otherwise would be inaccurate and would silently fail the next time a session starts cold. Real files in git: can be reviewed/edited by the founder directly, can be diffed against the actual code to catch drift, survive across every session boundary, and are the only mechanism that actually satisfies "single source of truth, kept synchronized with development."

---

## Decision 8: All "AI" Features Are Honest Simulations

**Decision**: The platform builds out full AI-style UX (chat interfaces, typing indicators, loading states, "AI is analyzing...") but implements all of it as hardcoded strings or random-picks, with no real LLM calls, for the Demo phase.

**Rationale**: This is the correct tradeoff for an investor/partner demo. The UX shows investors what the product will feel like; the absence of real AI costs (API fees, latency, unpredictable outputs) keeps the demo reliable and cheap. The Roadmap is honest about when real AI arrives (Beta phase). The risk is in someone, including a future AI assistant, treating these simulations as real capabilities — which is why `AI_AGENTS.md` documents every surface explicitly.

---

## Decision 9: Mirror-Penalty as the Non-Negotiable Contract Standard

**Decision**: GLORIX enforces symmetric penalty terms for both parties in every generated contract — 0.1%/day capped at 10%, non-delivery 10%, payment delay 0.1%/day capped at 10%, suspension rights equal. No user can configure asymmetric terms through the platform's standard contract flow.

**Rationale**: The original source contracts analyzed ("ТФД contracts") had asymmetric terms that systematically disadvantaged suppliers — a common source of dispute and perceived unfairness in CIS B2B trade. GLORIX's stated differentiator is eliminating this. Making the mirror standard non-negotiable (rather than a default that can be changed) is the product expression of that commitment. Any future contract-customization feature must surface deviations from the mirror standard as explicit, named exceptions — not silently allow asymmetric terms to be reintroduced.

---

## Decision 10: HS Code (ТН ВЭД) Search — Real Dataset + Official Group Names + Two-Provider Translation Fallback + Dictionary

**Decision**: TNVED search is layered four ways, in priority order: (1) direct match against the real official Harmonized System dataset (5,613 codes, English descriptions, from `datasets/harmonized-system` / UN Comtrade, ODC PDDL license) for code or English-term queries; (2) for Russian queries, an exact match against the official Russian names of all 96 ТН ВЭД ЕАЭС product groups (`tnvedGroupsRu.json`, sourced from classifikators.ru, referencing EEC Council Decision No. 80 of 14.09.2021) — genuine official terminology, not a translation, checked first because it's the most trustworthy tier; (3) a local dictionary (459 common CIS B2B trade terms) translates to English keywords with zero network dependency; (4) if neither the official-group match nor the dictionary has an entry, live translation is attempted through two providers in sequence — the unofficial `translate.googleapis.com` endpoint first (no API key, undocumented, not officially supported by Google), then MyMemory's official public API (documented, explicitly CORS-enabled for direct browser use, no API key, but with a daily quota of roughly 1,000-5,000 words per anonymous IP) as a fallback if Google fails. The platform shows the user multiple candidate code matches to choose from rather than picking one silently.

**Rationale**: The founder explicitly asked for broad Russian-language coverage beyond what a hand-curated dictionary can practically achieve, approved using free external translators (plural) plus expanding the dictionary, and separately asked for the official-group tier after noticing dictionary-driven false positives (e.g. "жемчуг"/pearl surfacing tapioca, since the English dataset describes tapioca pearls using the word "pearls" too). Backend infrastructure is accepted as the eventual real fix (Roadmap MVP/Beta phases already plan one). Two translation providers were chosen specifically so neither's unavailability (rate limit, endpoint change, network block) silently disables the live-translate tier entirely — DeepL and Yandex were evaluated and rejected as providers: DeepL's API explicitly returns 403 Forbidden for any direct browser request ("blocked by CORS policy"), and Yandex stopped issuing free API keys in 2020 — both require either a paid key or a backend proxy this phase doesn't have. A third provider (Bing/Microsoft's unofficial endpoint) was evaluated and intentionally not added: it requires scraping short-lived auth tokens out of the Bing translator HTML page via regex, a more fragile integration than either Google's or MyMemory's straightforward query-parameter endpoints, for marginal additional reliability given two providers already exist.

This is a deliberate, founder-approved tradeoff, not a silent shortcut: both live-translate endpoints are either undocumented (Google) or rate-limited (MyMemory) and could change behavior without notice, so the official-group and dictionary layers must remain functional as no-network fallbacks, and the live-translate layer must fail gracefully (show "translation unavailable, try an English term" rather than crash) rather than being treated as guaranteed-available infrastructure.

**Constraint for future work**: When the platform reaches MVP/Beta and gains a real backend, both unofficial/rate-limited endpoints should be replaced with an official paid translation API (Google Cloud Translation, DeepL via a backend proxy) or a self-hosted LibreTranslate instance — all require server-side infrastructure this phase doesn't have. Don't silently keep relying on the demo-phase endpoints once a backend exists; this was always a Demo-phase-only tradeoff, not a permanent architecture choice. Also: the official-group dataset currently covers only the 96 top-level (2-digit) groups — deeper levels (4-digit headings, ~1,200 entries; 6-digit specifics, all 5,613) are an explicitly agreed incremental task across future sessions, not abandoned scope.

---

## Decision 11: Marketplace localStorage-Based Persistence + Categorical Export-Restriction Check

**Decision**: The marketplace now has real (not simulated) seller-add-product, buyer-purchase, and cart functionality, persisted via `localStorage` in `src/data/marketplaceStore.js` rather than a backend database. Products added by sellers are merged with the static 32-product demo catalog at read time (`getAllProducts()`); stock decrements apply to both static and user-added products (static products use a separate override map, since `marketplace.js` is code, not data, and shouldn't be mutated). Cart and order history follow the same pattern.

Separately, `checkExportRestriction()` was added to `sanctionsScreening.js`: if the buyer's account country is Russia and the product's category is one of `metals`, `chemicals`, `electronics`, `equipment`, the purchase is blocked with an explanation. This is a categorical approximation of real, current EU sanctions packages against Russia (20th package, April 2026: expanded export bans on metals, minerals, chemicals, industrial tools and machine tools; the dual-use Annex I update separately covers electronics) — verified via web search before implementation, not invented. It is explicitly NOT equivalent to real HS-code/ECCN-level export control classification, which the platform doesn't have the data for at this phase.

**Rationale**: The founder gave an explicit 8-point list to turn the marketplace from a static showcase into something that actually functions within a single browser demo session — "клиент когда зайдёт в маркетплейс... должен сразу начать работать". No backend exists (see the critical-gaps analysis in session 20's history entry), so `localStorage` is the only honest way to make "add a product" and "buy a product" have real, persistent effects within a session — and the UI explicitly discloses this boundary (data doesn't sync across devices, doesn't survive a cache clear) rather than implying server-side persistence. The export-restriction check directly implements one of the founder's 8 requirements (point 8) and was grounded in real, current sanctions law rather than assumed or invented categories — the same standard already established for `screenForSanctions` (point 7, pre-existing) in an earlier session.

**Constraint for future work**: When a real backend exists, `marketplaceStore.js`'s localStorage calls should be replaced with real API calls to a database — the function signatures (`getAllProducts`, `addUserProduct`, `decrementStock`, cart/order functions) were deliberately kept simple and synchronous-looking (despite localStorage being synchronous in practice) so this swap is mechanical, not a redesign. The export-restriction category list (`RU_EXPORT_RESTRICTED_CATEGORIES`) is a coarse approximation tied to the marketplace's existing 8 broad categories — once real HS/ECCN codes exist per product (see Decision 10's TNVED work), this should be replaced with code-level classification, not category-level guessing.
