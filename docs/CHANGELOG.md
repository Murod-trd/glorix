# GLORIX — Changelog

New entries go at the **top** in `## YYYY-MM-DD — Title (commit hash)` format. When a change affects any rule in `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `SYSTEM_DESIGN.md`, or `DECISIONS.md`, update those files in the same commit — this log records that something changed; the other documents must reflect the new current state.

---
## 2026-06-19 — CRITICAL: previous phrase-matching fix was never committed; deployed a Russian-context fix on top of it

Founder sent a screenshot of "труба пвх" (PVC pipe) search on the actual live build returning completely irrelevant results (hookah smoking tobacco, ammonium/calcium/magnesium chlorides), with everything shown in English with zero Russian context.

**Investigation revealed a process failure, not just a code bug.** The working tree already contained a correct fix for the phrase-matching problem (`matchByPhrases`/`matchesPhrase` -- requiring ALL words of a translation to match together, not any single word independently) from earlier work, but it had never been committed or pushed in the prior session -- it only existed as uncommitted working-directory changes, alongside two forgotten test files (`test_full.mjs`, `test_pipe.mjs`). This explains why the screenshot showed the old, actually-deployed behavior: a single shared word from a multi-word dictionary translation (e.g. "pipe" from "pipe tube" for «труба», or "chloride" from "vinyl chloride" for «пвх») matched independently against unrelated products. Confirmed fixed by direct testing: "труба пвх" now returns the correct top result (plastic pipe/tube fittings) immediately.

**New finding this session -- missing Russian context in results.** Product names from the international dataset are in English (a known, documented limitation, see Decision 10), but previously the user saw bare English text with no Russian anchor at all. Added: every search result now carries `groupNameRu` -- the genuine official Russian name of its product group (from `tnvedGroupsRu.json`, collected in session 9). This doesn't translate the specific product name, but gives the user honest Russian context ("Группа: Пластмассы и изделия из них" instead of a bare "Раздел VII"). Implemented centrally in `searchHsCodes()` via `enrichWithRuGroup()`, applied across every search branch (direct code, English term, official group, dictionary, live translate) without duplicating logic.

**Process lesson, recorded explicitly:** work done in the working directory doesn't exist for the project or the founder until it's committed and pushed. Before ending any session, `git status` must be checked for uncommitted changes and forgotten test files -- memory of what was done is not a substitute for verifying it.

Verified: "труба пвх", "насос", "олово", "оружие" all return relevant top results and now carry a Russian group name. `npm run build` succeeds, main chunk 684.43KB (modest growth), both datasets remain separate lazy-loaded chunks.

**Files changed**: `src/data/hsCodes.js`, `src/pages/DocumentCenter.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Second translation provider (MyMemory) added as fallback; DeepL/Yandex/Bing evaluated and rejected with reasons recorded

Founder explicitly requested backup translators (DeepL and others) in case Google is unavailable. Investigated real technical constraints before implementing:

- **DeepL** -- rejected. The official API explicitly blocks direct browser requests (HTTP 403 "blocked by CORS policy"), requiring a backend proxy the project doesn't have.
- **Yandex Translate** -- rejected. Free API keys stopped being issued in 2020; only paid Yandex Cloud is available now.
- **Bing/Microsoft Translator** (unofficial path) -- evaluated and deliberately not added. Requires scraping short-lived auth tokens out of the Bing translator HTML page via regex -- more fragile than Google's or MyMemory's straightforward query-parameter endpoints, with marginal reliability gain given two providers already exist.
- **MyMemory** -- added. An officially documented public API that explicitly allows direct browser CORS requests with no key (unlike Google's unofficial path). Has a daily quota (~1,000-5,000 words per anonymous IP), acceptable as a fallback.

**Implementation.** `liveTranslateRuToEn()` now tries providers in sequence: Google first (as before), MyMemory only if Google fails. Returns `null` (triggering the existing "translation unavailable" UI message, no crash) only if BOTH providers fail. Tested with three logic-level scenarios: Google succeeds (MyMemory never called), Google fails and MyMemory picks up, both fail (graceful null) -- all confirmed correct.

Direct network testing of MyMemory from the dev container wasn't possible (domain not in this environment's allowlist, same constraint as Google earlier) -- the real response format was separately confirmed via `web_fetch` before implementation, and the parsing code was tested against mocked data matching that confirmed format.

`docs/DECISIONS.md` (Decision 10) updated to describe all four search tiers (including the official-group tier from the prior session) and the two-provider translation chain, with explicit reasoning for why DeepL/Yandex/Bing didn't work out -- so a future session doesn't re-investigate the same ground from scratch.

Verified with `npm run build`: succeeds, main chunk 683.87KB (modest growth).

**Files changed**: `src/data/hsCodes.js`, `docs/DECISIONS.md`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — ErrorBoundary + 404 page (#13); Legal.jsx overclaims and false present-tense data-storage claims fixed (#10)

**#13 closed.** Added `ErrorBoundary` (`src/components/ErrorBoundary.jsx`, a class component -- React's documented requirement, function components cannot catch render errors via hooks) and a 404 page (`src/pages/NotFound.jsx`). `ErrorBoundary` wraps the whole app in `App.jsx`; `NotFound` is wired as the wildcard route inside the main layout. This is direct protection against a repeat of the session-6 incident (an unhandled error in Marketplace.jsx crashed the entire platform with a black screen, no message) -- a similar error now shows a clear screen with a way back to the homepage instead.

**#10 closed.** `Legal.jsx` (the ToS) contained several present-tense claims about things that don't exist:
- "ИИ-системой Платформы" (the platform's "AI system") for the deposit-rate formula -- renamed to "тарифом Платформы" (the platform's tariff), matching a rename already made in the code in an earlier session, which the ToS text hadn't caught up with
- "ИИ-система Платформы автоматически проверяет каждую сделку" (AI system automatically checks every transaction) for sanctions compliance -- rewritten honestly to describe what actually runs (keyword screening for prohibited/export-controlled categories at product publication), dropping both the "AI" framing and the "every transaction" overclaim
- The entire "Защита данных" (data protection) section described data collection/storage and server infrastructure as current reality ("Данные хранятся на серверах в юрисдикции участника" -- data is stored on servers) -- there is no backend at all, nothing is transmitted or stored beyond the user's browser. Added an explicit "Текущий статус (демо-версия)" disclosure at the top of the section, converted the remaining bullets to future tense ("будет собирать", "запланировано") describing the production plan rather than current behavior

Verified with `npm run build`: succeeds, main chunk 683.41KB (modest growth from two small new components).

**Files changed**: `src/components/ErrorBoundary.jsx` (new), `src/pages/NotFound.jsx` (new), `src/App.jsx`, `src/pages/Legal.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Official Russian ТН ВЭД group names (96 groups) added as the most authoritative search tier

Founder flagged a real accuracy problem: Russian-language search sometimes surfaced wrong matches (e.g. searching "жемчуг"/pearl could surface tapioca, because the English dataset describes tapioca pearls using the word "pearls" too). Founder asked for backup translators and much broader dictionary coverage.

**Approach, agreed step-by-step with the founder.** Rather than machine-translating all 5,613 entries of the international dataset (real risk of a translation error per entry) or manually collecting all 5,613 entries from an official source (not feasible in any single session -- would require thousands of page fetches), the **top level** was collected: all 96 official Russian товарная группа names (2-digit group level) from classifikators.ru, which references the official Decision of the Eurasian Economic Commission Council No. 80 of 14.09.2021. These are genuine official Russian names, not a translation -- so they're checked before the dictionary, as the most trustworthy tier.

**Search now has four tiers instead of three:**
1. Direct numeric code -- unchanged
2. **New.** Official ТН ВЭД group name match (96 groups) -- if the query matches an official group name, results are immediately scoped to that group's code prefix -- precise, no translation risk
3. Local dictionary (459 terms) -- as before, for specific products that don't match a whole group's name
4. Live automatic translation (unofficial Google endpoint) -- as before, last resort

**Confirmed accuracy improvement.** "Олово" (tin) now returns the precise `800110 - Tin; unwrought` (group 80, "Tin and articles thereof") instead of dictionary-driven near-misses. Same improvement for "оружие" (weapons), "обувь" (footwear), "мебель" (furniture), "часы" (clocks/watches), "удобрения" (fertilizers), "кофе" (coffee) -- all now resolve through the official group tier first.

**Honest limitation, recorded for future sessions.** Only the top level was collected (96 groups out of 5,613 total entries) -- deeper levels (4-digit headings, ~1,200 entries; 6-digit specifics, all 5,613) remain for gradual collection in future sessions, as explicitly agreed with the founder (incrementally, not all at once). Specific products within a group still resolve via the dictionary/live-translate tiers until that deeper level exists.

**Backup translators -- requested, not implemented this session.** Founder asked for alternative translators (DeepL and others) as a fallback if Google is unavailable. This remains an open task; the system currently has only one live-translation provider (Google's unofficial endpoint), behind the now-more-reliable dictionary and official-group tiers.

Verified with `npm run build`: succeeds, main chunk 679.74KB (modest growth), new `tnvedGroupsRu.json` (96 groups, 14KB) is a separate lazy-loaded chunk (13.48KB built), not preloaded -- same discipline as `hsCodesRaw.json`.

**Files changed**: `src/data/tnvedGroupsRu.json` (new), `src/data/hsCodes.js`, `src/pages/DocumentCenter.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — TNVED search: dictionary expanded to 459 terms, live translation fallback with multi-candidate selection

Founder proposed: Russian query → translate → search English nomenclature → if ambiguous, show multiple matches for the user to pick from. Also explicitly approved using a free external translator and expanding the dictionary toward 500+ terms, accepting this moves to a real backend eventually.

**Dictionary expansion (150 → 459 terms).** Expanded systematically across all 21 HS sections (live animals, plants, fats, foodstuffs, minerals, chemicals, plastics, leather, wood, paper, textiles, footwear, stone/ceramics, jewellery, metals, machinery/electronics, vehicles, optics/medical/music, weapons, miscellaneous, art) — terms derived from real category headers in the dataset itself, not invented arbitrarily.

**Live translation fallback.** When the dictionary has no match, the search now falls back to the free, unofficial `translate.googleapis.com` endpoint (no API key, no server needed — fits the current no-backend demo phase). This is recorded as an explicit architectural tradeoff in `docs/DECISIONS.md` (Decision 10): the endpoint is undocumented and unsupported by Google, could be blocked or changed without notice, so it's used only as a fallback after the (instant, no-network) dictionary, and any network error degrades gracefully (clear "translation unavailable" message, no crash).

**Multi-candidate selection — exactly what the founder asked for.** When the live translate path is used, the UI shows the translated query text explicitly ("Translated as 'pearls'... pick the right match below") and lists all matches — the platform never silently picks one result; the user chooses which code fits their actual product.

**Forward-looking constraint, documented.** DECISIONS.md now states explicitly: once a real backend exists (MVP/Beta per Roadmap), this unofficial endpoint should be replaced with an official paid translation API or self-hosted LibreTranslate — both need server infrastructure this phase doesn't have. Marked as a demo-phase-only tradeoff, not permanent architecture.

Verified: main chunk grew modestly to 679.20KB (dictionary expansion), the ~900KB HS dataset remains a separate lazy-loaded chunk with no preload hint. Key test queries (pump, tin, coffee, banana, fertiliser, pig/pigs, locomotive, pearl, direct code 8471) return relevant results — including a useful illustration of why multi-candidate matters: "жемчуг" (pearl) surfaces tapioca described as "pearls" in food-industry language as its first match (a genuine dataset match, not the intended product) alongside the correct glass-imitation-pearl code further down — exactly the ambiguity this UI is designed to let the user resolve themselves.

**Files changed**: `src/data/hsCodes.js`, `src/pages/DocumentCenter.jsx`, `docs/DECISIONS.md`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Real HS code (ТН ВЭД) search across the full international nomenclature, replacing the 6-item hardcoded list

Founder reported: the TNVED search in Document Center only found 6 hardcoded products (wheat, cement, rebar, polyethylene, sunflower oil, plus one textile item), even though the surrounding UI text claimed "AI will find the right code" for any product.

**Fix.** Downloaded and integrated the real official international Harmonized System dataset (source: `datasets/harmonized-system` on GitHub, data from UN Comtrade, open ODC PDDL license) — 5,613 codes at the 6-digit level, the base of customs codes used across all CIS countries. Search now works across this full nomenclature instead of 6 items.

**Bilingual handling.** Official descriptions in the dataset are in English (the international standard's language). The platform does not machine-translate ~5,600 entries itself — translating specialized customs terminology carries real risk of a substantive error that leads to misclassification (legally meaningful, since the wrong code means the wrong duty/tariff). Instead, a curated dictionary (~150 common product categories — grains, metals, textiles, petrochemicals, electronics, food, vehicles, construction materials, etc.) translates Russian search terms into English keywords for the official dataset. Direct code search and English-language search work without dictionary limits.

**Honest UI disclosure.** The platform doesn't claim the matched code is the final word for customs purposes — explicit warning text states that final national-tariff classification should be confirmed by a customs declarant/broker. Also removed the fabricated "standard specifications" (moisture %, tensile strength, etc.) that were auto-filled for the old 6 items — the real dataset contains no technical specs, only code and name, so that field is now honestly left blank for manual entry.

**Bundle-size protection.** The dataset is ~900KB as a file. It's lazy-loaded — fetched only when the user opens the TNVED search tab, not on every page load, which would otherwise double the platform's initial load size and undo the earlier bundle-size work (see 🔴#4 entries above). Confirmed: main chunk stays at 666.98KB, dataset is a separate 859.93KB chunk with no preload hint.

**Search-quality bug found and fixed mid-implementation.** The first version matched translated terms as arbitrary substrings, causing false positives from short translations — "tin" (олово) matched inside "whitings", "car" (автомобиль) matched inside "carcasses" (meat). Fixed with word-boundary matching, with a stricter full-word-boundary rule specifically for short (3-4 character) terms to prevent mid-word false matches while still allowing plurals/suffixes for longer terms (e.g. "pump" matching inside "Pumps").

Verified: key test queries (pump, tin, coffee, banana, fertiliser, direct code 8471) return relevant top results. Known limitation, disclosed in the UI: the dictionary covers common product categories, not all 5,613 entries — niche items may need an English term or direct code.

**Files changed**: `src/data/hsCodesRaw.json` (new), `src/data/hsCodes.js` (new), `src/pages/DocumentCenter.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Critical regression fixed: Marketplace crashed on click (canBuy scope bug introduced in this session's earlier #6 fix)

Founder reported: the marketplace page failed to load — black screen on click, platform completely unresponsive.

**Root cause (a mistake introduced earlier in this same session, not a pre-existing bug).** When `canBuy`/`canSell` were migrated off module-scope `localStorage` reads onto the reactive `useAccountType()` hook (closing 🟠#6), the values became scoped to the `Marketplace()` component only. Two sibling component functions in the same file — `ProductCard` (the product list card) and `ProductModal` (the detail view opened on click) — kept referencing `canBuy` directly, which no longer existed in their scope. This worked by accident before the #6 fix (the variable was file-global); after the fix, it threw an unhandled `ReferenceError` on every click, and with no ErrorBoundary in place (see open item #13), that crashed the entire React tree — hence the black screen.

Confirmed via a direct server-side render of the component in Node (bypassing the browser) — reproduced `canBuy is not defined` exactly at the `ProductCard` usage site. Fixed by passing `canBuy` as an explicit prop from the parent to both `ProductCard` and `ProductModal` instead of relying on scope. Re-verified with server-side render for both buyer and seller account types.

**Process lesson for future sessions:** when moving any variable from module/file scope onto a component-local hook, explicitly check whether other component functions in the same file read it directly rather than via props — these connections fail silently until the broken path is actually exercised, not at build time.

Verified with `npm run build`: succeeds, bundle unaffected.

**Files changed**: `src/pages/Marketplace.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Mobile layout (#9) and profile persistence (#19)

**#9 closed.** Added a collapsible mobile drawer for screens ≤900px: a fixed top bar with logo and a hamburger button, the sidebar now slides in as an overlay instead of always occupying space, with a backdrop and close button. Desktop (>900px) behavior is unchanged — purely additive via a media query in `index.css`. Deleted the dead `App.css` (re-confirmed it was never imported anywhere).

**#19 closed.** Profile settings (contract preference, template acceptance, applicable law) now persist to `localStorage` and reload automatically on return visits. Previously the "Сохранить" button only toggled a 2-second visual confirmation with no actual persistence — selections were lost on every page refresh.

Verified with `npm run build`: succeeds, main chunk 660.63KB (small increase from the mobile CSS, bundle optimization from 🔴#4 unaffected).

**Files changed**: `src/components/Sidebar.jsx`, `src/App.jsx`, `src/index.css`, `src/App.css` (deleted), `src/pages/Profile.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Sanctions/export-control screening added (founder-reported critical gap); seller permission bug fixed (#11); dead code removed (#8, #21); roadmap dates updated (#12)

**Sanctions screening — the headline fix.** The founder personally tested the platform by attempting to create a tender and list a marketplace product with clearly sanctioned/export-controlled content. Neither was blocked, and no warning appeared — confirming that `sanctions: false` and `aiCheck.sanctionsOk: true` in `marketplace.js` are static demo values with zero connection to actual user input. This had already been flagged as a known limitation in `BUSINESS_RULES.md` (Sanctions list absence row, and the Legal.jsx sanctions-claim line) but never actually fixed. Left unaddressed, this is not just a missing feature — it is a real path for the platform itself to become a target of sanctions enforcement once it handles real trade.

Created `src/utils/sanctionsScreening.js`, a single module (`screenForSanctions()`) shared by both `Marketplace.jsx` and `CreateTender.jsx` rather than duplicated. It implements an honest two-tier model rather than overclaiming what keyword-matching can do:

- **Hard block**: unambiguous categories (weapons, military equipment, nuclear/chemical/biological materials) that are prohibited from civilian B2B trade under every major control regime without exception. Publication is fully disabled — no override exists in the UI.
- **Review required**: dual-use categories (mapped to the Wassenaar Arrangement / EU Regulation 2021/821 Annex I category structure — microelectronics, telecom, navigation, certain chemicals, aerospace components, military-spec metals, higher-scrutiny petroleum products). Publication is blocked until the user explicitly checks a box confirming they've reviewed the item themselves — the platform states it requires manual review, not that the item is "clear."

Both forms now show explicit, plain-language warning UI and disable their publish buttons accordingly. This is explicitly **not** a real integration with OFAC/EU/UN sanctions databases or export control classification (ECCN / EU Annex I) — that requires a real backend and database and remains correctly scoped to the Beta phase in `Roadmap.jsx`. What this closes is the much more basic and more urgent gap: there was previously *no check of any kind* on user-entered text. `docs/BUSINESS_RULES.md` updated in two places to draw this distinction precisely, so the existing honest disclosure isn't accidentally overwritten with a false "fully solved" claim.

**Found and fixed a Rules of Hooks bug while wiring this in.** The first pass at `CreateTender.jsx` placed a new `useState` call after the component's existing conditional `return` (added moments earlier for the seller-permission fix below) — meaning seller-type accounts would execute fewer hook calls than buyer-type accounts on the same component, a Rules of Hooks violation that can cause React state corruption or runtime errors. Fixed by moving all `useState` calls to the top of the component, before any conditional return.

**#11 closed.** The "Создать тендер" button was visible to all account types, including sellers, who are not permitted to create tenders. Fixed in two places: `Tenders.jsx` now hides the button when `!canBuy` (via `useAccountType()`); `CreateTender.jsx` now also guards the route itself — a seller navigating directly to `/create` by URL sees an explicit "not available for your account type" screen instead of the form.

**#8 closed.** Removed the dead `resolveContractLanguage` function from `LegalAI.jsx` (lines 14-64, including its explanatory comment) — re-confirmed zero call sites before deletion. The working version in `contractData.js` is unaffected.

**#21 closed.** Deleted `src/data/accountState.js` — confirmed zero imports anywhere in the codebase.

**#12 closed.** Updated stale dates in `Roadmap.jsx`: MVP moved from "Q3 2025" to "Q3 2026", Beta from "Q4 2025" to "Q1 2027", Production from "2026" to "2027". Phase contents unchanged, only timing.

Verified with `npm run build`: succeeds, main chunk grew modestly (651.62KB → 659.33KB, from the new screening module) — the 🔴#4 bundle optimization remains intact.

**Files changed**: `src/utils/sanctionsScreening.js` (new), `src/pages/Marketplace.jsx`, `src/pages/CreateTender.jsx`, `src/pages/Tenders.jsx`, `src/pages/LegalAI.jsx`, `src/pages/Roadmap.jsx`, `src/data/accountState.js` (deleted), `docs/BUSINESS_RULES.md`, `docs/SESSION_STATE.md`.

---


## 2026-06-19 — Merged isolated-session work into the real repository (commit cfd0253); fixed module-scope localStorage reads (🟠 #6)

**Part 1 — repository merge.** The previous three changelog entries (index.html recovery, demo disclaimers, AI-label rename + watermarks) were produced in a separate sandboxed session that had no git access to GitHub (the handover archive contained no `.git/` history, and direct token-based git remote setup was declined for security reasons in that session). The founder exported that session's work as a unified diff (`diff -ruN`) against the original handover snapshot. The diff's file headers pointed at two different temporary directory paths, which made it inapplicable via standard `git apply`/`patch` without manual correction; it was split into 14 per-file blocks, headers rewritten to relative paths, and applied cleanly via `patch -p0` with zero conflicts. Verified with a real `npm run build` (the previous session could only verify syntax, not a full build, due to the missing `index.html`). Committed and pushed as `cfd0253`. `docs/SESSION_STATE.md` was also consolidated — the three incremental "step" sections from the isolated session were merged into one clean current-state snapshot, with the original step-by-step detail preserved verbatim in the history section rather than discarded.

**Part 2 — 🟠 #6 closed.** `accountType` was previously read from `localStorage` at module scope in `mock.js`, `Marketplace.jsx`, and `Dashboard.jsx` — meaning the value was computed once when the module first loaded and never updated again without a full page reload. `AccountSelect.jsx` worked around this with `navigate('/')` followed by `window.location.reload()`, plus an unused `window.dispatchEvent(new Event('glorix_account_changed'))` with no subscribers.

Created `src/context/AccountContext.jsx` — a single React Context exposing `useAccountType()` (`accountType`, `canBuy`, `canSell`, `setAccountType()`). All consumers now read account type reactively instead of from a stale module-level constant:
- `mock.js`: `currentUser` (a static export) replaced with `getCurrentUser(accountType)`, a pure function with no import-time side effects
- `Marketplace.jsx`, `Dashboard.jsx`: module-scope `accountType`/`canBuy`/`canSell` removed, now read via the hook inside the component
- `DepositTrust.jsx`, `Profile.jsx`: switched from importing the static `currentUser` to calling `getCurrentUser(accountType)`
- `Sidebar.jsx`: direct `localStorage.getItem` replaced with the hook
- `AccountSelect.jsx`: **`window.location.reload()` removed** — switching accounts now calls `setAccountType()` and updates every subscribed component instantly, with no page reload
- `DocumentCenter.jsx`: found and fixed an adjacent duplication while making this change — `generateKP()` hardcoded company names per account type directly in the function instead of reusing the single source of truth (`users` in `mock.js`); now calls `getCurrentUser(accountType).name`
- `App.jsx`: wrapped in `<AccountProvider>`

Verified with `npm run build`: succeeds, main chunk size unchanged (651.62KB — the 🔴 #4 bundle optimization is unaffected), no `modulepreload` hints on the heavy chunks.

**Files changed**: `src/context/AccountContext.jsx` (new), `src/data/mock.js`, `src/pages/Marketplace.jsx`, `src/pages/Dashboard.jsx`, `src/pages/DepositTrust.jsx`, `src/pages/Profile.jsx`, `src/pages/AccountSelect.jsx`, `src/pages/DocumentCenter.jsx`, `src/components/Sidebar.jsx`, `src/App.jsx`, `docs/SESSION_STATE.md`.

---


## 2026-06-19 — index.html recovered, bundle size measured: 🔴 #4 fully closed (commit — see SESSION_STATE.md)

`index.html` was missing from the handover snapshot used to start this session (flagged as a blocker in the previous two changelog entries). The founder supplied the actual original file content directly, confirmed as the real source rather than a reconstruction. It contains a Google Fonts CDN `<link>` (Inter + Space Grotesk via `fonts.googleapis.com`), which confirms open audit item 🟡 #15 (Google Fonts blocked in Russia) as a real, present issue rather than a hypothetical one — not addressed in this entry, left as its own open item.

With `index.html` in place, `npm run build` succeeds. Measured the actual effect of the lazy-loading change made earlier in this session (previously logged as "not yet measured"):

- **Before** (per original audit): 1.76MB single bundle.
- **After**: the built `dist/index.html` loads only `index-DHuX0M06.js` (652KB raw, 171.25KB gzipped) plus a 2.65KB stylesheet on initial visit — confirmed by inspecting the generated HTML directly; no `modulepreload` hints point at the heavy chunks. `robotoFont.js` (734KB), jsPDF (360KB), `html2canvas` (200KB, a docx dependency), the `docx` library itself (151KB), and `purify.es` (26KB) — roughly 1.47MB combined — now load only when a user clicks a PDF/Word export button, not on page load.

This closes 🔴 #4 fully (previously logged as partial, since the measurement was blocked).

**Files changed**: `index.html` (new), `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Inline demo disclaimers in CreateTender / Marketplace / AccountVerification (commit — see SESSION_STATE.md)

Closed 🔴 #2 from the open audit list.

Added inline gold-styled "⚠ Демо-режим" notices (same visual treatment already used for the contract disclaimer text) at the point of action in each of the three flagged flows:

- **`CreateTender.jsx`** — above the "Опубликовать тендер" button.
- **`Marketplace.jsx`** — three locations: the buy-confirmation success screen ("Заказ размещён"), the payment step right before "Оплатить", and the seller's list-product success screen ("Товар размещён!"). The existing `alert('... (демо)')` was left in place but is no longer the only signal — the inline block now carries the disclosure since a dismissible browser alert is easy to miss.
- **`AccountVerification.jsx`** — near the required-documents upload checklist (clarifying the "Загрузить" buttons don't accept real files) and near "Активировать аккаунт продавца". This flow sits next to genuine legal text about administrative/criminal liability for unlicensed trading in most CIS countries, which made the missing disclaimer here the most consequential of the three.

**Noted but not fixed in this pass**: confirmed while editing `Marketplace.jsx` that `localStorage.getItem('glorix_account_type')` is read at module scope (line 4, before component definition) — exactly the pattern described in open item 🟠 #6. Left untouched, out of scope for this fix; flagged as the next logical candidate.

**Files changed**: `src/pages/CreateTender.jsx`, `src/pages/Marketplace.jsx`, `src/pages/AccountVerification.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-19 — Audit fixes: misleading AI label, draft watermarks, lazy-loaded exports, calcDeposit validation (commit — see SESSION_STATE.md)

Closed four items from the open audit list in `SESSION_STATE.md`.

**🔴 #1 — Misleading "Ставка ИИ" label.** Renamed to "Ставка депозита" in `Tenders.jsx`, `DepositTrust.jsx`, `CreateTender.jsx`, and the matching phrase in `RelationshipManager.jsx`. The underlying value is a tiered linear interpolation in `calcDeposit()` (`mock.js`), not an AI computation — the label now matches what the code actually does. `Dashboard.jsx`'s "ИИ-анализ" text was left untouched: it refers to the separate offer-comparison mock (`aiAnalysis`), a genuinely distinct feature, not the same mislabeling.

**🔴 #3 — No draft watermark on generated contracts.** PDF (`contractPdfExport.js`): added a diagonal "ПРОЕКТ / DRAFT" watermark on every page via jsPDF's `GState`/`saveGraphicsState` opacity API (verified present in installed jspdf 4.2.1). DOCX (`contractDocxExport.js`): the `docx` v9.7.1 library has no diagonal page-watermark API (verified directly against the package), so a prominent gold banner row — "ПРОЕКТ / DRAFT — документ не подписан и не имеет юридической силы" — was added at the top of the document body instead. Same protective intent, achieved with the technique each library actually supports.

**🔴 #4 (partial) — 1.76MB bundle, fonts/jspdf/docx loaded eagerly.** `downloadTextAsPdf`, `downloadTextAsDocx`, `downloadContractAsPdf`, `downloadContractAsDocx` were statically imported at module top-level in `Marketplace.jsx`, `DocumentCenter.jsx`, `LegalAI.jsx` despite only being called inside `onClick` handlers. Converted all four call sites across the three files to dynamic `import()` inside the click handler. This removes jsPDF, `docx`, and the two embedded fonts (`robotoFont.js` 434KB + `ptSerifFont.js` 119KB) from the initial bundle of every page that has an export button — they now load only when the user actually clicks export. **Not yet measured**: the project's `index.html` is missing from the current working tree (not present in the handover snapshot used to start this session), so `npm run build` fails with `UNRESOLVED_ENTRY` and the new bundle size could not be verified end-to-end. Flagged in `SESSION_STATE.md` as an open blocker — needs either the original `index.html` recovered from GitHub history or an explicit decision on its contents (it likely contained the Google Fonts `<link>` tag relevant to audit item 🟡 #15, and writing a new one blind risks inventing content for that exact item).

**🟠 #7 — `calcDeposit()` had no input validation.** Added: any non-finite or negative `amount` now returns `{ rate: 0, deposit: 0 }` instead of propagating `NaN` through the tiered-rate math.

**Explicitly not touched, with reason:**
- 🟡 #18 (Ukraine flag in `aiAnalysis` mock) — left untouched. This is a content judgment call with geopolitical sensitivity, not a bug; requires an explicit founder decision rather than being folded silently into an unrelated fix.
- 🔴 #5 (escrow licensing) — legal question, out of scope for a code session.

**Files changed**: `src/data/mock.js`, `src/pages/Tenders.jsx`, `src/pages/DepositTrust.jsx`, `src/pages/CreateTender.jsx`, `src/pages/RelationshipManager.jsx`, `src/utils/contractPdfExport.js`, `src/utils/contractDocxExport.js`, `src/pages/Marketplace.jsx`, `src/pages/DocumentCenter.jsx`, `src/pages/LegalAI.jsx`, `docs/SESSION_STATE.md`.

---

## 2026-06-18 — Full project documentation system (commit `9fbfecd`)

Created 13-file documentation system in `docs/` as the single source of truth and durable continuity mechanism for future sessions. Built from a complete read-through of the entire codebase (every page, every data file, `App.jsx`, `package.json`, `vercel.json`, `vite.config.js`, full git history). Covers architecture, business rules, API reference, database schema, AI agents (honest inventory), security, deployment, integrations, decisions (with full rationale), roadmap, and this changelog. Replaces reliance on chat history for project continuity.

**Files created**: All 13 files in `docs/`.

---

## 2026-06-18 — Bilingual two-column contract redesign — screen/PDF/Word (commit `de7db0b`)

Major architectural addition to the document generation system (Pipeline B).

**Research**: Per-country contract-language law research for all 11 CIS countries, with verified legal source citations stored in `legalSources.js` → `contractLanguage` field per country. Full verified English translation of all 19 contract articles produced (`research/contract_en_translation_draft.md`).

**New language resolver**: `resolveContractLanguage(sellerCountry, buyerCountry)` in `contractData.js`. Decision tree: cross-border → always bilingual RU/EN; same-country → follows actual domestic law; Kazakhstan → bilingual KK+RU mandatory.

**New structured data model**: `buildContractStructured(f)` returns a typed object (18 articles, preamble, appendices, disclaimer, language metadata) consumed by all three renderers identically, eliminating screen/PDF/Word drift.

**Three new renderers**: `ContractTableView` component in `LegalAI.jsx` (screen), `contractPdfExport.js` (PDF with jsPDF hand-drawn table + pagination), `contractDocxExport.js` (Word with `docx` library Table).

**Safety mechanism**: `resolveColumnText(ruText, enText, lang)` helper — for any language other than `ru`/`en`, renders explicit certified-translation-required placeholder.

**Bug found and fixed**: All three renderers initially assumed column 1 = Russian, silently mislabeling Russian text as Kazakh for Kazakhstan contracts. Fixed by applying `resolveColumnText` independently per column based on actual resolved language, never by position. Verified by rendering real PDFs with `pdftoppm` and Word via LibreOffice headless conversion.

**PDF cosmetic fix**: `pdfSafeLangName()` map in `contractPdfExport.js` substitutes Russian-script column headers for languages whose scripts PT Serif lacks (Kazakh `Қ`, Tajik `ҷ/ӣ`, Georgian). Column headers only — not legal text.

**Known limitation accepted**: TJ, GE, AZ, KG, TM domestic-mono contracts render entirely as placeholders — no verified translations available. Founder accepted explicitly: "Оставить как есть — это demo."

**Files changed**: `src/data/legalSources.js`, `src/data/contractData.js` (new), `src/pages/LegalAI.jsx`, `src/utils/contractPdfExport.js` (new), `src/utils/contractDocxExport.js` (new), `research/contract_en_translation_draft.md` (new), `research/language_law_findings.md` (new).

---

## Earlier History (Reconstructed from Git Log)

### 2025 — `ec51eee` — Contract/Specification fixes + Document Center cross-link

Removed incorrect tax clause from contract template. Fixed date bug in Specification (Appendix №1) document. Added navigation cross-link between the Specification generator and Document Center.

### 2025 — `44d228a` — Verified national arbitration institutions for all 11 CIS countries

All named national arbitration bodies in the contract generator verified against real sources and corrected. Previously some entries had unverified or generic institution names — each is now the actual named body per that country's arbitration law.

### 2025 — `4a4342f` — Word (.docx) export added

Added `.docx` export alongside existing PDF export, using the `docx` library. This was the first iteration of Pipeline A's Word renderer (`docxExport.js`).

### 2025 — `7fa05c4` — Branded PDF letterhead

Professional PDF document design: GLORIX letterhead, logo treatment (GLO in text color, RIX in accent), PT Serif embedded font, page numbers, accent rule. Applied to both Pipeline A (`pdfExport.js`) and later Pipeline B.

### 2025 — `c165230` — Arbitration and law based on actual party countries

Fixed: applicable law and arbitration institution now derived from actual seller/buyer country data rather than a hardcoded default.

### 2025 — `86f680f` — Real PDF with embedded Cyrillic font (Roboto)

Replaced initial PDF approach (no font embedding, broken Cyrillic) with embedded Roboto font via base64 in `robotoFont.js`. PT Serif added later for legal documents.

### 2025 — `6dd03ba` — Vercel.json SPA routing fix

Added `vercel.json` with the `/(.*) → /index.html` rewrite rule. Fixes 404 on direct URL access or browser refresh on any deep-link route.

### 2025 — `228edd6` — Scrollable sidebar navigation

Fixed Sidebar overflow issue — nav items were getting cut off on shorter screens.

### 2025 — `3c054fd` — GLORIX v14: LegalAI full 20-article contract

Full 20-article (later 18-article after refactoring) contract in the Legal AI module, with proper preamble and article structure. First comprehensive contract template.

### 2025 — `d8900be` — GLORIX v13: Mirror penalties + CISG/English/Swiss law options

Added mirror-penalty standard (symmetric 0.1%/day, 10% cap, bilateral non-delivery penalty). Added international law selection options (CISG, English law, Swiss law) for cross-border contracts. Added TFD (real-contract) analysis that surfaced the original asymmetric penalty terms this standard fixes.

### 2025 — `dab7ce7` — GLORIX v12: Legal AI with 11-country CIS law database

11 CIS countries' legal source databases in `legalSources.js`. Article-based document generator for contract, oferta/offer, and claim document types. Foundation of the Legal AI module.

### 2025 — `ebb4146` — GLORIX v11: Excel paste, TN VED search, КП table format

Fixed: sellers couldn't create tenders (permission bug). Added Excel paste functionality and TN VED code search in Document Center. Reformatted commercial offer (КП) output as a structured table.

### 2025 — `5c9c0da` — GLORIX v10: Buyer/seller permission fixes + AI КП generator

Fixed buyer/seller permission gating. Added "Add product" form with AI-labeled КП generator (the first scripted-template document generator).

### 2025 — `b2afdb5` — GLORIX v9: Three real separate accounts

Three distinct demo accounts (buyer: Tashkent Agro LLC, seller: FerganaTex Export, both: BekabadMetal Group), each with own nav config, mock company profile, and trust score.

### 2025 — `0981db5` — GLORIX v8: Account types, Document Center, origin certificates

Three account types (buyer/seller/both) with KYC requirements. Document Center page. License verification flow. Certificate of origin types (CT-1, Form A, EUR.1, CT-EZ).

### 2025 — `af9570b` — GLORIX v7: Relationship Manager, Analytics, Price Alerts

Relationship Manager page (simulated). Analytics Dashboard (static). Price alerts concept.

### 2025 — `b1a2a68` — GLORIX v6: Onboarding, Legal ToS, Support/FAQ, Roadmap

5-step onboarding wizard. Platform Terms of Service / Oferta draft (`Legal.jsx`). Support + FAQ page. Roadmap and competitive analysis page. ⚠ ДЕМО badge on Sidebar.

### 2025 — `99f1a0b` — GLORIX v5: RFI working buttons, anonymous community chat, AI bot replies

RFI module: working "View answers" modal, anonymous community chat, first AI-bot reply simulation.

### 2025 — `5aa6f5a` — GLORIX v4: Marketplace with photos/specs/reviews, AI Bots simulation

Full Marketplace with product photos, grouped specs, reviews, `calcMarketplaceFee()`. AI Bots page with scripted scenario simulation.

### 2025 — `c5c1391` — GLORIX v3: CIPS Scorecard, ESG, RFI, Anti-Fraud, KPI

Supplier Scorecard with CIPS 10C / ESG / KPI / Anti-Fraud tabs. RFI module (initial). Full `cips.js` data model.
