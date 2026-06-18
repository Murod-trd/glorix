# GLORIX Procurement OS — Master Project Context

**Status**: Frontend-only prototype (Demo phase) | **Production URL**: glorix-theta.vercel.app | **Repo**: github.com/Murod-trd/glorix (private)

---

## Mission Statement

GLORIX is the only B2B procurement platform for the CIS region offering anonymous tenders, AI-driven TCO analysis, full CIPS-compatible procurement cycle, escrow-based fraud prevention, and bilingual legal document generation in a single integrated system.

The three core pains GLORIX solves:
1. **Corruption in tenders** → anonymous bidding until close
2. **Hidden costs** → AI TCO + Incoterms analysis
3. **Fraud** → company verification + escrow deposit system

---

## Founders

- **Murod** (GitHub: `Murod-trd`, email: `murodakbarov40@gmail.com`) — non-technical founder, product owner, final decision authority
- **Нурбек** — co-founder, procurement domain expert (CIPS methodology)

---

## Current Technical Reality — Read This First

**This is a frontend-only prototype.** Every item below marked ❌ or 🚧 is genuinely absent from the running application:

- ❌ No backend server or API
- ❌ No database (SQL or NoSQL)
- ❌ No real authentication (localStorage account-type string only)
- ❌ No real payments or escrow
- ❌ No real AI/LLM calls anywhere in the codebase
- ❌ No file upload backend
- ❌ No environment variables / secrets
- ✅ Fully functional React SPA with complete UI for all features
- ✅ All business logic formulas implemented client-side
- ✅ Real PDF and Word document generation (client-side, no server)
- ✅ Per-country bilingual contract system with legal language-law compliance

All "AI" features are either hardcoded scripted sequences with `setTimeout` delays or `Math.random()` picks from pre-written response arrays. The Roadmap (visible at `/roadmap`) honestly discloses this to investors/partners.

---

## Document Map

All 13 documents in `docs/` are the single source of truth. Consult before any significant change; update in the same commit after any change.

| File | Covers |
|---|---|
| `MASTER_PROJECT_CONTEXT.md` | This file — orientation, founders, current state, document map |
| `ARCHITECTURE.md` | Tech stack, folder structure, routing, what exists vs. doesn't |
| `SYSTEM_DESIGN.md` | Design tokens, visual system, document-rendering architecture |
| `BUSINESS_RULES.md` | All formulas, thresholds, policies |
| `API_REFERENCE.md` | Client-side function signatures + implied future backend API |
| `DATABASE_SCHEMA.md` | Mock data shapes as de facto current schema |
| `AI_AGENTS.md` | Every "AI" surface and how it's actually implemented |
| `SECURITY.md` | Current posture + production security requirements |
| `DEPLOYMENT.md` | Vercel pipeline, build, environment |
| `INTEGRATIONS.md` | Current npm libs + planned partner integrations |
| `DECISIONS.md` | Significant decisions with rationale |
| `ROADMAP.md` | Full 4-phase roadmap, competitive positioning, market data |
| `CHANGELOG.md` | Dated log of all material changes |

---

## Standing Rules (Founder Instructions — Non-Negotiable)

1. **Silent execution**: no process narration, progress updates, or step-by-step commentary in chat. Only final deliverables or genuine blocking questions.
2. **Zero tolerance for invented legal/tax content**: every named law, arbitration body, civil code article, or government institution must be real and verified via search. If unverifiable → show explicit placeholder.
3. **Git safety on every push**: `git fetch origin` + compare `git log origin/main --oneline -1` immediately before every push. Fast-forward only. Branch: `main-restored` pushed as `git push origin main-restored:main`.
4. **Doc-first**: consult `docs/` before any significant change; update affected docs in the same commit.
5. **No duplicate functionality**: extend/refactor existing systems. Never create parallel implementations. The only accepted exception is the two document-rendering pipelines (see `DECISIONS.md`).
6. **Conflict checks**: before any significant change, verify it does not conflict with existing architecture, business rules, or recorded decisions. If it does, explain and get explicit approval — never silently overwrite.
7. **Task complexity classification** before execution: Level 1 (text/UI edits, minimal analysis), Level 2 (feature additions, few modules), Level 3 (architecture, security, DB, payments, deployment — full cross-module validation).
8. **Leadership board mode**: evaluate every request from all roles (CEO Advisor, CPO, Project Manager, BA, Solution Architect, Frontend Lead, Backend Lead, Mobile Lead, DevOps Lead, DBA, Cybersecurity Lead, QA Lead, UI/UX Director, Finance/Business Strategy, Legal/Compliance, Data/AI Lead). Deliver single unified output.

---

## Platform Positioning

> "GLORIX — единственная B2B платформа для СНГ с прозрачными тендерами, ИИ-анализом реальной стоимости сделки и полным CIPS-совместимым закупочным циклом."

Target market: $2.1T CIS B2B e-commerce (2026), 180,000+ exporting companies across CIS. GLORIX commission 0.5–1.5% vs. 3–5% industry average.
