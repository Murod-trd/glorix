# GLORIX — Master Project Context

This document is the single entry point for understanding the GLORIX platform. Read this first; it links out to the other eleven documents in this `docs/` folder, each covering one dimension of the system in depth. All documents in this folder are kept in sync with the actual code in this repository — if something here ever disagrees with the code, the code is correct and this file is stale and should be fixed.

## What GLORIX is

GLORIX is a B2B trade platform concept for the CIS region (Uzbekistan, Kazakhstan, Russia, Azerbaijan, Georgia, Tajikistan, Kyrgyzstan, Turkmenistan, and neighboring markets). It lets verified companies run tenders, browse a wholesale marketplace, evaluate suppliers against procurement standards, and generate legal trade documents, with an escrow-style deposit mechanism intended to reduce fraud and a trust-score system intended to reward reliable counterparties.

The founder is Murod, a non-technical founder; his co-founder Нурбек is a procurement domain expert. The product's conceptual backbone is the CIPS (Chartered Institute of Procurement & Supply) 13-stage procurement cycle, and several modules (RFI, Supplier Scorecard 10C, ESG, KPI tracking) are deliberately modeled on CIPS methodology to give the platform credibility with procurement professionals.

## What GLORIX currently is, technically — read this before anything else

**This is a frontend-only demo/prototype.** There is no backend server, no database, no real authentication, no real payment or escrow rail, and no real AI/LLM integration anywhere in the running application. Every "AI" feature in the product (AI-Bots, the RFI community chatbot, the Support chat, the Relationship Manager chat, AI document drafting) is either a hardcoded scripted sequence with `setTimeout` delays or a `Math.random()` pick from a handful of pre-written response strings. All data (tenders, products, suppliers, users) lives in static JavaScript files under `src/data/` and is the same for every visitor; nothing persists except one localStorage key that remembers which of three demo accounts you last selected.

This is not a criticism of the work — it is an accurate, necessary description so that nobody (including a future session of this assistant) mistakes the demo for a production system. The product's own UI is honest about this in several places, e.g. Onboarding explicitly states real deposits and bank verification only arrive "in the production version," and the Sidebar carries a permanent "⚠ ДЕМО" badge linking to the Roadmap. See `ARCHITECTURE.md` and `AI_AGENTS.md` for the full breakdown of what is real code versus simulated behavior, and `DECISIONS.md` for why this is the correct state for the current stage.

## Document map

- **ARCHITECTURE.md** — tech stack, folder structure, routing, rendering model, what exists vs. does not exist (backend, DB, auth).
- **SYSTEM_DESIGN.md** — design tokens, visual language, component conventions, the three trade-document renderers (screen/PDF/Word).
- **BUSINESS_RULES.md** — every formula and policy: deposit tiers, marketplace fee tiers, trust score and its three zones, mirror-penalty contract standard, KYC document requirements, CIPS 10C/ESG/KPI scoring, tender lifecycle.
- **API_REFERENCE.md** — there is no backend API; this document records the client-side function signatures that stand in for one, and the API shape implied by the data model for when a real backend is built.
- **DATABASE_SCHEMA.md** — there is no database; this document records the as-is shape of the mock data in `src/data/` as the de facto schema, and flags it as the MVP-phase backend task.
- **AI_AGENTS.md** — the full, honest inventory of every "AI" surface in the product and exactly how each one is faked today, plus what real integration would require.
- **SECURITY.md** — current (near-absent) security posture, what is simulated, what real production security would require.
- **DEPLOYMENT.md** — Vercel static-site deployment, build pipeline, environment.
- **INTEGRATIONS.md** — third-party libraries in use today (`docx`, `jspdf`, `lucide-react`, `react-router-dom`) and the partner integrations named in the Roadmap as future plans (payment/escrow banks, logistics trackers, chambers of commerce, ERPs).
- **CHANGELOG.md** — dated log of material changes to the codebase, maintained going forward.
- **DECISIONS.md** — significant product and technical decisions with their rationale, including the bilingual contract language-resolution rule and the certified-translation safety mechanism.

## Repository basics

- Repo: `https://github.com/Murod-trd/glorix.git` (private), default branch `main`.
- Production: `glorix-theta.vercel.app`, auto-deploys from GitHub `main` via Vercel.
- Local working branch convention used in assistant sessions: `main-restored`, pushed to remote `main` with `git push origin main-restored:main` (fast-forward only — always `git fetch origin` and compare `git log origin/main --oneline -1` immediately before every push).
- Git identity for commits made in assistant sessions: `murodakbarov40@gmail.com`, GitHub account `Murod-trd`.

## Working agreements for this project (from the founder)

- **No process narration in chat for GLORIX work.** Only final results or genuine blocking questions belong in the conversation; planning, debugging commentary, and step-by-step narration should happen silently.
- **Zero tolerance for invented legal or tax content.** Every legal reference (arbitration body, civil code article, tax rule, named institution) must be real and verified, typically via web search. If a translation or legal claim cannot be verified, the system must show an explicit placeholder requiring professional review rather than generate unverified text. See the Kazakh-language certified-translation mechanism in `DECISIONS.md` and `BUSINESS_RULES.md` for the canonical example of this principle in code.
- **Standard git safety workflow** before every push: fetch origin, compare against the last known `origin/main` commit, only fast-forward.
- **Task complexity is classified before execution** (Level 1 simple text/UI edits, Level 2 moderate feature work touching a few modules, Level 3 critical work touching architecture, security, data, deployment, or multi-module integrations) and the depth of analysis is calibrated accordingly — minimal for Level 1, full cross-module verification for Level 3.
- **This documentation set is the durable source of truth between sessions.** The assistant has no memory of past conversations beyond Anthropic's separate memory-fact system and whatever is actually committed to this repository. These twelve files, kept current, are what makes continuity possible — not narrative recall of old chats.
