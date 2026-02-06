# Listing Editor — Full Tab Build Plan

> **Created:** February 6, 2026
> **Status:** Planning
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

- [ ] Create `editor/editor.html` with base layout (toolbar, view toggle, listing area, footer)
- [ ] Create `editor/editor.css` with styles matching sidepanel theme
- [ ] Create `editor/editor.js` with core data model and state management
- [ ] Add `editor/editor.html` to `manifest.json` web_accessible_resources
- [ ] Add "Open Editor" button to sidepanel
- [ ] `chrome.tabs.create({ url: chrome.runtime.getURL('editor/editor.html') })` on click
- [ ] Prevent opening multiple editor tabs (check for existing tab first)

### 1.2 Form View — Card-Based Editor

- [ ] Create `editor/components/form-view.js`
- [ ] Listing card component with fields:
  - Title (text input, 140 char counter)
  - Description (textarea, line count)
  - Price (number input, auto-format to 2 decimals)
  - Category (searchable dropdown, same 24 categories)
  - Tags (chip input, max 13, max 20 chars each)
  - Image slots (placeholder thumbnails, up to 5)
  - Digital file slot (placeholder)
  - Advanced options (collapsible): who_made, what_is_it, ai_content, when_made, materials, quantity, sku, renewal
- [ ] "Add Listing" button — appends new blank card
- [ ] "Remove Listing" button per card (with confirmation)
- [ ] Listing counter in toolbar ("3 listings")
- [ ] Scrollable card list with smooth animations

### 1.3 Live Validation

- [ ] Create `editor/components/validator.js`
- [ ] Title: live character counter, yellow at 120+, red at 140, block at 141+
- [ ] Price: reject < $0.20, strip `$` and commas on paste, format to `X.XX` on blur
- [ ] Tags: per-tag 20-char limit, auto-trim whitespace, duplicate warning within listing
- [ ] Category: required indicator, must be from valid list
- [ ] Required fields (title, description, price, category): red outline if empty on validate
- [ ] Per-card validation status icon (green check / red warning)

### 1.4 Data Persistence & Sync

- [ ] Autosave to `chrome.storage.local` on every change (debounced 500ms)
- [ ] Load saved data on editor open (resume work)
- [ ] "Send to Queue" button — writes listings to storage, notifies sidepanel
- [ ] Sidepanel reads editor listings into upload queue
- [ ] Clear editor data option after successful queue transfer
- [ ] Handle edge case: sidepanel closed when "Send to Queue" clicked

### 1.5 Import Support

- [ ] Drag/drop zone for XLSX/CSV files (reuse existing parse logic)
- [ ] Parse spreadsheet into listing cards
- [ ] Merge imported listings with existing editor listings (append)
- [ ] Show import summary ("Imported 15 listings, 2 had validation warnings")

---

## Phase 2: Grid View & Data Management

> Add the spreadsheet-style grid and tools for managing listings in bulk.

### 2.1 Grid View

- [ ] Integrate jspreadsheet CE library into `lib/`
- [ ] Create `editor/components/grid-view.js` wrapper
- [ ] Same columns as XLSX template (title, description, price, category, tags, etc.)
- [ ] Dropdown cells for: category, who_made, what_is_it, ai_content, when_made, renewal
- [ ] Numeric cells for: price, quantity
- [ ] Column headers with tooltips (same notes as XLSX template)
- [ ] Frozen first column (title) for horizontal scrolling
- [ ] Copy/paste support (paste from Excel/Sheets works automatically)
- [ ] Right-click context menu: insert row, delete row, duplicate row

### 2.2 View Toggle

- [ ] Toolbar toggle: Form View / Grid View buttons
- [ ] Shared data model — edits in one view reflect in the other
- [ ] Preserve scroll position when switching back
- [ ] Grid view syncs cell edits back to data model in real-time

### 2.3 Listing Management Tools

- [ ] **Duplicate listing** — clone card/row with one click
- [ ] **Reorder** — drag-to-reorder in form view, row drag in grid view
- [ ] **Multi-select** — checkboxes for batch operations
- [ ] **Batch delete** — remove selected listings
- [ ] **Search/filter** — filter by category, status, or text match in title
- [ ] **Sort** — sort by title, price, category, validation status

### 2.4 Export

- [ ] "Export XLSX" button — generates file using ExcelJS (same format as template)
- [ ] "Export CSV" button — standard CSV download
- [ ] Exported file includes all current editor listings

### 2.5 Undo/Redo

- [ ] Action history stack (max 50 actions)
- [ ] Ctrl+Z / Ctrl+Y keyboard shortcuts
- [ ] Undo/Redo buttons in toolbar
- [ ] Track: field edits, add/remove listings, reorder, batch operations

---

## Phase 3: Image & File Handling

> Drag/drop images, previews, and digital file attachment.

### 3.1 Image Drag/Drop

- [ ] Create `editor/components/image-handler.js`
- [ ] Drag/drop zone per listing card (5 image slots)
- [ ] Drop multiple images — fills slots in order
- [ ] Thumbnail preview generation (canvas resize to ~150px)
- [ ] Click thumbnail to view full size in lightbox
- [ ] Drag to reorder images within a listing
- [ ] Remove image button (X overlay on hover)
- [ ] Accepted formats: JPG, PNG, GIF, WEBP

### 3.2 Image URL Support

- [ ] Paste image URL into slot — fetch and preview
- [ ] Support direct URLs (ending in .jpg/.png) and Dropbox/Google Drive links
- [ ] Show loading spinner while fetching
- [ ] Error state if URL is unreachable

### 3.3 Digital File Attachment

- [ ] Drag/drop zone for digital file per listing
- [ ] Show filename + file size after drop
- [ ] Display name input (what buyer sees after purchase)
- [ ] Support local file paths (stored as path string for native host)

### 3.4 Image Validation

- [ ] Warn if image is < 1000px on shortest side
- [ ] Warn if image file is > 10MB
- [ ] Reject non-image files dropped in image slots
- [ ] Show image dimensions on hover

---

## Phase 4: Advanced Validation & Autoformat

> Batch-level validation, smart formatting, and cross-listing checks.

### 4.1 Batch Validation

- [ ] "Validate All" button in toolbar
- [ ] Scan all listings for issues, generate report
- [ ] Issue categories: errors (blocks upload), warnings (allow but flag)
- [ ] Jump-to-error — click issue to scroll to the problematic listing/field
- [ ] Validation summary badge in toolbar ("3 errors, 5 warnings")

### 4.2 Autoformat

- [ ] Title: auto-capitalize first letter of each word (optional toggle)
- [ ] Title: strip leading/trailing whitespace
- [ ] Title: collapse multiple spaces to single space
- [ ] Description: preserve intentional line breaks, strip excessive blank lines
- [ ] Price: auto-format `5` → `5.00`, `$5.99` → `5.99`
- [ ] Tags: lowercase, trim whitespace, remove duplicates silently
- [ ] Materials: trim whitespace, remove empty entries

### 4.3 Cross-Listing Checks

- [ ] Duplicate title detection across batch (exact and fuzzy)
- [ ] Duplicate tag set warning (two listings with identical tags hurts SEO)
- [ ] Price outlier detection (one listing at $0.20 when others are $5+)
- [ ] Missing image warning (listings without any images)
- [ ] Incomplete listing highlight (missing optional but recommended fields)

### 4.4 Field-Specific Intelligence

- [ ] SKU: warn on spaces or special characters, suggest format
- [ ] Quantity: default 999 for digital, warn if set to 1 (common mistake)
- [ ] Materials: auto-complete from previously entered materials (stored in chrome.storage)
- [ ] Category: show category description tooltip on hover

---

## Phase 5: Tag Intelligence

> Leverage saved tags, suggestions, competitor research, and batch tag tools.

### 5.1 Tag Library Integration

- [ ] Create `editor/components/tag-manager.js`
- [ ] "Tag Library" button per listing — opens tag picker panel
- [ ] Shows saved tag sets from Account tab, grouped by category
- [ ] Click a tag set to apply all tags to current listing
- [ ] Individual tag toggle (add/remove single tags from saved sets)
- [ ] Auto-filter tag library to match listing's selected category

### 5.2 Category-Based Suggestions

- [ ] When category is selected, show suggested tags below tag input
- [ ] Click suggestion to add it as a tag
- [ ] Suggestions sourced from tag library + built-in category defaults
- [ ] "Add All Suggestions" button

### 5.3 Competitor Tag Import

- [ ] "Import from URL" button in tag section
- [ ] Paste Etsy listing URL → extract tags (reuse existing scraper)
- [ ] Show extracted tags with checkboxes
- [ ] Apply selected tags to current listing
- [ ] Option: apply to all listings in batch

### 5.4 Batch Tag Operations

- [ ] "Apply tags to all" — add a set of tags to every listing
- [ ] "Apply tags to selected" — add tags to checked listings only
- [ ] "Remove tag from all" — batch remove a specific tag
- [ ] Tag frequency analysis panel — shows which tags are used most/least across batch
- [ ] Smart deduplication — warn if multiple listings share exact same tag set

### 5.5 Tag Optimization

- [ ] Character count per tag (visual bar, green/yellow/red)
- [ ] Duplicate detection within a single listing
- [ ] "Similar tag" warning (e.g., "planner" and "planners" — suggest keeping one)
- [ ] Tag count indicator per listing (X/13 used)

---

## Phase 6: AI-Powered Generation

> Use AI to generate titles, descriptions, and tags from minimal input.

### 6.1 Infrastructure

- [ ] Create `editor/components/ai-generator.js`
- [ ] AI API integration (Claude API or OpenAI — TBD)
- [ ] API key management (backend proxied to avoid exposing keys)
- [ ] Credit model: 1 credit per AI generation, or bundled (TBD)
- [ ] Rate limiting and error handling
- [ ] Loading states with progress indicators

### 6.2 Title Generation

- [ ] "Generate Title" button per listing
- [ ] Input: description + category + optional keywords
- [ ] Output: 3 title suggestions (user picks one or edits)
- [ ] SEO-optimized: front-loads important keywords, respects 140-char limit
- [ ] Style options: "Descriptive", "SEO-heavy", "Minimal"

### 6.3 Description Generation

- [ ] "Generate Description" button per listing
- [ ] Input: title + category + images (if available) + optional notes
- [ ] Output: structured description with sections:
  - Hook/intro line
  - What's included
  - Features/specs
  - How to use / file formats
  - Call to action
- [ ] Tone presets: "Professional", "Casual/Friendly", "Luxury/Premium"
- [ ] Edit in-place after generation

### 6.4 Tag Generation

- [ ] "Generate Tags" button per listing
- [ ] Input: title + description + category
- [ ] Output: 13 optimized tags, ranked by estimated search volume
- [ ] Merge with existing tags (don't overwrite user-entered tags)
- [ ] Show confidence score per tag

### 6.5 Bulk AI Generation

- [ ] "AI Generate All" button in toolbar
- [ ] Scope selector: titles only, descriptions only, tags only, or all
- [ ] Apply to: all listings, selected listings, or listings missing the field
- [ ] Progress bar with per-listing status
- [ ] Review modal before applying — user approves or edits each suggestion
- [ ] Estimated credit cost shown before starting

### 6.6 Smart Suggestions

- [ ] As user types title, suggest completions based on category trends
- [ ] After description is entered, auto-suggest tags (passive, non-intrusive)
- [ ] "Improve" button — refine existing title/description with AI (rewrite, not replace)

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
