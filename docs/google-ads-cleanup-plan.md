# Google Ads BulkListingPro Cleanup Plan

**Date:** 2026-04-21
**Campaign:** BulkListingPro - Search Ads (ID 23665433973)
**Customer:** 8702609992 (expunge-it.com)
**Budget:** $5/day — NOT changing

## Current State Summary (Last 30 Days)

| Metric | Value |
|---|---|
| Impressions | 3,780 |
| Clicks | 222 |
| Cost | $154.72 |
| CTR | 5.87% |
| Avg CPC | $0.70 |
| **Conversions** | **0** |

## Top 50 Search Terms Confirm the Story

People ARE finding the ads. The top actual searches are dominated by:
- Etsy fee/charge questions (`etsy fees`, `how much does etsy charge to sell`, `etsy calculator`, `what percentage does etsy take`)
- "How to sell on etsy" variants (beginner intent)
- Product discovery (`selling digital products on etsy`, `what to sell on etsy`)

**Almost zero searches are for bulk upload intent.** That ad group exists but doesn't get the searches — and the budget gets eaten by cheaper, higher-volume informational clicks.

## Landing Pages Currently In Use

| Ad Group | Landing Page | Status |
|---|---|---|
| Digital Product Listing (main ad) | `/BulkListingPro/` | ENABLED |
| Digital Product Listing (calc ads) | `/BulkListingPro/calculator.html` | ENABLED (2 ads) |
| Digital Products on Etsy | `/BulkListingPro/` | PAUSED AG |
| Etsy Best Sellers | `/BulkListingPro/best-sellers.html` | ENABLED |
| Etsy Bulk Upload | `/BulkListingPro/` | REMOVED AG (ad paused) |
| Etsy Bulk Upload & Listing | `/BulkListingPro/` | ENABLED (3 ads) |
| Etsy SEO & Tags | `/BulkListingPro/` | REMOVED AG |
| Etsy Seller Tools | `/BulkListingPro/` | REMOVED AG |
| **Laundromat For Sale** | `/BulkListingPro/business-finder.html` | PAUSED AG (wrong product) |
| **Vending Machine For Sale** | `/BulkListingPro/business-finder.html` | PAUSED AG (wrong product) |

## Plan Items

### Item 1 — Fix Conversion Tracking (BLOCKER)

**Problem:** Account has conversion actions for expunge-it, markitup-ext, JK (JackpotKeywords), and DIY/Shop purchases. **Nothing exists for BulkListingPro.** Campaign is using "account defaults" which means it's counting conversions meant for other products — or nothing at all (0 confirmed).

**Existing conversion actions:**
- 7355872274 `Lead Submitted - Quiz Complete` (expunge-it) — ENABLED, Primary
- 7362961357 `Submit lead form` (expunge-it client setup) — ENABLED, Primary
- 7411040811 `DIY Purchase` (expunge-it) — ENABLED, Primary
- 7411040814 `Shop Purchase` (expunge-it) — ENABLED, Primary
- 7542760295 `markitup-ext (web) sign_up` — ENABLED, Primary
- 7569046534/37/40 `JK - Search/SignUp/Purchase` — ENABLED, Primary
- **NO BulkListingPro conversion action exists.**

**Required:**
1. **Decide the BLP conversion event.** Options:
   - **Chrome Web Store install click** — click tracking via UTM on the "Install" button on `BulkListingPro/` landing page. Simplest to track, fires on click before Chrome Web Store redirect.
   - **BLP sign-in event** — user opens extension and signs in with Google. Harder: requires GA4 event from the extension itself.
   - **BLP credit purchase** — Stripe checkout success. Most valuable but rarest.
2. **Create conversion action(s) in Google Ads** for the chosen event(s).
3. **Scope the campaign to use only BLP conversions** via `selective_optimization.conversion_actions` so it's not polluted by expunge-it/JK/markitup conversions.
4. **Wire the tracking** — gtag on landing page and/or GA4 event from the extension.

**Decision needed from user:** Which conversion event is the North Star? My recommendation: track **"Install Click" on the landing page** as the primary (easy, fires often) and **Stripe purchase** as a secondary value conversion.

---

### Item 2 — Remove Wrong-Product Ad Groups

These don't belong in the BulkListingPro campaign:

| Ad Group | Keywords | Reason |
|---|---|---|
| `Laundromat For Sale` (paused) | 25 | Points to `business-finder.html` — different product |
| `Vending Machine For Sale` (paused) | 10 | Points to `business-finder.html` — different product |
| `Etsy Seller Tools Hub` (paused) | 41 | Etsy fee-question keywords overlap Digital Product Listing; better merged or moved to its own campaign once calculator is the conversion driver |

**Action:**
- Remove Laundromat and Vending ad groups entirely (they already have paused ads + are the wrong product).
- For Etsy Seller Tools Hub: leave paused for now; revisit after conversion tracking is live. Its fee-question keywords actually belong with the calculator landing page but would need their own ads.

Also clean up the stale REMOVED ad groups (Digital Products on Etsy, Etsy Bulk Upload, Etsy SEO & Tags, Etsy Seller Tools) — they contain keywords that are cluttering the campaign even though the ad groups are removed. Removing fully will clean this up.

---

### Item 3 — Unpause High-Performing Winners

These keywords are currently PAUSED but had strong CTR + QS when they ran:

| Keyword | Ad Group | Impr | CTR | QS | Why unpause |
|---|---|---|---|---|---|
| `etsy fees calculator` | Digital Product Listing | 73 | **13.70%** | 8 | Elite CTR, QS 8 |
| `etsy seller calculator` | Digital Product Listing | 39 | **12.82%** | 8 | Elite CTR, QS 8 |
| `etsy sale calculator` | Digital Product Listing | 8 | **25.00%** | - | 25% CTR on small sample |
| `etsy selling fees calculator` | Digital Product Listing | 292 | 6.85% | - | 20 clicks, high volume |
| `etsy calculator` | Digital Product Listing | 93 | 9.68% | 7 | 9 clicks, QS 7 |
| `etsy fee calculator` | Digital Product Listing | 36 | 5.56% | 8 | QS 8 |
| `how much does it cost to sell on etsy` | Digital Product Listing | 629 | 6.36% | 5 | Highest volume; calc-relevant |

**Caveat:** Since all these are Digital Product Listing keywords and the calculator ads live there, they WILL drive calculator page traffic. That matches search intent perfectly. But without conversion tracking, we can't tell if calculator visitors convert to installs.

---

### Item 4 — Pause QS-Killers

Low Quality Score pulls down the whole ad group's Ad Rank. Pause these:

| Keyword | Ad Group | QS | Current Status | Action |
|---|---|---|---|---|
| `how to start an etsy shop` | Digital Product Listing | **1** | ENABLED | PAUSE |
| `etsy bulk lister` | Etsy Bulk Upload & Listing | **3** | PAUSED | Keep paused / remove |
| `how to sell on etsy` | Digital Product Listing | 3 | PAUSED | Keep paused / remove |

**Also consider pausing these low-CTR / zero-click keywords** that have run with some impressions but no traction:
- `how to list on etsy` — 94 impr, 1 click (1.06% CTR) — ENABLED
- `how to make an etsy shop` — 107 impr, 2 clicks (1.87% CTR) — PAUSED already

---

### Item 6 — Two-Funnel Verification (Landing Page Audit)

**Current landing page assignments look correct at a glance:**

- Calculator-intent keywords → `/calculator.html` ✅
- Best-seller research keywords → `/best-sellers.html` ✅
- Bulk-upload intent keywords → `/` (main BLP install page) ✅
- How-to keywords → `/` (main BLP install page) — **should probably go to a how-to guide page**

**Recommendation:**
1. Verify each landing page exists and loads:
   - `https://smythmyke.github.io/BulkListingPro/`
   - `https://smythmyke.github.io/BulkListingPro/calculator.html`
   - `https://smythmyke.github.io/BulkListingPro/best-sellers.html`
2. Verify each has a clear CTA (install button with tracked click).
3. Verify there are NO broken pages (`business-finder.html` shouldn't be getting BLP traffic once ad groups are removed).
4. Consider: the `how to sell on etsy` / beginner cluster is currently pointed at the install page but intent is "teach me". Either:
   - Build a `/how-to-sell-on-etsy.html` guide with install CTA at bottom
   - Or just pause these keywords (they're low QS anyway)

**For this implementation pass, no landing page changes — just verify the 3 pages load correctly.**

---

## Proposed Implementation Sequence

**Phase A: Safety (no keyword changes)**
1. Verify 3 landing pages load and have install CTAs.
2. Decide on conversion event for BLP (user input required).
3. Create conversion action in Google Ads + scope campaign to it.
4. Deploy tracking snippet on landing pages.
5. Wait 24-48h to confirm conversions are firing.

**Phase B: Cleanup (Google Ads API script)**
6. Remove Laundromat For Sale ad group (and its 25 keywords).
7. Remove Vending Machine For Sale ad group (and its 10 keywords).
8. Optionally: full-remove already-REMOVED ad groups (Digital Products on Etsy, Etsy Bulk Upload, Etsy SEO & Tags, Etsy Seller Tools) to fully clear their keywords from the campaign.

**Phase C: Keyword tuning (Google Ads API script)**
9. UNPAUSE the 7 calculator winners (Item 3).
10. PAUSE the QS killers (Item 4): `how to start an etsy shop`, `how to list on etsy`.
11. Verify the 5-headline "old" ads are being outcompeted by the 14-headline versions in Digital Product Listing and Etsy Bulk Upload & Listing — if the old ones are eating impressions, pause them.

**Phase D: Monitor**
12. 7 days of data post-changes.
13. Reconvene to evaluate: CTR, conversions per ad group, cost-per-conversion.

## What's NOT in this plan (per user instruction)

- ❌ Moving Etsy Bulk Upload & Listing to its own campaign
- ❌ Raising bids (including $1.00 ceiling in Bulk Upload & Listing)
- ❌ Raising daily budget (staying at $5/day)

## Risk / Reversibility

- All keyword pauses/unpauses are fully reversible.
- Ad group removal is reversible (removed ad groups are kept in the system, can be re-enabled).
- Conversion action creation is additive (doesn't break anything).
- Biggest risk: creating a conversion action on the wrong event means garbage data for 30 days. Mitigation: test the fire in GA4 DebugView before running campaigns against it.

## Open Questions for User

1. **Conversion event** — install click, sign-up, or purchase as primary?
2. Is `business-finder.html` supposed to be under `/BulkListingPro/` at all, or is that an old path that should move? (It conflicts with the BLP brand.)
3. Should the already-REMOVED ad groups be fully purged (removes their keywords from the campaign view), or leave them for historical reference?
