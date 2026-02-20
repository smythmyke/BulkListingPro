# Claude Coding Instructions

## Project Overview

**BulkListingPro** - A Chrome extension for bulk uploading digital product listings to Etsy with a credit-based pricing model.

**Working Directory:** `C:\Projects\BulkListingPro-extension`

## Related Projects

| Project | Location | Purpose |
|---------|----------|---------|
| **GovToolsPro Extension** | `C:\Projects\GovToolsPro-extension` | Reference for credit system, auth, Chrome extension patterns |
| **Etsy Uploader (Node.js)** | `C:\Projects\etsy-uploader-gumroad` | Existing Playwright-based uploader - selectors and logic to port |
| **XPungeme** | `C:\Users\smyth\OneDrive\Desktop\Projects\XPungeme` | Product data, spreadsheet formats |

## What This Extension Does

1. User installs extension from Chrome Web Store
2. User downloads and installs Native Host helper (one-time)
3. User launches Chrome with debug port (`--remote-debugging-port=9222`)
4. User logs into Etsy in their browser
5. User adds listings via UI form (small batches) or spreadsheet import (bulk)
6. User previews listings in queue
7. User clicks "Upload" - Native Host automates Etsy listing creation via CDP
8. Credits are deducted per listing uploaded
9. Progress tracked in sidepanel, errors reported

## Tech Stack

- **Chrome Extension** (Manifest V3) - UI and coordination
- **Native Host** (Node.js) - Etsy automation via CDP
- **Sidepanel UI** - Main interface
- **Native Messaging** - Extension ↔ Native Host communication
- **Backend API** - Authentication, credit management (TBD: new or shared with GovToolsPro)
- **Firebase** - User data, credits storage
- **Stripe** - Credit purchases

## Architecture Overview

```
Extension (UI) ←→ Native Messaging ←→ Native Host (Node.js) ←→ CDP ←→ User's Chrome
```

**Why this architecture?**
- Extensions cannot access local files by path (security sandbox)
- `showDirectoryPicker()` is broken in Chrome extensions
- Native Host can read local files and control browser via CDP
- Reuses proven automation from etsy-uploader-gumroad

**User setup:**
1. Install extension from Chrome Web Store
2. Download Native Host installer from extension UI (one-time)
3. Launch Chrome with `--remote-debugging-port=9222`

**Input methods:**
- UI Form: For 1-10 listings, drag/drop images directly
- Spreadsheet: For 10+ listings, same format as etsy-uploader-gumroad

## Key Files

| File/Folder | Purpose |
|-------------|---------|
| `manifest.json` | Extension configuration |
| `sidepanel/` | Main UI (HTML, CSS, JS) |
| `content/` | Etsy page automation scripts |
| `background/` | Service worker |
| `services/auth.js` | Google OAuth via chrome.identity |
| `services/credits.js` | Credit balance, Stripe checkout |
| `services/storage.js` | Chrome storage utilities |
| `docs/ARCHITECTURE.md` | System design decisions |
| `docs/ETSY-SELECTORS.md` | DOM selectors for Etsy forms |
| `docs/CREDIT-SYSTEM.md` | Credit pricing and flow |

## Porting from Existing Uploader

The Node.js uploader at `C:\Projects\etsy-uploader-gumroad` has working Etsy automation:

```
etsy-uploader-gumroad/
├── src/
│   ├── listing.js      # Single listing creation logic - PORT THIS
│   ├── selectors.js    # Etsy DOM selectors - PORT THIS
│   ├── batch.js        # Batch processing - REFERENCE
│   └── session.js      # Login handling - ADAPT FOR EXTENSION
├── config/
│   └── default.js      # Settings structure
```

**Key difference:** Playwright controls the browser externally. Chrome extension uses content scripts to control from within.

## Credit System (from GovToolsPro)

Reference implementation in `C:\Projects\GovToolsPro-extension\services\`:

- `auth.js` - Google sign-in with `chrome.identity`
- `api.js` - `useCredits(amount, feature)` pattern
- `storage.js` - Local credit caching

**Credit flow:**
1. `chrome.identity.getAuthToken()` → Google token
2. Exchange with backend → JWT + initial credits
3. On upload: `POST /api/user/credits/use` → deduct
4. Update local storage with new balance

## Core Principles

### File Management
- **Edit Over Create**: ALWAYS prefer editing existing files
- **No Unnecessary Files**: NEVER create files unless necessary
- **No Comments**: DO NOT ADD COMMENTS unless asked

### Code Quality
- **Focused Implementation**: Do what's asked, nothing more
- **Follow Conventions**: Match existing code style
- **Reuse Patterns**: Copy patterns from GovToolsPro, not code

### Security
- **No Secrets**: Never expose API keys or tokens in code
- **User Data**: Handle Etsy credentials carefully (user logs in themselves)

## Common Commands

```bash
# Development (once build system is set up)
npm run dev

# Build for production
npm run build

# Create Chrome Web Store zip
# (Use PowerShell script in project root)
```

## Extension Reload

After making changes:
1. Go to `chrome://extensions/`
2. Click reload button on BulkListingPro
3. Close and reopen sidepanel
4. Refresh Etsy page if testing content scripts

## Current Status

**Phase:** Phase 1 - Foundation (MVP)

**Master Checklist:** See `CHECKLIST.md` for full task tracking

**Quick Status:**
- [x] Project structure created
- [x] Documentation complete
- [x] Basic UI scaffolding done
- [x] Auth system (Google OAuth via chrome.identity)
- [x] Credits service (shared with GovToolsPro backend)
- [x] Stripe checkout integration
- [x] UI animations
- [ ] Single listing upload (next)
- [ ] Native Host integration (next)

**Resolved Decisions:**
1. Backend: Share GovToolsPro API (`business-search-api-815700675676.us-central1.run.app`)
2. Pricing: Same credit packs as GovToolsPro, 2 credits per Etsy listing

Always refer to `CHECKLIST.md` before starting work to see current progress.

## Decisions Made

### 1. File Access & Browser Control
**Decision:** Native Host + CDP connection
- Extension cannot access local files (browser sandbox)
- `showDirectoryPicker()` broken in extensions
- Native Host reads files, connects to user's browser via CDP
- Reuses etsy-uploader-gumroad automation code

### 2. Etsy Session Handling
**Decision:** User logs into Etsy themselves
- User launches Chrome with `--remote-debugging-port=9222`
- User logs into Etsy in their browser
- Native Host connects via CDP to that browser
- No credential handling needed

### 3. Native Host Distribution
**Decision:** Download from extension UI
- User installs extension from Chrome Web Store first
- Extension shows setup screen with download button
- User downloads and runs installer (one-time)
- Keeps Chrome Web Store as entry point for discoverability

### 4. Listing Input
**Decision:** Support both UI Form and Spreadsheet
- UI Form: For small batches (1-10 listings), drag/drop images
- Spreadsheet: For bulk (10+ listings), same format as uploader

## Pricing Model (Shared with GovToolsPro)

**Decision:** Share Stripe products with GovToolsPro backend.

| Pack | Credits | Price | Listings (2 credits each) |
|------|---------|-------|---------------------------|
| Starter | 50 | $1.99 | ~25 listings |
| Standard | 150 | $4.99 | ~75 listings |
| Pro | 400 | $11.99 | ~200 listings |
| Power | 1000 | $24.99 | ~500 listings |

**Credit Cost:** 2 credits per Etsy listing

**Backend API:** `https://business-search-api-815700675676.us-central1.run.app`

Free tier: 10 credits on signup

## File Naming Conventions

- Services: `camelCase.js` (e.g., `etsyAutomation.js`)
- Components: `PascalCase.js` (e.g., `UploadQueue.js`)
- Config: `lowercase.json` (e.g., `selectors.json`)
