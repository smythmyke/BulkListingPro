# BulkListingPro Development Roadmap

## Phase 1: Foundation (MVP)

**Goal:** Basic working extension that can upload 1 listing with credits

### Tasks

- [ ] **1.1 Project Setup**
  - [x] Create project structure
  - [x] Set up manifest.json
  - [x] Create documentation
  - [ ] Set up package.json with build tools
  - [ ] Create basic icons

- [ ] **1.2 Authentication**
  - [ ] Implement Google sign-in (port from GovToolsPro)
  - [ ] Set up storage service
  - [ ] Create auth UI in sidepanel

- [ ] **1.3 Basic Sidepanel UI**
  - [ ] Login/logout flow
  - [ ] Credit balance display
  - [ ] Simple form for single listing
  - [ ] Upload button

- [ ] **1.4 Content Script**
  - [ ] Port selectors from Node.js uploader
  - [ ] Implement form filling logic
  - [ ] Handle file uploads
  - [ ] Report success/failure

- [ ] **1.5 Backend Integration**
  - [ ] Decision: New API or extend GovToolsPro
  - [ ] Auth endpoints
  - [ ] Credit check/deduct endpoints
  - [ ] Stripe integration for purchases

### Deliverable
Working extension that can:
- Sign in with Google
- Show credit balance
- Upload 1 listing from form
- Deduct 1 credit

---

## Phase 2: Spreadsheet Support

**Goal:** Bulk upload from spreadsheet

### Tasks

- [ ] **2.1 Spreadsheet Parser**
  - [ ] XLSX file reading in browser
  - [ ] Validate spreadsheet format
  - [ ] Map columns to listing fields

- [ ] **2.2 Upload Queue UI**
  - [ ] List view of pending listings
  - [ ] Preview individual listing
  - [ ] Edit before upload
  - [ ] Select/deselect listings

- [ ] **2.3 Batch Processing**
  - [ ] Queue management
  - [ ] Progress tracking
  - [ ] Pause/resume
  - [ ] Error handling per listing

- [ ] **2.4 File Handling**
  - [ ] Support local file paths
  - [ ] Support URLs (Dropbox, etc.)
  - [ ] Download and cache files

### Deliverable
Working bulk upload:
- Drop spreadsheet → See queue
- Click upload → All listings created
- Progress bar and status

---

## Phase 3: Polish & Launch

**Goal:** Production-ready extension

### Tasks

- [ ] **3.1 Error Handling**
  - [ ] Retry logic
  - [ ] Credit refunds on failure
  - [ ] Clear error messages

- [ ] **3.2 Settings**
  - [ ] Default listing state (draft/publish)
  - [ ] Delay between listings
  - [ ] Notification preferences

- [ ] **3.3 Chrome Web Store**
  - [ ] Create store listing
  - [ ] Screenshots and video
  - [ ] Privacy policy
  - [ ] Submit for review

- [ ] **3.4 Marketing**
  - [ ] Landing page
  - [ ] Etsy listing for the product
  - [ ] Documentation/tutorials

### Deliverable
Published extension on Chrome Web Store

---

## Phase 4: Enhancements (Post-Launch)

**Goal:** Add value, increase retention

### Ideas

- [ ] **Templates** - Save and reuse listing templates
- [ ] **Scheduled uploads** - Queue for specific time
- [ ] **Analytics dashboard** - Upload success rates
- [ ] **Multi-shop support** - Switch between Etsy shops
- [ ] **Other platforms** - Amazon Handmade, Shopify
- [ ] **AI descriptions** - Generate descriptions from title

---

## Timeline Estimates

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | 2-3 days | Backend decision |
| Phase 2 | 2-3 days | Phase 1 complete |
| Phase 3 | 2-3 days | Phase 2 complete |
| Phase 4 | Ongoing | Post-launch |

**Total MVP:** ~1 week of focused development

---

## Open Questions

### Backend Architecture

**Option A: Extend GovToolsPro API**
```
Pros:
- Faster to implement
- Shared auth infrastructure
- Single codebase to maintain

Cons:
- Products become coupled
- Harder to scale independently
- Mixed concerns
```

**Option B: New Standalone API**
```
Pros:
- Clean separation
- Independent scaling
- Clear ownership

Cons:
- Duplicate auth code
- More infrastructure
- Longer setup time
```

**Recommendation:** Start with Option A for MVP, migrate to Option B if product grows

### Naming

- Extension: **BulkListingPro** ✓
- Domain: bulklistingpro.com?
- API subdomain: api.bulklistingpro.com?

### Pricing Validation

Need to validate:
- Is $0.15-0.20 per listing competitive?
- What do competitors charge?
- Would subscription model work better?

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
