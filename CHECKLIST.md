# BulkListingPro Master Checklist

> **Last Updated:** February 7, 2026
> **Status:** Phase 1 Complete — Editor Phase 6 Complete

---

## Phase 1: Foundation (MVP)

### 1.1 Project Setup
- [x] Create project structure
- [x] Set up manifest.json
- [x] Create CLAUDE.md (AI context)
- [x] Create README.md
- [x] Create architecture documentation
- [x] Create credit system documentation
- [x] Create Etsy selectors documentation
- [x] Create roadmap documentation
- [x] Create basic sidepanel HTML/CSS/JS
- [x] Create basic popup HTML/JS
- [x] Create background service worker (placeholder)
- [x] Create content script (placeholder)
- [x] Implement Etsy page detection
- [x] Auto-open sidepanel on Etsy pages
- [x] Show connection status in sidepanel
- [x] Create extension icons
- [x] Test extension loads in Chrome
- [x] Set up package.json with build tools

### 1.2 Sidepanel UI
- [x] Setup screen (native host installation prompt)
- [x] Listing form (single listing entry)
  - [x] Title, description, price fields
  - [x] Category dropdown
  - [x] Image drag/drop zone (up to 5 images)
  - [ ] Digital file path input with browse button
  - [x] Tag input (comma separated)
  - [x] Add to Queue button
- [x] Spreadsheet import
  - [x] Drag/drop zone for XLSX/CSV files
  - [x] Parse spreadsheet to listings (XLSX + CSV)
  - [x] Validate required fields (title)
  - [x] Show validation errors
- [x] Queue view
  - [x] List all pending listings
  - [x] Show title and status per listing
  - [x] Select/deselect individual listings
  - [x] Clear queue button
  - [x] Start Upload button (disabled if no listings/credits)
- [x] Progress view
  - [x] Progress bar
  - [x] Current listing name
  - [x] X of Y listings complete
  - [x] Pause/Resume button
  - [x] Cancel button
- [x] Results view
  - [x] Summary (X success, Y failed)
  - [x] List with status per listing
  - [x] Error details for failed listings

### 1.3 Native Host
- [x] Create native-host directory structure
- [x] Create host.js (Native Messaging entry point)
- [x] Implement stdin/stdout message protocol
- [x] Port session.js from etsy-uploader (CDP connection) → src/cdp.js
- [x] Port listing.js from etsy-uploader → src/listing.js
- [x] Port batch.js logic into host.js
- [x] Create Native Messaging manifest (com.bulklistingpro.host.json)
- [x] Test Native Messaging communication
- [x] Create Windows installer (install-windows.bat)
- [x] Test full flow: extension → native host → CDP → Etsy

### 1.4 Extension ↔ Native Host Communication
- [x] Add nativeMessaging permission to manifest.json
- [x] Implement connectNative() in background worker
- [x] Handle connection errors (native host not installed)
- [x] Send START_UPLOAD message
- [x] Receive PROGRESS messages
- [x] Receive LISTING_COMPLETE/LISTING_ERROR messages
- [x] Receive COMPLETE message
- [x] Implement PAUSE/RESUME/CANCEL
- [x] Update sidepanel UI based on messages

### 1.5 Authentication
- [x] **Decision: Backend architecture** → Use GovToolsPro API
- [x] Set up Google OAuth client ID
- [x] Port auth.js from GovToolsPro
- [x] Port storage.js from GovToolsPro
- [x] Implement sign-in flow in sidepanel
- [x] Implement sign-out flow
- [x] Test auth persistence across sessions
- [x] Handle token refresh

### 1.6 Backend API
- [x] **Decision: API location** → Share GovToolsPro backend
- [x] Using /api/auth/google endpoint (existing)
- [x] Using /api/user/credits endpoint (existing)
- [x] Using /api/user/credits/use endpoint (existing)
- [x] Add BulkListingPro to Firebase collection (shared credit pool, no overlap)
- [x] Test API endpoints work with BulkListingPro

### 1.7 Credit System
- [x] Display credit balance in sidepanel (with animations)
- [x] Implement "Buy Credits" modal (dynamic packs from API)
- [x] Using existing Stripe products (shared with GovToolsPro)
- [x] Using /api/stripe/create-credit-checkout endpoint
- [x] Stripe webhook already configured in backend
- [ ] Test purchase flow end-to-end
- [x] Handle insufficient credits error (shows modal)
- [x] Deduct credits on successful listing upload (2 credits/listing)

### 1.8 MVP Testing
- [x] Test fresh install experience
- [x] Test native host installation
- [x] Test sign-in flow
- [x] Test listing form → queue → upload flow
- [x] Test spreadsheet import → queue → upload flow
- [x] Test credit deduction
- [x] Test error handling (Etsy DOM changes, network errors)
- [x] Test pause/resume/cancel
- [x] Fix any bugs found

---

## Phase 2: Polish & Launch

### 2.1 Error Handling
- [x] Captcha/verification detection and pause
- [x] Progress persistence (resume after crash)
- [x] Retry logic with backoff (auto-retry failed listings after initial pass)
- [x] Credit refund on failure (credits only deducted on success — no refund needed)
- [x] Clear error messages (categorized: verification, timeout, network, dom)
- [x] Log errors for debugging
- [x] "Report issue" feature (GitHub Issues link in Account tab)

### 2.2 Settings
- [x] Default listing state (draft/publish) — dropdown in queue section
- [x] Delay between listings — handled by wait-for-element logic + jitter, no slider needed
- [x] Auto-retry on failure — automatic retry pass after initial batch
- [x] Notification preferences — toast system in place, desktop notifications not needed
- [x] Save settings to storage
- [x] Load settings on startup

### 2.3 Chrome Web Store Submission
- [ ] Create 5 screenshots
- [ ] Create promotional video (optional)
- [x] Write store description → `store-listing/description.md`
- [x] Create privacy policy → `store-listing/privacy-policy.html`
- [x] Create terms of service → `store-listing/terms-of-service.html`
- [x] Create packaging script → `create-zip.ps1`
- [ ] Host legal pages on GitHub Pages
  - URL: `https://smythmyke.github.io/BulkListingPro/store-listing/privacy-policy.html`
  - URL: `https://smythmyke.github.io/BulkListingPro/store-listing/terms-of-service.html`
- [ ] Set up developer account ($5 fee)
- [ ] Submit for review
- [ ] Respond to any review feedback
- [ ] **LAUNCH**

### 2.4 Native Host Distribution
- [ ] Host installer files (S3, GitHub Releases, etc.)
- [ ] Code sign Windows installer
- [ ] Code sign Mac installer (requires Apple Developer account)
- [ ] Create installation instructions page
- [ ] Test download + install flow

### 2.5 Marketing
- [ ] Register domain (bulklistingpro.com?)
- [ ] Create landing page
- [ ] Create Etsy listing for the extension
- [ ] Create tutorial video
- [ ] Write help documentation
- [ ] Set up support email

---

## Phase 3: Enhancements (Post-Launch)

### 3.1 User Feedback
- [ ] Collect feedback from early users
- [ ] Prioritize feature requests
- [ ] Fix reported bugs

### 3.2 Referral & Affiliate System (Port from GovToolsPro)
- [x] Welcome bonus: 10 free credits for new users (backend change)
- [x] Welcome toast notification in sidepanel
- [ ] **Deploy backend change** (DEFAULT_CREDITS = 10) to production
- [ ] **Referral System** (USR codes)
  - [ ] Port referral code generation/validation from GovToolsPro
  - [ ] 100 credits for referrer when code used
  - [ ] 100 credits for new user who uses code
  - [ ] Share referral code pool with GovToolsPro (same codes work in both)
- [ ] **Affiliate System** (AFF codes)
  - [ ] Port affiliate code generation/validation from GovToolsPro
  - [ ] 10% commission via Stripe Connect
  - [ ] Share affiliate code pool with GovToolsPro
- [ ] **Welcome Modal for New Users**
  - [ ] Show modal on first sign-in
  - [ ] Input field for referral/affiliate code
  - [ ] Apply code and show success message
- [ ] Account tab: Show user's referral code and copy button
- [ ] Account tab: Show referral stats (invites, credits earned)

### 3.3 Feature Ideas (Prioritize Later)
- [ ] **Retry failed listings** - Auto-retry or manual "Retry Failed" button after upload completes
- [ ] **Publish vs Draft toggle** - Let users choose to publish immediately or save as draft (default: draft)
  - UI: Toggle button or dropdown in queue section before starting upload
  - Spreadsheet: Optional `listing_state` column (values: `draft` or `active`)
- [ ] **Optional category attributes** - Support Craft Type, Occasion, Holiday for enhanced discoverability
- [ ] Listing templates (save & reuse)
- [ ] Scheduled uploads
- [ ] Analytics dashboard
- [ ] Multi-shop support
- [ ] Bulk edit existing listings
- [x] AI description generator (Editor Phase 6)
- [ ] Other platforms (Amazon, Shopify)

### 3.4 Account Tab (Implemented)
- [x] Profile section (name, email, picture)
- [x] Credits display with buy button
- [x] Tag Library with category-based organization
- [x] Smart tag suggestions based on selected category
- [x] Save tags modal with category dropdown (auto-detected + editable)

---

## Architecture Decisions (Completed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File access | Native Host + CDP | Extension can't access local files |
| Browser control | CDP to user's browser | Use existing Etsy session |
| Native host distribution | Download from extension UI | Chrome Web Store is entry point |
| Listing input | UI Form + Spreadsheet | Form for small batches, spreadsheet for bulk |

## Open Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Backend architecture | A: Extend GovToolsPro API / B: New standalone | **Resolved: Option A** |
| Domain name | bulklistingpro.com / other? | **Pending** |
| Pricing validation | ~$0.03-0.05/listing (2 credits) | **Resolved** |
| Google OAuth client ID | Create new or share? | **Pending** |

---

## Progress Log

| Date | Milestone |
|------|-----------|
| 2026-02-03 | Project created, documentation complete |
| 2026-02-03 | Etsy page detection + sidepanel auto-open |
| 2026-02-03 | Architecture finalized: Native Host + CDP |
| 2026-02-03 | UI plan: Form + Spreadsheet input methods |
| 2026-02-03 | Auth + Credits system implemented (shared GovToolsPro backend) |
| 2026-02-03 | UI animations added (shimmer, pop, slide, etc.) |
| 2026-02-04 | Native Host communication working |
| 2026-02-04 | CDP connection to Chrome working |
| 2026-02-04 | Full upload flow tested successfully (draft listing created) |
| 2026-02-04 | Sidepanel UI integrated with native host |
| 2026-02-04 | Spreadsheet import (XLSX/CSV) implemented |
| 2026-02-04 | Interrupt-based pause/skip/cancel implemented |
| 2026-02-04 | Etsy save confirmation detection added |
| 2026-02-04 | Setup/onboarding screen implemented |
| 2026-02-05 | Debug browser detection (CDP tab comparison + warning banner) |
| 2026-02-05 | Chrome Web Store submission prep (store listing, legal pages, packaging script) |
| 2026-02-05 | Native Host simplified to file-server only (v2.0.0) |
| 2026-02-05 | Setup screen redesigned (Lite Mode + optional Power Mode) |
| 2026-02-05 | Auto-detection for Etsy login status |
| 2026-02-05 | Extension v0.2.0 uploaded to Chrome Web Store |
| 2026-02-05 | Category-specific attributes support (Clip Art & Image Files + Craft Type) |
| 2026-02-06 | Smart tag suggestions (Phase 3) implemented |
| 2026-02-06 | Category-based tag library with category dropdown in save modal |
| 2026-02-06 | Welcome bonus (10 credits) for new users - backend + toast |
| 2026-02-06 | Planned: Referral/Affiliate system port from GovToolsPro |
| 2026-02-06 | Phase 1 field automation complete (who_made, what_is_it, ai_content, when_made, renewal, materials, quantity, SKU) |
| 2026-02-06 | XLSX template rebuilt with ExcelJS (dropdowns, formatting, Options sheet) |
| 2026-02-06 | Friendly text mapping for spreadsheet values |
| 2026-02-06 | Editor Phase 1 complete (form view, validation, autosave, import, queue sync) |
| 2026-02-06 | Editor Phase 2 complete (grid view, view toggle, search/filter/sort, multi-select, duplicate, batch delete, export XLSX/CSV, undo/redo, column tooltips, drag-to-reorder) |
| 2026-02-07 | Editor Phase 3 complete (IndexedDB image storage, image handler, drag/drop, lightbox, digital files, image validation) |
| 2026-02-07 | Editor Phase 4 complete (autoformat, title case, batch validation, cross-listing checks, validation badge, report panel, per-field blur cleanup) |
| 2026-02-07 | Editor Phase 5 complete (tag library integration, category suggestions, competitor import, frequency analysis, batch tag operations, similar tag warnings) |
| 2026-02-07 | Editor Phase 6 complete (AI generation — titles, descriptions, tags; bulk generation; AI panel; credit-based via Gemini backend) |
| 2026-02-07 | Listing Evaluation feature complete (AI quality scoring for all fields, inline score chips, hover tooltips with recommendations, tag swap actions, bulk evaluate modal, 2 credits/eval) |
| | |

---

*Update this checklist as work progresses. Check off items, add notes, track decisions.*
