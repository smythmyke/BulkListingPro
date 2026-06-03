# ROADMAP — BulkListingPro

**Last updated:** 2026-06-03
**Scope:** Chrome extension (Manifest V3) + Native Host helper for bulk-uploading digital product listings to Etsy via Chrome DevTools Protocol. Credit-based pricing ($1.99–$24.99), Firebase auth, Stripe purchases. Early development, has paying customers. Converted from Phase-structured roadmap on 2026-05-27.

<!-- DASHBOARD-META
project_key: bulklisting-pro
title: "BulkListingPro"
purpose: "Chrome extension + Node native host for bulk-uploading Etsy digital product listings via CDP"
phase: "Phase 1.5 — Edit tab"
phases: ["Phase 1 — Core product", "Phase 1.5 — Edit tab", "Phase 2 — Agent SDK", "Phase 3 — SDK exploration"]
key_dates: []
-->

**Status legend:** ☐ todo · ◐ in progress · ✓ done · ⊘ blocked · ✗ dropped

> Editing rules: `C:\Projects\dashboards\project-dashboard\STRUCTURE.md`.

## ACTIVE — This Week

- ☐ EDIT-1: Tab + scraper + picker — new "Edit" tab between Upload and Research, `services/etsyShopScraper.js` reads listings index page DOM, picker hands off to editor with `_edit_mode: true`. No push automation yet.
- ◐ P1-1: Finish core listing generation + Etsy upload flow
- ◐ P1-2: Stabilize Etsy DOM selectors (see `docs/ETSY-SELECTORS.md`)

## ACTIVE — Next Two Weeks

- ☐ EDIT-2: In-place edit automation — `etsyAutomationService.editListing()` navigates to `/your/shops/me/listing-editor/edit/{ID}`, fills only `#field-translations` (Phase-1 guardrail), reuses `waitForSuccessMessage()` + pay-on-success orchestrator. Defaults to preserve current Etsy state on save. Charges 1 credit per success.
- ☐ P1-3: Validate credit system end-to-end (see `docs/CREDIT-SYSTEM.md`)
- ☐ P1-4: Publish to Chrome Web Store

## BACKLOG

### Edit tab — remaining sub-phases
- ☐ EDIT-3: Batching + auto-retry + push UX — internal 50-listing batches, "Continue next N" prompt, port upload one-retry pattern, "Continue automatically" checkbox with **300-listing hard pause** for re-confirmation.
- ☐ EDIT-4: Editor edit-mode visual cues — distinct badge/border for imported listings, destructive-overwrite confirmation when AI Generate runs against `_edit_mode: true`.
- ☐ EDIT-5: Diff-aware fill — track per-field dirty state, `editListing()` fills only modified fields, removes translations-only guardrail.

### Reliability + parity (after Edit ships)
- ☐ REL-1: Fix Pause/Stop reliability — flags only checked inside `interruptibleDelay()`; long Etsy saves (`waitForSuccessMessage` 15s loop) un-cancellable. Replace `delay()` with `interruptibleDelay()` in polling loops; add cancel checks before each CDP round-trip. Benefits Upload + Edit.
- ☐ REL-2: Add batching to Upload tab — port EDIT-3 batching pattern (50/batch, Continue-next-N, 300 hard pause) to Upload. Wait until Edit batching has shipped and validated.

### Keyword Research feature (Research tab) — scoped 2026-06-03, build deferred
Full plan + research + decisions: `memory/feature_keyword_research_tab.md`. Clone JackpotKeywords keyword logic into the existing Research tab. **Backend = HYBRID** (call JK API server-side for raw volume only; do Etsy autocomplete + Etsy-tuned scoring + clustering in our backend). Charge BLP credits. SEO Audit + AEO scan explicitly **dropped** (research: Etsy sellers rarely have own websites / run Google Ads directly).
- ☐ KW-1: Keyword research + one-click apply to tags/title — new section in Research tab (`sidepanel.html:552`), reuse `editor/components/tag-manager.js` write-back. Lead UI with Etsy autocomplete; label volume as "demand signal" (NOT "Etsy monthly searches").
- ☐ KW-2: Keyword clustering — themed groups for title/tag strategy (port `clustering.ts` logic, Gemini naming via existing `GEMINI_API_KEY`).
- ☐ KW-3: Backend hybrid endpoint — GovToolsPro endpoint that calls JK `POST /api/v1/recommend` for volume, runs Etsy autocomplete + Etsy-weighted scoring, deducts BLP credits (first-party purchase tracking).

### Phase 2 — Agent SDK expansion
- ☐ AGENT-1: Listing Researcher Agent (priority #1 — fastest to revenue) — researches top-selling Etsy listings, produces optimized drafts. 15–25 credits per run. Tools: WebSearch, WebFetch, Write. First step: CLI script, validate with 3 paying users before productionizing.
- ☐ AGENT-2: Cross-Platform Expansion Agent (priority #2) — read Etsy listing → generate variants for Gumroad, Creative Market, Design Bundles, Shopify. 10 credits per platform, 40 for full set.
- ☐ AGENT-3: Competitor Watch (priority #3) — Weekly Routine scrapes pinned competitors, drafts intel report. $4.99/mo subscription add-on.

### Phase 3 — Continued SDK exploration
- ☐ EXPLORE-1: Inventory/listing health audit agent (flags stale listings, poor-performers)
- ☐ EXPLORE-2: Pricing optimization agent (competitive price recommendations)
- ☐ EXPLORE-3: Customer message auto-drafter for common Etsy buyer questions
- ☐ EXPLORE-4: Seasonal/trend campaign planner
- ☐ EXPLORE-5: Photo style transfer / variant generator (when Claude vision improves)

## DONE (recent wins)

*(none recorded — populate as items ship)*

## DROPPED

*(none)*

---

# Reference

*Below this line is preserved-as-was reference material. The dashboard parser ignores everything from here down.*

## Phase 1.5 — Edit tab (full plan)

Full plan and decisions: see `memory/feature_edit_existing_listings.md`. Five sub-phases (EDIT-1 through EDIT-5 above); each is a contained delivery milestone.

## Phase 2 — Agent SDK expansion notes

See `docs/AGENT_SDK.md` for full opportunity analysis, starter code, and pricing math.

## Phase 3 — Explore Agent SDK quarterly

**Task:** Revisit `docs/AGENT_SDK.md` quarterly and explore additional agent-powered features as the SDK evolves and user feedback comes in. Candidate areas captured as EXPLORE-* in BACKLOG.

Review cadence: after each Phase 2 agent ships, spend a focused session checking `https://code.claude.com/docs/en/agent-sdk/overview` for new capabilities and re-reading the research at `C:\Projects\ideas\claude-code-research\agent-sdk.md`.

## Related docs

- [README.md](./README.md) — overview
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system design
- [docs/CREDIT-SYSTEM.md](./docs/CREDIT-SYSTEM.md) — pricing & flow
- [docs/AGENT_SDK.md](./docs/AGENT_SDK.md) — Agent SDK opportunities, starter code, pricing math
- [CLAUDE.md](./CLAUDE.md) — AI assistant context
- `memory/feature_edit_existing_listings.md` — Edit tab full plan + decisions
