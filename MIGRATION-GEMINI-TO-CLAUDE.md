# Migration Plan — Gemini → Claude (BulkListingPro)

**Priority: #2 (has paying customers).**

## ⚠️ This repo owns NO LLM code
All 4 AI features are **endpoints in the shared backend**:
`C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\api\api-server.js`
(Cloud Run `business-search-api-815700675676.us-central1.run.app`).

**Migrating BulkListingPro = migrating these 4 routes in that backend file.** The backend is a shared monolith serving 5 front-ends; each route has its own inline Gemini call, so we migrate **only these 4** through the new Claude wrapper and leave the other endpoints on Gemini until their turn. This step also stands up the backend Claude wrapper (see the backend's own MIGRATION doc).

## Portfolio context
Mixed tiers per call site: **Haiku 4.5** (mechanical), **Sonnet 4.6** (structured/vision), **Opus 4.8** (frontier reasoning only). Cost levers: right-tiering, prompt caching, Batch API.
**Customer-facing caution:** these run on **user credits** — watch margin (Claude > Gemini Flash per token) and test copy/translation quality before rollout.

## Endpoints (all in `api-server.js`, currently `gemini-2.5-flash`)
| Route | Backend line | Client call site (this repo) | Task | Complexity | Tier |
|---|---|---|---|---|---|
| `/api/v1/generate-listing-content` | `1831` | `editor/components/ai-generator.js:20` | Generate Etsy title/description/tags | MODERATE | **Haiku 4.5** (Sonnet if copy quality matters) |
| `/api/v1/generate-full-listing` | `2035` | `sidepanel/sidepanel.js:1650` | Full listing from up to 3 product **images** + seed | MODERATE + vision | **Sonnet 4.6** (vision grounding; highest-value output) |
| `/api/v1/evaluate-listing` | `2271` | `editor/components/ai-generator.js:96` | Quality-score a listing | MECHANICAL→MODERATE | **Haiku 4.5** |
| `/api/v1/translate-listing` | `2512` | `editor/components/ai-generator.js:170` | Translate listing into N languages | MECHANICAL | **Haiku 4.5** |

No Opus. `generate-full-listing` uses image **input** (vision) — fully Claude-replaceable; not image generation.

## Checklist (work happens in the backend repo)
- [ ] Backend Claude wrapper exists (see GovToolsPro backend MIGRATION doc — prerequisite)
- [ ] `generate-full-listing` (`:2035`) → Sonnet (verify multimodal image input + output schema)
- [ ] `generate-listing-content` (`:1831`) → Haiku (or Sonnet) — A/B copy quality
- [ ] `evaluate-listing` (`:2271`) → Haiku
- [ ] `translate-listing` (`:2512`) → Haiku — verify multi-language fidelity
- [ ] Cost check: per-call credit cost vs Gemini baseline; confirm margin acceptable
- [ ] Verify extension end-to-end against staging backend before prod
