# BulkListingPro Master Checklist

> **Last Updated:** February 5, 2026
> **Status:** Phase 1 - Foundation

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
  - [ ] Select/deselect individual listings
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
- [ ] Handle token refresh

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
- [ ] Test fresh install experience
- [ ] Test native host installation
- [ ] Test sign-in flow
- [ ] Test listing form → queue → upload flow
- [ ] Test spreadsheet import → queue → upload flow
- [ ] Test credit deduction
- [ ] Test error handling (Etsy DOM changes, network errors)
- [ ] Test pause/resume/cancel
- [ ] Fix any bugs found

---

## Phase 2: Polish & Launch

### 2.1 Error Handling
- [ ] Retry logic with backoff
- [ ] Credit refund on failure
- [ ] Clear error messages
- [ ] Log errors for debugging
- [ ] "Report issue" feature

### 2.2 Settings
- [ ] Default listing state (draft/publish)
- [ ] Delay between listings slider
- [ ] Auto-retry on failure toggle
- [ ] Notification preferences
- [ ] Save settings to storage
- [ ] Load settings on startup

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

### 3.2 Feature Ideas (Prioritize Later)
- [ ] Listing templates (save & reuse)
- [ ] Scheduled uploads
- [ ] Analytics dashboard
- [ ] Multi-shop support
- [ ] Bulk edit existing listings
- [ ] AI description generator
- [ ] Other platforms (Amazon, Shopify)

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
| | |

---

*Update this checklist as work progresses. Check off items, add notes, track decisions.*
