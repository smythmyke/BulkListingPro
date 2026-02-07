# BulkListingPro Development Roadmap

## Phase 1: Foundation (MVP) ✅

**Goal:** Basic working extension that can upload 1 listing with credits

### Tasks

- [x] **1.1 Project Setup** — project structure, manifest, docs, icons, package.json
- [x] **1.2 Authentication** — Google sign-in, storage service, auth UI
- [x] **1.3 Basic Sidepanel UI** — login/logout, credit balance, listing form, upload button
- [x] **1.4 CDP Automation** — Etsy form filling via Native Host + CDP, file uploads, progress reporting
- [x] **1.5 Backend Integration** — shared GovToolsPro API, auth/credit endpoints, Stripe checkout

### Deliverable ✅
Extension uploads listings with credit deduction, signed in via Google OAuth.

---

## Phase 2: Spreadsheet Support ✅

**Goal:** Bulk upload from spreadsheet

### Tasks

- [x] **2.1 Spreadsheet Parser** — XLSX/CSV reading, format validation, column mapping
- [x] **2.2 Upload Queue UI** — list view, preview, edit before upload, select/deselect
- [x] **2.3 Batch Processing** — queue management, progress tracking, pause/resume/cancel
- [x] **2.4 File Handling** — local file paths via Native Host, URL support

### Deliverable ✅
Drop spreadsheet → queue → batch upload with progress.

---

## Phase 3: Polish & Launch (Partial)

**Goal:** Production-ready extension

### Tasks

- [x] **3.1 Error Handling** — captcha detection, progress persistence
- [ ] **3.2 Settings** — default listing state, delay slider, notifications
- [x] **3.3 Chrome Web Store** — store listing, privacy policy, terms, packaging, v0.2.0 submitted
- [ ] **3.4 Marketing** — landing page, tutorials, documentation

### Deliverable
Extension published on Chrome Web Store (v0.2.0).

---

## Phase 4: Listing Editor ✅ (Phases 1-6)

**Goal:** Full-tab hybrid editor replacing spreadsheet workflow

### Completed

- [x] **Editor Phase 1** — Form view, validation, autosave, import, queue sync
- [x] **Editor Phase 2** — Grid view, view toggle, search/filter/sort, multi-select, duplicate, batch delete, export, undo/redo, drag-to-reorder
- [x] **Editor Phase 3** — IndexedDB image storage, drag/drop images, lightbox, digital files
- [x] **Editor Phase 4** — Autoformat, title case, batch validation, cross-listing checks, validation badge, report panel
- [x] **Editor Phase 5** — Tag library integration, category suggestions, competitor tag import, frequency analysis, batch tag operations, similar tag warnings
- [x] **Editor Phase 6** — AI generation (titles, descriptions, tags via Gemini), bulk generation, listing evaluation (AI quality scoring with hover tooltips)

### Remaining

- [ ] **Editor Phase 7** — Advanced file handling (folder scanning, auto-assignment)
- [ ] **Editor Phase 8** — Templates & profiles (save/reuse listing configs)

---

## Phase 5: Enhancements (Post-Launch)

**Goal:** Add value, increase retention

### Ideas

- [x] **AI generation** — Generate titles, descriptions, tags from minimal input (1 credit/call)
- [x] **AI evaluation** — Quality scoring for all listing fields (2 credits/eval)
- [ ] **Templates** — Save and reuse listing templates (Editor Phase 8)
- [ ] **Scheduled uploads** — Queue for specific time
- [ ] **Analytics dashboard** — Upload success rates
- [ ] **Multi-shop support** — Switch between Etsy shops
- [ ] **Other platforms** — Amazon Handmade, Shopify
- [ ] **Etsy field automation Phase 2** — Colors, personalization, listing type, ads toggles
- [ ] **Etsy field automation Phase 3** — Shipping profiles, return policies, processing time

---

## Resolved Decisions

| Decision | Choice |
|----------|--------|
| Backend architecture | Extend GovToolsPro API (shared backend) |
| AI provider | Gemini 2.0 Flash via backend proxy |
| Pricing | 2 credits/listing, 1 credit/AI generation, 2 credits/evaluation |
| Browser control | Native Host + CDP (user logs in themselves) |
| Editor library | jspreadsheet CE v4 + jsuites v5 (MIT) |

---

## Success Metrics

### MVP Success
- [ ] 10 users sign up
- [ ] 100 listings uploaded
- [ ] 1 paid user

### Growth Targets
- [ ] 100 users in first month
- [ ] 1,000 listings/month
- [ ] $500 MRR by month 3
