# BulkListingPro Build Plan: Architecture Upgrade

> **Created:** February 5, 2026
> **Goal:** Reduce user friction by eliminating debug port requirement
> **Target:** Hybrid architecture with optional Native Host

---

## Pre-Work: Save Current Version

### Step 1: Initialize Git Repository
```bash
git init
git add .
git commit -m "v0.1.0 - MVP with Native Host + CDP architecture"
```

### Step 2: Create GitHub Repository
- Create `BulkListingPro` repo on GitHub (private initially)
- Push current code as baseline
- Tag as `v0.1.0-native-host`

---

## Pre-Work: Test Current Functionality

Before making architectural changes, document what works and what doesn't.

### Test Matrix - Current Architecture

| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| **Setup Flow** | | | |
| Native Host detection | Open sidepanel without native host | Shows install prompt | [ ] |
| Debug port detection | Open without `--remote-debugging-port` | Shows launch instructions | [ ] |
| Etsy login detection | Open without Etsy login | Shows login prompt | [ ] |
| Full setup complete | All 3 checks pass | Shows main UI | [ ] |
| **Authentication** | | | |
| Google sign-in | Click "Sign in with Google" | OAuth popup, user signed in | [ ] |
| Sign-out | Click sign-out button | Returns to auth screen | [ ] |
| Session persistence | Close/reopen sidepanel | User still signed in | [ ] |
| **Credits** | | | |
| Balance display | Sign in with credits | Shows correct balance | [ ] |
| Buy credits modal | Click "Buy Credits" | Modal shows packs | [ ] |
| Stripe redirect | Select pack, click buy | Opens Stripe checkout | [ ] |
| Insufficient credits | Try upload with 0 credits | Shows buy modal | [ ] |
| **Single Listing Form** | | | |
| Add listing to queue | Fill form, click "Add to Queue" | Listing appears in queue | [ ] |
| Image drag/drop | Drop images onto zone | Previews shown | [ ] |
| Validation | Submit with missing title | Error shown | [ ] |
| **Spreadsheet Import** | | | |
| XLSX import | Drop .xlsx file | Listings parsed and queued | [ ] |
| CSV import | Drop .csv file | Listings parsed and queued | [ ] |
| Validation errors | Import with missing fields | Errors shown per row | [ ] |
| **Upload Flow** | | | |
| Start upload | Click "Start Upload" | Progress UI shows | [ ] |
| Listing creation | Watch Etsy tab | Form fills, listing created | [ ] |
| Credit deduction | After successful listing | Balance decreases by 2 | [ ] |
| Progress tracking | During upload | X of Y updates correctly | [ ] |
| **Interrupt Controls** | | | |
| Pause | Click pause during upload | Upload pauses | [ ] |
| Resume | Click resume | Upload continues | [ ] |
| Skip | Click skip | Current listing skipped, next starts | [ ] |
| Cancel | Click cancel | Upload stops, results shown | [ ] |
| **Results** | | | |
| Success display | After upload completes | Shows success/fail counts | [ ] |
| Error details | After failed listing | Shows error message | [ ] |
| Upload more | Click "Upload More" | Returns to queue view | [ ] |

### Known Issues to Document
- [ ] List any selectors that fail on current Etsy DOM
- [ ] List any timing issues
- [ ] List any error states not handled

---

## Phase A: Foundation Improvements (No Architecture Change)

These can be done without changing the core architecture.

### A.1 Progress Persistence ✅ COMPLETE
**Priority:** High
**Risk:** Low

Save upload state to `chrome.storage.local` so recovery is possible after crash/close.

**Tasks:**
- [x] Save queue state on every queue change
- [x] Save upload progress (current index, results so far)
- [x] On sidepanel load, check for interrupted upload
- [x] Prompt user: "Resume interrupted upload?" or "Clear and start fresh"
- [x] Clear saved state on successful completion

**Files modified:**
- `sidepanel/sidepanel.js` - Added save/restore logic, resume dialog
- `sidepanel/sidepanel.css` - Added resume dialog styles

### A.2 Listing Templates
**Priority:** Medium
**Risk:** Low

Let users save and reuse listing configurations.

**Tasks:**
- [ ] Add "Save as Template" button to form
- [ ] Store templates in `chrome.storage.sync` (syncs across devices)
- [ ] Add template dropdown to form
- [ ] Load template fills form fields
- [ ] Manage templates (rename, delete)

**Data structure:**
```javascript
{
  templates: [
    {
      id: "uuid",
      name: "Digital Planner",
      category: "Guides & How Tos",
      description: "Template description...",
      tags: "planner, digital, goodnotes",
      price: "4.99"
    }
  ]
}
```

**Files to modify:**
- `sidepanel/sidepanel.html` - Template UI
- `sidepanel/sidepanel.js` - Template CRUD logic

### A.3 Search & Replace in Queue
**Priority:** Low
**Risk:** Low

Find and replace text across all queued listings.

**Tasks:**
- [ ] Add "Search & Replace" button to queue section
- [ ] Modal with: Find text, Replace with, Scope (title/description/tags/all)
- [ ] Preview matches before applying
- [ ] Apply changes to queue (not yet uploaded)

**Files to modify:**
- `sidepanel/sidepanel.html` - Modal UI
- `sidepanel/sidepanel.js` - Search/replace logic

### A.4 Captcha/Verification Detection ✅ COMPLETE
**Priority:** High
**Risk:** Low

Pause upload if Etsy shows verification prompt.

**Tasks:**
- [x] In `listing.js`, before each action check for captcha selectors
- [x] Known selectors: `[data-captcha]`, `.captcha-container`, verification modal
- [x] If detected, send `VERIFICATION_REQUIRED` message
- [x] Sidepanel shows alert: "Etsy requires verification. Complete it and click Resume."
- [x] Pause automatically, wait for user to resume

**Files modified:**
- `native-host/src/listing.js` - Added checkForVerification(), waitForVerificationCleared(), VerificationRequiredError
- `native-host/host.js` - Added VERIFICATION_REQUIRED message handling, onVerificationRequired callback
- `background/service-worker.js` - Added VERIFICATION_REQUIRED listener
- `sidepanel/sidepanel.js` - Handle verification_required status in UPLOAD_PROGRESS

---

## Phase B: chrome.debugger Migration

**Goal:** Eliminate `--remote-debugging-port=9222` requirement

### B.1 Architecture Overview

**Current:**
```
Sidepanel → Native Messaging → Native Host → CDP (external port 9222) → Chrome
```

**New:**
```
Sidepanel → Background Worker → chrome.debugger API → Etsy Tab
                ↓
        Native Host (file reading only, when needed)
```

### B.2 Add debugger Permission
**Risk:** Low

**Tasks:**
- [ ] Add `"debugger"` to permissions in `manifest.json`
- [ ] Test that extension still loads
- [ ] Document: User will see "debugging" banner during uploads

**Files to modify:**
- `manifest.json`

### B.3 Create CDP Service in Extension
**Risk:** Medium

Port CDP logic from Native Host to background service worker.

**Tasks:**
- [ ] Create `services/cdp.js` - Chrome debugger wrapper
- [ ] Implement `attach(tabId)` - Attach debugger to tab
- [ ] Implement `detach(tabId)` - Detach debugger
- [ ] Implement `sendCommand(method, params)` - Send CDP command
- [ ] Implement `evaluate(expression)` - Run JS in page
- [ ] Implement `waitForSelector(selector)` - Poll for element
- [ ] Implement `click(selector)` - Click element (use Input.dispatchMouseEvent for trusted events)
- [ ] Implement `type(selector, text)` - Type into input
- [ ] Implement `setFileInput(selector, files)` - Set file input (base64)
- [ ] Handle debugger detach events (user closed banner)

**Files to create:**
- `services/cdp.js`

**Reference:**
- `native-host/src/cdp.js` - Port this logic

### B.4 Create Listing Service in Extension
**Risk:** Medium

Port listing automation from Native Host to extension.

**Tasks:**
- [ ] Create `services/etsyAutomation.js`
- [ ] Port `selectCategory()` from `listing.js`
- [ ] Port `fillItemDetails()` from `listing.js`
- [ ] Port `fillAboutTab()` from `listing.js`
- [ ] Port `fillPriceTab()` from `listing.js`
- [ ] Port `fillTags()` from `listing.js`
- [ ] Port `saveListing()` from `listing.js`
- [ ] Adapt file upload to use base64 data instead of file paths
- [ ] Add abort/pause/skip support

**Files to create:**
- `services/etsyAutomation.js`

**Reference:**
- `native-host/src/listing.js` - Port this logic

### B.5 Update Background Service Worker
**Risk:** Medium

Add upload orchestration to background worker.

**Tasks:**
- [ ] Import new CDP and automation services
- [ ] Add `START_UPLOAD_DIRECT` message handler (no native host)
- [ ] Implement upload loop with progress messages
- [ ] Handle pause/resume/cancel
- [ ] Send progress to sidepanel via `chrome.runtime.sendMessage`

**Files to modify:**
- `background/service-worker.js`

### B.6 Update Sidepanel for Direct Upload
**Risk:** Low

Add "Lite Mode" that doesn't require Native Host.

**Tasks:**
- [ ] Detect if Native Host is available
- [ ] If available: Show full setup, enable spreadsheet mode
- [ ] If not available: Show simplified setup, enable form-only mode
- [ ] For form mode: Read dropped images as base64 (not file paths)
- [ ] Store image data in listing object
- [ ] Route upload to direct mode (chrome.debugger) or native mode

**Files to modify:**
- `sidepanel/sidepanel.js`
- `sidepanel/sidepanel.html` - Update setup instructions

### B.7 Update Setup Flow
**Risk:** Low

Simplify setup for users without Native Host.

**New Setup Flow (Lite Mode):**
1. ~~Install Native Host~~ (optional)
2. ~~Launch Chrome with debug port~~ (not needed)
3. Log into Etsy
4. Ready to upload!

**New Setup Flow (Power Mode - with Native Host):**
1. Install Native Host (for spreadsheet import)
2. Log into Etsy
3. Ready to upload!

**Tasks:**
- [ ] Remove debug port check from required setup
- [ ] Make Native Host optional in setup screen
- [ ] Show "Lite Mode" vs "Power Mode" based on native host availability
- [ ] Update setup instructions text

**Files to modify:**
- `sidepanel/sidepanel.js` - `checkSetup()` function
- `sidepanel/sidepanel.html` - Setup section

---

## Phase C: Native Host Simplification

**Goal:** Native Host becomes a file server only

### C.1 Simplify Native Host
**Risk:** Low

Remove CDP/automation code, keep only file reading.

**Tasks:**
- [ ] Remove CDP connection code from `host.js`
- [ ] Remove listing automation code
- [ ] Keep message handling for file operations
- [ ] Add `READ_FILE` message type - returns base64
- [ ] Add `READ_SPREADSHEET` message type - returns parsed data
- [ ] Add `LIST_DIRECTORY` message type - returns file list (for image folder selection)

**New message types:**
```javascript
// Request
{ type: 'READ_FILE', payload: { path: 'C:\\Products\\image.jpg' } }
// Response
{ type: 'FILE_DATA', payload: { path: '...', data: 'base64...', mimeType: 'image/jpeg' } }

// Request
{ type: 'READ_SPREADSHEET', payload: { path: 'C:\\Products\\listings.xlsx' } }
// Response
{ type: 'SPREADSHEET_DATA', payload: { rows: [...] } }
```

**Files to modify:**
- `native-host/host.js` - Simplify to file operations only

### C.2 Update nativeHost Service
**Risk:** Low

Update extension service to use new message types.

**Tasks:**
- [ ] Add `readFile(path)` method - returns base64
- [ ] Add `readSpreadsheet(path)` method - returns parsed rows
- [ ] Remove CDP-related methods
- [ ] Keep connection management

**Files to modify:**
- `services/nativeHost.js`

### C.3 Spreadsheet Import with Native Host
**Risk:** Medium

For power users: Import spreadsheet, resolve file paths via Native Host.

**Flow:**
1. User drops spreadsheet in sidepanel
2. Sidepanel parses spreadsheet (already works)
3. For each listing with image paths:
   - Send `READ_FILE` to Native Host
   - Receive base64 data
   - Store in listing object
4. Upload via chrome.debugger (same as lite mode)

**Tasks:**
- [ ] After spreadsheet parse, identify listings with file paths
- [ ] Batch request files from Native Host
- [ ] Convert paths to base64 data in listing objects
- [ ] Proceed with normal upload flow

**Files to modify:**
- `sidepanel/sidepanel.js` - `processSpreadsheet()` function

---

## Phase D: Testing & Validation

### D.1 Test Matrix - New Architecture

| Test Case | Lite Mode | Power Mode | Status |
|-----------|-----------|------------|--------|
| **Setup** | | | |
| No native host installed | Shows lite mode | N/A | [ ] |
| Native host installed | Shows power mode option | Full features | [ ] |
| **Form Upload (Lite)** | | | |
| Drag/drop images | Images as base64 | Same | [ ] |
| Fill form, upload | chrome.debugger automation | Same | [ ] |
| Debugger banner shown | Yes | Yes | [ ] |
| User closes banner | Upload pauses, prompt shown | Same | [ ] |
| **Spreadsheet Upload (Power)** | | | |
| Drop spreadsheet | N/A (greyed out) | Parses file | [ ] |
| File path resolution | N/A | Native Host reads files | [ ] |
| Upload with resolved files | N/A | chrome.debugger automation | [ ] |
| **All Upload Features** | | | |
| Pause/Resume | Works | Works | [ ] |
| Skip | Works | Works | [ ] |
| Cancel | Works | Works | [ ] |
| Captcha detection | Pauses, alerts user | Same | [ ] |
| Progress persistence | Saves state | Same | [ ] |
| Credit deduction | 2 per listing | Same | [ ] |

### D.2 Regression Testing

Ensure nothing broke from original functionality:
- [ ] All Phase A tests still pass
- [ ] Auth flow unchanged
- [ ] Credit system unchanged
- [ ] UI animations unchanged

### D.3 Edge Case Testing

- [ ] Upload 1 listing (minimum)
- [ ] Upload 50 listings (stress test)
- [ ] Network disconnect during upload
- [ ] Etsy session expires during upload
- [ ] User navigates away from Etsy during upload
- [ ] User closes sidepanel during upload
- [ ] Multiple Etsy tabs open

---

## Implementation Order

### Recommended Sequence

1. **Git setup** - Save current working version
2. **Phase A.1** - Progress persistence (safety net for testing)
3. **Phase A.4** - Captcha detection (account protection)
4. **Test current architecture** - Fill out test matrix
5. **Phase B.2** - Add debugger permission
6. **Phase B.3** - Create CDP service
7. **Phase B.4** - Create listing service
8. **Phase B.5** - Update background worker
9. **Phase B.6-B.7** - Update sidepanel and setup
10. **Test lite mode** - Form upload without native host
11. **Phase C** - Simplify native host
12. **Test power mode** - Spreadsheet with native host
13. **Phase A.2-A.3** - Templates and search/replace (nice to have)
14. **Full regression testing**

### Time Estimates

Not providing time estimates per instructions, but relative complexity:

| Phase | Complexity | Dependencies |
|-------|------------|--------------|
| Git setup | Trivial | None |
| Phase A.1 | Low | None |
| Phase A.4 | Low | None |
| Phase B.2 | Trivial | None |
| Phase B.3 | Medium | B.2 |
| Phase B.4 | Medium | B.3 |
| Phase B.5 | Medium | B.3, B.4 |
| Phase B.6-B.7 | Low | B.5 |
| Phase C | Low | B complete |
| Phase A.2-A.3 | Low | None |

---

## Rollback Plan

If new architecture has critical issues:

1. Git tag current working version before each phase
2. Keep Native Host automation code in separate branch
3. Feature flag: `USE_CHROME_DEBUGGER` in storage
4. If issues: flip flag to false, use old native host path

---

## Files Summary

### New Files to Create
- `services/cdp.js` - Chrome debugger wrapper
- `services/etsyAutomation.js` - Listing automation

### Files to Modify
- `manifest.json` - Add debugger permission
- `background/service-worker.js` - Add direct upload orchestration
- `sidepanel/sidepanel.js` - Dual mode support, progress persistence
- `sidepanel/sidepanel.html` - Updated setup UI
- `services/nativeHost.js` - Simplified to file operations
- `native-host/host.js` - Remove automation, keep file reading
- `native-host/src/listing.js` - Add captcha detection (then deprecate)

### Files to Deprecate (Phase C)
- `native-host/src/cdp.js` - Replaced by `services/cdp.js`
- `native-host/src/listing.js` - Replaced by `services/etsyAutomation.js`

---

## Success Criteria

### MVP Success (Lite Mode)
- [ ] User can install extension and upload listings WITHOUT:
  - Installing Native Host
  - Launching Chrome with debug flags
- [ ] Only requirements: Install extension, sign in, log into Etsy
- [ ] Form-based upload works with drag/drop images

### Full Success (Power Mode)
- [ ] Spreadsheet import works with Native Host
- [ ] File paths resolved to base64 automatically
- [ ] Same upload reliability as current architecture

### User Experience
- [ ] Setup reduced from 3 steps to 1 step (for lite mode)
- [ ] "Debugging" banner is only friction (acceptable)
- [ ] Clear messaging about lite vs power mode capabilities
