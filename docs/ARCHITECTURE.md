# BulkListingPro Architecture

> **Last Updated:** February 3, 2026
> **Status:** Approved

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Sidepanel UI                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │ Setup/      │  │ Listing     │  │ Upload      │       │   │
│  │  │ Install     │  │ Input       │  │ Queue       │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Background Service Worker                    │   │
│  │  • Native Messaging communication                         │   │
│  │  • Etsy page detection                                    │   │
│  │  • Upload state management                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                       Native Messaging
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Native Host (Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  • Receives commands from extension                              │
│  • Connects to browser via CDP (port 9222)                       │
│  • Executes Etsy automation (reused from etsy-uploader)          │
│  • Reads local files (images, digital files)                     │
│  • Reports progress back to extension                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                        CDP Connection
                              │
┌─────────────────────────────────────────────────────────────────┐
│            User's Chrome Browser (debug mode)                    │
│            Launched with: --remote-debugging-port=9222           │
├─────────────────────────────────────────────────────────────────┤
│  • User's actual browser session                                 │
│  • Already logged into Etsy                                      │
│  • Native host controls via Chrome DevTools Protocol             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Backend API    │
                    │   (Cloud Run)    │
                    ├──────────────────┤
                    │ • Auth           │
                    │ • Credits        │
                    │ • Usage tracking │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Firebase │  │  Stripe  │  │ Analytics│
        │ Firestore│  │ Payments │  │          │
        └──────────┘  └──────────┘  └──────────┘
```

## Key Architecture Decisions

### Why Native Host + CDP?

| Approach | Problem |
|----------|---------|
| Extension-only with content scripts | Cannot access local files by path |
| Extension with File System Access API | `showDirectoryPicker()` broken in extensions |
| Playwright launching new browser | Can't use user's existing Etsy session |
| **Native Host + CDP** | ✅ Reuses existing uploader, accesses local files, uses user's session |

### Why Native Messaging?

Chrome extensions cannot execute Node.js directly. Native Messaging is Chrome's official API for extensions to communicate with local applications.

## User Flow

### First-Time Setup

```
1. User installs extension from Chrome Web Store

2. User opens sidepanel → sees setup screen:
   ┌─────────────────────────────────────────────┐
   │  ⚠️  Setup Required                         │
   │                                             │
   │  To upload listings with local files,       │
   │  install the BulkListingPro helper.         │
   │                                             │
   │  [Download for Windows]                     │
   │  [Download for Mac]                         │
   │                                             │
   │  After installing, click Verify:            │
   │  [Verify Installation]                      │
   └─────────────────────────────────────────────┘

3. User downloads and runs installer
   - Installs Node.js helper to Program Files
   - Registers Native Messaging manifest with Chrome

4. User clicks "Verify Installation" → success

5. Setup complete (never shown again)
```

### Regular Usage

```
1. User launches Chrome with debug port:
   chrome.exe --remote-debugging-port=9222

2. User logs into Etsy (if not already)

3. User opens extension sidepanel

4. User adds listings via:
   - UI Form (for small batches, 1-10 listings)
   - Spreadsheet import (for bulk, 10+ listings)

5. User reviews queue

6. User clicks "Start Upload"

7. Extension sends listings to Native Host

8. Native Host:
   - Connects to browser via CDP
   - Creates listings on Etsy using existing automation
   - Reports progress back to extension

9. User sees real-time progress in sidepanel

10. Complete → summary shown
```

## Component Details

### Sidepanel UI (`sidepanel/`)

Primary user interface.

**Screens:**

| Screen | Purpose |
|--------|---------|
| Setup | First-time native host installation |
| Listing Form | Add single listing with drag/drop images |
| Spreadsheet Import | Upload XLSX for bulk listings |
| Queue | Review listings before upload |
| Progress | Real-time upload status |
| Results | Summary after completion |

**Listing Form UI:**

```
┌─────────────────────────────────────────────┐
│  Add Listing                                │
├─────────────────────────────────────────────┤
│  Title: [________________________]          │
│                                             │
│  Description:                               │
│  [_____________________________]            │
│  [_____________________________]            │
│                                             │
│  Price: [$___.__]  Quantity: [___]          │
│                                             │
│  Category: [Dropdown_____________]          │
│                                             │
│  Images (drag & drop or click to browse):   │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │ + │ │ 🖼 │ │ 🖼 │ │   │ │   │            │
│  └───┘ └───┘ └───┘ └───┘ └───┘            │
│                                             │
│  Digital File:                              │
│  [________________________] [Browse]        │
│                                             │
│  Tags:                                      │
│  [tag1] [tag2] [tag3] [+ add tag]          │
│                                             │
│  [Add to Queue]  [Clear]                    │
└─────────────────────────────────────────────┘
```

**Input Methods:**

| Method | Best For | File Handling |
|--------|----------|---------------|
| UI Form | 1-10 listings | Drag/drop images (stored as temp files), browse for digital file path |
| Spreadsheet | 10+ listings | File paths or URLs in columns |

### Background Service Worker (`background/`)

**Responsibilities:**
- Detect Etsy pages and auto-open sidepanel
- Communicate with Native Host via `chrome.runtime.connectNative()`
- Manage upload state
- Handle authentication with backend API

### Native Host (`native-host/`)

Node.js application installed separately.

**Location after install:**
- Windows: `C:\Program Files\BulkListingPro\`
- Mac: `/Applications/BulkListingPro/`

**Components:**
- `host.js` - Native Messaging entry point
- `uploader.js` - Reused from etsy-uploader-gumroad
- `manifest.json` - Native Messaging manifest (registered with Chrome)

**Communication:**
```javascript
// Extension sends:
{
  type: 'START_UPLOAD',
  listings: [...],
  settings: { delayBetweenListings: 8000 }
}

// Native Host responds with progress:
{
  type: 'PROGRESS',
  current: 3,
  total: 10,
  currentListing: 'Product Name',
  status: 'uploading'
}

// Native Host responds with completion:
{
  type: 'COMPLETE',
  results: [
    { title: '...', success: true },
    { title: '...', success: false, error: '...' }
  ]
}
```

## Spreadsheet Format

Compatible with existing etsy-uploader-gumroad format:

| Column | Required | Example |
|--------|----------|---------|
| sku | No | PROD-001 |
| title | Yes | "My Product Title" |
| description | Yes | "Product description..." |
| price | Yes | 9.99 |
| quantity | No | 999 (default) |
| category | No | "Guides & How Tos" (default) |
| image_1 - image_5 | No | Local path or URL |
| digital_file_1 | No | Local path or URL |
| digital_file_name_1 | No | "download.zip" |
| tag_1 - tag_13 | No | "planner" |
| listing_state | No | "draft" or "active" |

## Anti-Detection Strategy

Reused from etsy-uploader-gumroad:

| Technique | Implementation |
|-----------|----------------|
| No automation flags | CDP connection to real browser |
| Human-like timing | `slowMo: 50ms` on all actions |
| Typing delay | 30ms between keystrokes |
| Listing delay | 8-11 seconds between listings (with jitter) |
| Real browser profile | User's actual Chrome with cookies/history |
| Session persistence | User already logged into Etsy |

## Installation Package

### Native Host Installer Contents

**Windows (`BulkListingPro-Setup.exe`):**
```
Installs to: C:\Program Files\BulkListingPro\
├── node.exe (bundled Node.js runtime)
├── host.js
├── uploader/
│   ├── listing.js
│   ├── session.js
│   ├── batch.js
│   └── selectors.js
├── node_modules/
│   └── playwright-core/
└── manifest.json (copied to Chrome NativeMessagingHosts)
```

**Registry entry (Windows):**
```
HKCU\Software\Google\Chrome\NativeMessagingHosts\com.bulklistingpro.host
= "C:\Program Files\BulkListingPro\manifest.json"
```

## Message Protocol

### Extension ↔ Native Host

```javascript
// Start upload
{ type: 'START_UPLOAD', listings: [...], settings: {...} }

// Progress update
{ type: 'PROGRESS', current: 3, total: 10, status: 'uploading', currentListing: '...' }

// Single listing complete
{ type: 'LISTING_COMPLETE', index: 3, success: true }

// Single listing failed
{ type: 'LISTING_ERROR', index: 3, error: 'Element not found' }

// All complete
{ type: 'COMPLETE', results: [...] }

// Pause/Resume
{ type: 'PAUSE' }
{ type: 'RESUME' }

// Cancel
{ type: 'CANCEL' }
```

## Security Considerations

1. **No Etsy credentials stored** - User logs in themselves
2. **Local files only** - Native host reads from user's disk, nothing uploaded to our servers
3. **Native Messaging security** - Only our extension can communicate with native host
4. **CDP local only** - Debug port only accepts localhost connections
5. **Signed installer** - Native host installer will be code-signed

## Future Enhancements

1. **Templates** - Save common settings (category, default tags)
2. **Scheduled uploads** - Queue for later execution
3. **Analytics** - Upload success rates, timing stats
4. **Multi-shop** - Support multiple Etsy shops
5. **Other platforms** - Amazon Handmade, Shopify
