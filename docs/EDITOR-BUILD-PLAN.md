# Listing Editor — Full Tab Build Plan

> **Created:** February 6, 2026
> **Status:** Phase 6 + Listing Evaluation Complete — Phase 7 Next
> **Goal:** In-browser hybrid editor (form + grid views) that replaces the XLSX template as the primary listing creation workflow

---

## Overview

A full-tab editor opened from the sidepanel that gives users a complete listing creation experience without needing Excel or Google Sheets. Two views share the same data:

- **Form View** (default) — Card-based, guided, with image previews, live validation, and dropdowns
- **Grid View** (power users) — Spreadsheet grid for bulk entry, copy/paste, and rapid editing

Data syncs to the sidepanel upload queue via `chrome.storage.local`.

---

## Architecture

```
sidepanel/
  sidepanel.html              ← "Open Editor" button added
  sidepanel.js                ← Reads editor data into upload queue

editor/
  editor.html                 ← Full tab page
  editor.js                   ← Core logic, view switching, data management
  editor.css                  ← All editor styles

  components/
    form-view.js              ← Card-based listing editor
    grid-view.js              ← jspreadsheet CE wrapper
    image-handler.js          ← Drag/drop, preview, folder scanning
    ai-generator.js           ← AI title/desc/tag generation
    tag-manager.js            ← Tag library integration, suggestions
    validator.js              ← Autoformat, length checks, batch validation

lib/
  jspreadsheet.js             ← jspreadsheet CE library (MIT)
  jsuites.js                  ← jsuites dependency for jspreadsheet
```

### Data Flow

```
Editor (full tab)
  ↓ writes listings to chrome.storage.local
Sidepanel
  ↓ reads listings into upload queue
Native Host + CDP
  ↓ automates Etsy listing creation
Etsy
```

### Communication

- **Editor → Sidepanel:** `chrome.storage.local.set({ editor_listings: [...] })`
- **Sidepanel listens:** `chrome.storage.onChanged.addListener()` or reads on "Send to Queue" action
- **Bidirectional messaging:** `chrome.runtime.sendMessage()` for real-time sync if both are open

---

## Phase 1: Core Editor Foundation

> Open a full tab, build the form view, wire up data sync to sidepanel.

### 1.1 Full Tab Setup

- [x] Create `editor/editor.html` with base layout (toolbar, view toggle, listing area, footer)
- [x] Create `editor/editor.css` with styles matching sidepanel theme
- [x] Create `editor/editor.js` with core data model and state management
- [x] Add `editor/editor.html` to `manifest.json` web_accessible_resources
- [x] Add "Open Editor" button to sidepanel
- [x] `chrome.tabs.create({ url: chrome.runtime.getURL('editor/editor.html') })` on click
- [x] Prevent opening multiple editor tabs (check for existing tab first)

### 1.2 Form View — Card-Based Editor

- [x] Create `editor/components/form-view.js`
- [x] Listing card component with fields:
  - Title (text input, 140 char counter)
  - Description (textarea, line count)
  - Price (number input, auto-format to 2 decimals)
  - Category (searchable dropdown, same 24 categories)
  - Tags (chip input, max 13, max 20 chars each)
  - Image slots (placeholder thumbnails, up to 5)
  - Digital file slot (placeholder)
  - Advanced options (collapsible): who_made, what_is_it, ai_content, when_made, materials, quantity, sku, renewal
- [x] "Add Listing" button — appends new blank card
- [x] "Remove Listing" button per card (with confirmation)
- [x] Listing counter in toolbar ("3 listings")
- [x] Scrollable card list with smooth animations

### 1.3 Live Validation

- [x] Create `editor/components/validator.js`
- [x] Title: live character counter, yellow at 120+, red at 140, block at 141+
- [x] Price: reject < $0.20, strip `$` and commas on paste, format to `X.XX` on blur
- [x] Tags: per-tag 20-char limit, auto-trim whitespace, duplicate warning within listing
- [x] Category: required indicator, must be from valid list
- [x] Required fields (title, description, price, category): red outline if empty on validate
- [x] Per-card validation status icon (green check / red warning)

### 1.4 Data Persistence & Sync

- [x] Autosave to `chrome.storage.local` on every change (debounced 500ms)
- [x] Load saved data on editor open (resume work)
- [x] "Send to Queue" button — writes listings to storage, notifies sidepanel
- [x] Sidepanel reads editor listings into upload queue
- [x] Clear editor data option after successful queue transfer
- [x] Handle edge case: sidepanel closed when "Send to Queue" clicked

### 1.5 Import Support

- [x] Drag/drop zone for XLSX/CSV files (reuse existing parse logic)
- [x] Parse spreadsheet into listing cards
- [x] Merge imported listings with existing editor listings (append)
- [x] Show import summary ("Imported 15 listings, 2 had validation warnings")

---

## Phase 2: Grid View & Data Management

> Add the spreadsheet-style grid and tools for managing listings in bulk.

### 2.1 Grid View

- [x] Integrate jspreadsheet CE library into `lib/`
- [x] Create `editor/components/grid-view.js` wrapper
- [x] Same columns as XLSX template (title, description, price, category, tags, etc.)
- [x] Dropdown cells for: category, who_made, what_is_it, ai_content, when_made, renewal
- [x] Numeric cells for: price, quantity
- [x] Column headers with tooltips (same notes as XLSX template)
- [x] Frozen first column (title) for horizontal scrolling
- [x] Copy/paste support (paste from Excel/Sheets works automatically)
- [x] Right-click context menu: insert row, delete row, duplicate row

### 2.2 View Toggle

- [x] Toolbar toggle: Form View / Grid View buttons
- [x] Shared data model — edits in one view reflect in the other
- [x] Preserve scroll position when switching back
- [x] Grid view syncs cell edits back to data model in real-time

### 2.3 Listing Management Tools

- [x] **Duplicate listing** — clone card/row with one click (SKU auto-increment)
- [x] **Reorder** — drag-to-reorder in form view (drag handles with above/below indicators)
- [x] **Multi-select** — checkboxes in form view + checkbox column in grid view
- [x] **Batch delete** — remove selected listings (with confirmation)
- [x] **Search/filter** — filter by category, status, or text match in title/description/SKU/tags
- [x] **Sort** — sort by title, price, category, validation status

### 2.4 Export

- [x] "Export XLSX" button — generates file using XLSX lib
- [x] "Export CSV" button — standard CSV download via PapaParse
- [x] Exported file includes all current editor listings

### 2.5 Undo/Redo

- [x] Action history stack (max 50 actions)
- [x] Ctrl+Z / Ctrl+Y keyboard shortcuts
- [x] Undo/Redo buttons in footer
- [x] Track: field edits, add/remove listings, reorder, batch operations

---

## Phase 3: Image & File Handling

> Drag/drop images, previews, and digital file attachment.

### 3.1 Image Drag/Drop

- [x] Create `editor/components/image-handler.js`
- [x] Drag/drop zone per listing card (5 image slots)
- [x] Drop multiple images — fills slots in order
- [x] Thumbnail preview generation (canvas resize to ~150px)
- [x] Click thumbnail to view full size in lightbox
- [x] Drag to reorder images within a listing
- [x] Remove image button (X overlay on hover)
- [x] Accepted formats: JPG, PNG, GIF, WEBP

### 3.2 Image URL Support

- [x] Paste image URL into slot — fetch and preview
- [x] Support direct URLs (ending in .jpg/.png) and Dropbox/Google Drive links
- [x] Show loading spinner while fetching
- [x] Error state if URL is unreachable

### 3.3 Digital File Attachment

- [x] Drag/drop zone for digital file per listing
- [x] Show filename + file size after drop
- [x] Display name input (what buyer sees after purchase)
- [ ] Support local file paths (stored as path string for native host)

### 3.4 Image Validation

- [x] Warn if image is < 1000px on shortest side
- [x] Warn if image file is > 10MB
- [x] Reject non-image files dropped in image slots
- [x] Show image dimensions on hover

---

## Phase 4: Advanced Validation & Autoformat

> Batch-level validation, smart formatting, and cross-listing checks.

### 4.1 Batch Validation

- [x] "Validate All" button in toolbar (More menu)
- [x] Scan all listings for issues, generate report
- [x] Issue categories: errors (blocks upload), warnings (allow but flag)
- [x] Jump-to-error — click issue to scroll to the problematic listing/field
- [x] Validation summary badge in toolbar ("3 errors, 5 warnings")

### 4.2 Autoformat

- [x] Title: auto-capitalize first letter of each word ("Title Case All Titles" menu action)
- [x] Title: strip leading/trailing whitespace (on blur + Autoformat All)
- [x] Title: collapse multiple spaces to single space
- [x] Description: preserve intentional line breaks, strip excessive blank lines (on blur + Autoformat All)
- [x] Price: auto-format `5` → `5.00`, `$5.99` → `5.99`
- [x] Tags: lowercase, trim whitespace, remove duplicates silently
- [x] Materials: trim whitespace, remove empty entries

### 4.3 Cross-Listing Checks

- [x] Duplicate title detection across batch (exact match = error, Jaccard > 0.8 = warning)
- [x] Duplicate tag set warning (two listings with identical tags hurts SEO)
- [x] Price outlier detection (< 20% of median batch price)
- [x] Missing image warning (listings without any images)
- [x] Incomplete listing highlight (no tags and no images)

### 4.4 Field-Specific Intelligence (Deferred)

- [ ] SKU: warn on spaces or special characters, suggest format *(deferred — low priority)*
- [ ] Quantity: default 999 for digital, warn if set to 1 (common mistake) *(deferred)*
- [ ] Materials: auto-complete from previously entered materials (stored in chrome.storage) *(deferred — per user)*
- [ ] Category: show category description tooltip on hover *(deferred — needs category description data)*

---

## Phase 5: Tag Intelligence

> Leverage saved tags, suggestions, competitor research, and batch tag tools.

### 5.1 Tag Library Integration

- [x] Create `editor/components/tag-manager.js`
- [x] "Tag Library" button per listing — opens tag picker panel
- [x] Shows saved tag sets from Account tab, grouped by category
- [x] Click a tag set to apply all tags to current listing
- [x] Individual tag toggle (add/remove single tags from saved sets)
- [x] Auto-filter tag library to match listing's selected category

### 5.2 Category-Based Suggestions

- [x] When category is selected, show suggested tags below tag input
- [x] Click suggestion to add it as a tag
- [x] Suggestions sourced from tag library + built-in category defaults
- [x] "Add All Suggestions" button

### 5.3 Competitor Tag Import

- [x] "Import from URL" button in tag section
- [x] Paste Etsy listing URL → extract tags (reuse existing scraper)
- [x] Show extracted tags with checkboxes
- [x] Apply selected tags to current listing
- [x] Option: apply to all listings in batch

### 5.4 Batch Tag Operations

- [x] "Apply tags to all" — add a set of tags to every listing
- [x] "Apply tags to selected" — add tags to checked listings only
- [x] "Remove tag from all" — batch remove a specific tag
- [x] Tag frequency analysis panel — shows which tags are used most/least across batch
- [x] Smart deduplication — warn if multiple listings share exact same tag set

### 5.5 Tag Optimization

- [x] Character count per tag (visual bar, green/yellow/red)
- [x] Duplicate detection within a single listing
- [x] "Similar tag" warning (e.g., "planner" and "planners" — suggest keeping one)
- [x] Tag count indicator per listing (X/13 used)

---

## Phase 6: AI-Powered Generation

> Use AI to generate titles, descriptions, and tags from minimal input.

### 6.1 Infrastructure

- [x] Create `editor/components/ai-generator.js`
- [x] AI API integration (Gemini 2.0 Flash via backend proxy)
- [x] API key management (backend proxied to avoid exposing keys)
- [x] Credit model: 1 credit per AI generation
- [x] Rate limiting and error handling
- [x] Loading states with progress indicators

### 6.2 Title Generation

- [x] "Generate Title" button per listing (AI button on title label)
- [x] Input: description + category + optional keywords
- [x] Output: 3 title suggestions (user picks one or edits)
- [x] SEO-optimized: front-loads important keywords, respects 140-char limit
- [x] Style options: "Descriptive", "SEO-heavy", "Minimal"

### 6.3 Description Generation

- [x] "Generate Description" button per listing (AI button on description label)
- [x] Input: title + category + tags
- [x] Output: structured description with sections
- [x] Style presets via bulk modal
- [x] Edit in-place after generation

### 6.4 Tag Generation

- [x] "Generate Tags" button per listing (AI button on tags label)
- [x] Input: title + description + category
- [x] Output: 13 optimized tags
- [x] Merge with existing tags (don't overwrite user-entered tags)
- [ ] Show confidence score per tag *(deferred — eval scores serve similar purpose)*

### 6.5 Bulk AI Generation

- [x] "AI Generate All" button in toolbar (More menu)
- [x] Scope selector: titles only, descriptions only, tags only, or all
- [x] Apply to: all listings, selected listings, or listings missing the field
- [x] Progress bar with per-listing status
- [x] Estimated credit cost shown before starting
- [ ] Review modal before applying *(deferred — auto-applies with undo support instead)*

### 6.6 Smart Suggestions

- [ ] As user types title, suggest completions based on category trends *(deferred)*
- [ ] After description is entered, auto-suggest tags (passive, non-intrusive) *(deferred)*
- [ ] "Improve" button — refine existing title/description with AI (rewrite, not replace) *(deferred)*

### 6.7 Listing Evaluation (AI Quality Scoring)

- [x] Backend endpoint: `POST /api/v1/evaluate-listing` (Gemini, 2 credits per eval)
- [x] Service layer: `evaluateListing()` and `bulkEvaluate()` in ai-generator.js
- [x] "Evaluate" button per listing card (orange, shows credit cost)
- [x] Score chips on field labels (title, description, tags, price, images) — color-coded good/ok/poor
- [x] Hover tooltips on score chips showing reasoning + improvement suggestions
- [x] Tag-level scoring with weak/poor color highlighting
- [x] Hover tooltips on weak tags with clickable replacement suggestions
- [x] Tooltip usability: transition delays, gap-bridging pseudo-elements, viewport clamping
- [x] Bulk evaluate modal (scope: all/selected/unevaluated, cost display, progress bar, cancel)
- [x] Undo support for all apply actions (title suggestions, tag swaps)
- [x] `_eval_*` keys cleaned from sendToQueue output

---

## Phase 7: Advanced File Handling

> Folder scanning, auto-assignment, and bulk image workflows.

### 7.1 Folder Scanning (via Native Host)

- [ ] "Import from Folder" button in toolbar
- [ ] User selects folder path (native file picker via native host)
- [ ] Native host scans folder, returns file list (images + digital files)
- [ ] Editor displays found files for assignment

### 7.2 Auto-Assignment

- [ ] Match images to listings by filename → SKU (e.g., `SKU-001-cover.jpg` → listing with SKU-001)
- [ ] Match images to listings by filename → title keywords
- [ ] Match by folder structure (each subfolder = one listing)
- [ ] Preview assignment before applying, allow manual overrides

### 7.3 Bulk Image Import

- [ ] Drag folder of images into editor → creates one listing per image (or per group)
- [ ] Naming convention support: `title_1.jpg`, `title_2.jpg` groups into one listing
- [ ] Batch create listings from images, then user fills in metadata

### 7.4 Cloud Storage Support

- [ ] Dropbox folder URL → list files via API
- [ ] Google Drive folder URL → list files via API
- [ ] Preview thumbnails from cloud URLs
- [ ] Store URL references (downloaded at upload time by native host)

---

## Phase 8: Templates & Profiles

> Save and reuse listing configurations.

### 8.1 Listing Templates

- [ ] "Save as Template" button per listing card
- [ ] Name the template (e.g., "Digital Planner", "SVG Bundle")
- [ ] Template saves: category, tags, description template, price, all advanced options
- [ ] Template does NOT save: title, images, digital files, SKU (listing-specific)

### 8.2 Template Management

- [ ] Template picker in toolbar — dropdown of saved templates
- [ ] "New from Template" — creates a listing card pre-filled from template
- [ ] "Apply Template to Selected" — batch-apply to checked listings
- [ ] Edit/delete templates in a management panel
- [ ] Storage: `chrome.storage.sync` for cross-device sync (limit 10 templates)

### 8.3 Quick Duplicate Workflow

- [ ] Duplicate listing → auto-increment SKU (SKU-001 → SKU-002)
- [ ] Duplicate listing → clear title and images (keep everything else)
- [ ] "Create X copies" — bulk duplicate with numbering

---

## Recommended Build Order

| Phase | What | Why First |
|-------|------|-----------|
| **1** | Core editor + form view + validation + sync | Foundation everything else builds on |
| **2** | Grid view + data management | Completes the hybrid editor concept |
| **3** | Image handling | Makes the editor usable for real listings |
| **4** | Advanced validation | Quality gate before upload |
| **5** | Tag intelligence | Leverages existing tag library, high value |
| **6** | AI generation | Premium feature, needs API infrastructure |
| **7** | Advanced file handling | Power user feature, needs native host work |
| **8** | Templates & profiles | Polish, uses patterns established in earlier phases |

---

## Dependencies

| Dependency | Phase | Notes |
|------------|-------|-------|
| jspreadsheet CE + jsuites | Phase 2 | MIT license, ~50KB combined |
| ExcelJS | Phase 2 | Already in project (export) |
| Native Host file scanning | Phase 7 | Extend existing native host |
| AI API (Claude/OpenAI) | Phase 6 | Backend proxy needed |
| Tag Library (Account tab) | Phase 5 | Already built |
| Tag Scraper | Phase 5 | Partially built |

## Manifest Changes

```json
{
  "web_accessible_resources": [{
    "resources": ["editor/editor.html"],
    "matches": ["<all_urls>"]
  }]
}
```

---

## Notes

- The XLSX template remains available as an import/export format but is no longer the primary workflow
- The editor replaces the need for external spreadsheet software
- All editor data persists in `chrome.storage.local` — users never lose work
- The sidepanel remains the upload control center — the editor is for listing creation only
