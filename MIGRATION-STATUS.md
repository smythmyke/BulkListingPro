# Migration Status — Off Google (the reference point)

> **This is the "we moved everything" marker.** As of **2026-07-02**, the shared backend
> is being lifted off GCP. Re-enabling GCP billing is **not an option (permanent)** — all 13
> billing accounts are `OPEN: False`. This file is the living decision record; the two
> companion docs below hold the detail.

## The situation

- **Backend down since 2026-06-30.** Cloud Run `business-search-api` (project `sam-extension`)
  can't start — billing disabled. Every request 500/503s. This takes down **all 5 front-ends**
  (BulkListingPro, gov-contracting, GovToolsPro-extension, RedditOutreach, TubePilot) and the
  Stripe credit webhooks. It is a **P0 revenue outage**, not a background migration.
- BulkListingPro owns **no backend code** — its 4 AI routes are inline `gemini-2.5-flash` calls
  in `C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\api\api-server.js`.

## Verified 2026-07-02 (what survives the closure)

| Google service | Survives billing-off? | Consequence |
|---|---|---|
| **Firestore** (Spark free tier) | ✅ read+write+delete work from external host via SA JSON | Data layer stays put; does NOT need to move to restore service |
| **Google OAuth** (`oauth2/v2/userinfo`) | ✅ public endpoint, host-agnostic | Sign-in survives |
| **Secret Manager** | 🔴 blocked (billing-gated) | Secrets must be reconstructed from source, not exported |
| **Cloud Run** | 🔴 won't start | Must re-host compute |

Firestore is now **permanently on Spark** (no billing anywhere → no Blaze upgrade). Caps:
50k reads / 20k writes / 20k deletes per day, 1 GB. Fine to restore on; watch under full load.

## Decisions

- **Re-host the monolith off GCP** (Railway recommended; Render equivalent; Fly if multi-region).
- **Keep it as ONE monolith — do NOT split the 5 products during the move.** The coupling is the
  shared data/auth/credits/Stripe layer, not the compute; splitting compute doesn't separate the
  shared Firestore, so a split multiplies ops 5× for only blast-radius isolation. Splitting is a
  later, deliberate project — only if a product's lifecycle diverges.
- **Keep Firestore on Spark for now** (Option A). Migrate data off Google (Option B) only if
  quota bites.
- **Fold the Gemini→Claude swap into the same redeploy** (Gemini key is in a dead project anyway).

## Proposed order (step 2 restores revenue)

1. Decide host + Firestore A-vs-B.
2. **Stand up compute on the new host** from the existing Dockerfile, mount the SA JSON, reconstruct
   secrets. ← restores auth/credits/Stripe for all 5 front-ends. **This is the money step.**
3. Map a custom domain (`api.govtoolspro.com`) at the new host; ship the BLP client onto that domain
   **bundled with v0.12.3** → one Chrome Web Store submission. (BLP hardcodes the `…run.app` URL, so
   a republish is unavoidable; moving to a domain makes future host moves DNS-only.)
   **HOLD the pending v0.12.3 CWS upload until host+domain exist.**
4. Fold in `claudeClient.js` + new dedicated `ANTHROPIC_API_KEY`; swap BLP's 4 routes
   (pilot `translate-listing`, vision `generate-full-listing` last); cost-check margins.
5. Stripe: repoint the webhook to the new host and resend missed `credit-webhook` events.

## Companion docs

- `MIGRATION-GEMINI-TO-CLAUDE.md` — the 4 routes, backend line numbers, client call sites, target tiers.
- `CLAUDE-MIGRATION-REFERENCE.md` — the drop-in Claude wrapper, gotchas, model IDs, pricing, key setup.
- `C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\RESTORE-AND-MIGRATE.md` — full lift-and-shift spec.
