# Research Feature Build Document

> **Created:** February 5, 2026
> **Status:** Planning
> **Priority:** Tier 1 Feature

---

## Overview

Add a Research tab to BulkListingPro that allows users to capture competitor listing data and apply it to their own listings. Uses a persistent "Research Clipboard" that integrates with both the Create Listing form and Queue management.

---

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIDEPANEL                                │
├─────────────────────────────────────────────────────────────────┤
│  [Create]  [Queue]  [Research]  [Account]     ← Tab Navigation  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📋 Research Clipboard (persistent, visible in all tabs)  │  │
│  │ "Mega SVG Bundle" | Tags(13) | $4.99        [Clear ✕]    │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [Tab Content Area]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
[Etsy Listing Page]
        │
        ▼ (Capture button clicked)
[Content Script extracts data]
        │
        ▼
[Research Clipboard (chrome.storage.local)]
        │
        ├──► [Create Listing Form] - Insert buttons per field
        ├──► [Queue Items] - Apply to selected/all
        └──► [Tag Library] - Save for future use
```

---

## UI Components

### 1. Research Tab

```
┌─────────────────────────────────────────────────────────────┐
│  RESEARCH                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📷 Capture from Current Tab                        │   │
│  │                                                     │   │
│  │  Open any Etsy listing, then click capture.         │   │
│  │                                                     │   │
│  │  [🎯 Capture Listing]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Captured Data ──────────────────────────────────────   │
│                                                             │
│  Title:                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Mega SVG Bundle - 50 Premium Cut Files for Cricut   │   │
│  │                                        [📋 Copy]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Price: $4.99                              [📋 Copy]        │
│                                                             │
│  Tags (13):                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] svg        [✓] bundle     [✓] cricut            │   │
│  │ [✓] cut files  [✓] silhouette [✓] crafts            │   │
│  │ [✓] digital    [✓] download   [✓] commercial        │   │
│  │ [✓] craft      [✓] diy        [✓] template          │   │
│  │ [✓] vector                                          │   │
│  │                                                     │   │
│  │ [Select All] [Clear] [📋 Copy Selected]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✨ 50 Premium SVG Files for Cricut & Silhouette     │   │
│  │                                                     │   │
│  │ Perfect for crafters! This bundle includes...       │   │
│  │ [Show more...]                                      │   │
│  │                                        [📋 Copy]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Shop: CraftMaster2026                     [👁 View Shop]   │
│  Reviews: ⭐ 4.9 (1,247)                                    │
│  Favorites: ❤️ 3,891                                        │
│                                                             │
│  ── Actions ────────────────────────────────────────────   │
│                                                             │
│  [📝 Use as Template]  [💾 Save Tags to Library]           │
│                                                             │
│  ── Saved ──────────────────────────────────────────────   │
│                                                             │
│  Tag Library:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SVG Bundle Tags (13 tags)              [Apply] [✕]  │   │
│  │ Planner Tags (10 tags)                 [Apply] [✕]  │   │
│  │ Embroidery Tags (12 tags)              [Apply] [✕]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Research Clipboard Bar (Persistent)

Appears below tab navigation when clipboard has data. Visible in ALL tabs.

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Clipboard: "Mega SVG Bundle..."                          │
│    Tags: 13 | Price: $4.99 | Has Description    [Clear ✕]   │
└─────────────────────────────────────────────────────────────┘
```

Clicking the bar expands quick-apply options:

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Clipboard: "Mega SVG Bundle..."              [Clear ✕]   │
├─────────────────────────────────────────────────────────────┤
│ Quick Apply:                                                │
│ [Apply to Form] [Apply to Selected (3)] [Apply to All (12)] │
│                                                             │
│ Tag Merge: ○ Replace  ● Merge  ○ Append                     │
└─────────────────────────────────────────────────────────────┘
```

### 3. Create Listing Form Integration

Add insert buttons to each field:

```
┌─────────────────────────────────────────────────────────────┐
│  Title:                                          [📋]       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tags:                                           [📋 ▼]     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [tag1] [tag2] [+ Add Tag]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  📋 dropdown shows: Replace | Merge | Append               │
│                                                             │
│  Description:                                    [📋]       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Price:                                          [📋]       │
│  ┌──────────┐                                              │
│  │          │                                              │
│  └──────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Queue Integration

Add apply options to queue section:

```
┌─────────────────────────────────────────────────────────────┐
│  QUEUE (12 listings)                                        │
├─────────────────────────────────────────────────────────────┤
│  [Select All] [Clear Selection]                             │
│                                                             │
│  📋 Apply from Clipboard:                                   │
│  [Apply Tags ▼] [Apply Price] [Apply Description]           │
│       │                                                     │
│       └─► To: ○ Selected (3)  ○ All (12)                   │
│           Merge: ○ Replace  ● Merge  ○ Append               │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  [✓] listing-001.png - "SVG Bundle 1"              [Edit]   │
│  [✓] listing-002.png - "SVG Bundle 2"              [Edit]   │
│  [✓] listing-003.png - "SVG Bundle 3"              [Edit]   │
│  [ ] listing-004.png - "SVG Bundle 4"              [Edit]   │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Research Clipboard (chrome.storage.local)

```javascript
{
  "researchClipboard": {
    "capturedAt": "2026-02-05T10:30:00Z",
    "sourceUrl": "https://www.etsy.com/listing/123456789/...",
    "title": "Mega SVG Bundle - 50 Premium Cut Files for Cricut",
    "price": "4.99",
    "currency": "USD",
    "tags": [
      "svg", "bundle", "cricut", "cut files", "silhouette",
      "crafts", "digital", "download", "commercial", "craft",
      "diy", "template", "vector"
    ],
    "description": "✨ 50 Premium SVG Files for Cricut & Silhouette...",
    "shopName": "CraftMaster2026",
    "shopUrl": "https://www.etsy.com/shop/CraftMaster2026",
    "reviews": {
      "rating": 4.9,
      "count": 1247
    },
    "favorites": 3891,
    "category": "Craft Supplies & Tools > Clip Art & Image Files"
  }
}
```

### Tag Library (chrome.storage.sync)

```javascript
{
  "tagLibrary": [
    {
      "id": "lib_001",
      "name": "SVG Bundle Tags",
      "tags": ["svg", "bundle", "cricut", "cut files", ...],
      "createdAt": "2026-02-05T10:30:00Z",
      "sourceUrl": "https://www.etsy.com/listing/123456789/..."
    },
    {
      "id": "lib_002",
      "name": "Planner Tags",
      "tags": ["planner", "digital", "printable", ...],
      "createdAt": "2026-02-04T15:00:00Z",
      "sourceUrl": null  // manually created
    }
  ]
}
```

---

## Implementation Phases

### Phase 1: Core Capture (MVP)

**Files to modify:**
- `sidepanel/sidepanel.html` - Add Research tab, clipboard bar
- `sidepanel/sidepanel.js` - Tab switching, capture logic
- `sidepanel/sidepanel.css` - Research tab styles
- `content/etsy-scraper.js` - NEW: Content script to extract listing data
- `manifest.json` - Add content script for etsy.com/listing/*

**Deliverables:**
- [ ] Research tab with capture button
- [ ] Content script to extract: title, price, tags, description, shop, reviews, favorites
- [ ] Display captured data in Research tab
- [ ] Copy to clipboard buttons for each field
- [ ] Persistent research clipboard bar

### Phase 2: Form Integration

**Files to modify:**
- `sidepanel/sidepanel.html` - Add insert buttons to form fields
- `sidepanel/sidepanel.js` - Insert logic with merge options

**Deliverables:**
- [ ] Insert buttons on Title, Tags, Description, Price fields
- [ ] Tag merge dropdown (Replace/Merge/Append)
- [ ] "Use as Template" button (fills entire form)

### Phase 3: Queue Integration

**Files to modify:**
- `sidepanel/sidepanel.html` - Add queue apply controls
- `sidepanel/sidepanel.js` - Batch apply logic

**Deliverables:**
- [ ] Checkbox selection for queue items
- [ ] Apply Tags/Price/Description to selected items
- [ ] Apply to All option
- [ ] Tag merge options for queue apply

### Phase 4: Tag Library

**Files to modify:**
- `sidepanel/sidepanel.html` - Tag library UI
- `sidepanel/sidepanel.js` - Library CRUD operations
- `services/storage.js` - Tag library storage helpers

**Deliverables:**
- [ ] Save tags to library with custom name
- [ ] View saved tag sets
- [ ] Apply saved tags to form/queue
- [ ] Delete saved tag sets
- [ ] Sync across devices (chrome.storage.sync)

---

## Content Script: Data Extraction

### Etsy Listing Page Selectors

```javascript
// etsy-scraper.js

const SELECTORS = {
  // Title
  title: 'h1[data-buy-box-listing-title]',

  // Price
  price: '[data-buy-box-region="price"] .wt-text-title-larger',

  // Tags - found in page source/JSON-LD
  // Method: Parse JSON-LD or page source for tags array

  // Description
  description: '[data-product-details-description-text-content]',

  // Shop info
  shopName: '[data-shop-name]',
  shopLink: 'a[href*="/shop/"]',

  // Reviews
  reviewCount: '[data-reviews-section] .wt-text-caption',
  reviewRating: '[data-reviews-section] .wt-display-flex-xs input[name="rating"]',

  // Favorites (hearts)
  favorites: '[data-favorite-count]',

  // Category breadcrumb
  category: '#breadcrumbs-block ol li'
};
```

### Extraction Function

```javascript
function extractListingData() {
  const data = {
    url: window.location.href,
    capturedAt: new Date().toISOString()
  };

  // Title
  const titleEl = document.querySelector(SELECTORS.title);
  data.title = titleEl?.textContent?.trim() || '';

  // Price
  const priceEl = document.querySelector(SELECTORS.price);
  const priceText = priceEl?.textContent?.trim() || '';
  data.price = priceText.replace(/[^0-9.]/g, '');
  data.currency = priceText.includes('$') ? 'USD' : 'OTHER';

  // Tags - from JSON-LD script
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    try {
      const parsed = JSON.parse(jsonLd.textContent);
      data.tags = parsed.keywords?.split(',').map(t => t.trim()) || [];
    } catch (e) {}
  }

  // Fallback: extract from page source
  if (!data.tags?.length) {
    const pageSource = document.documentElement.innerHTML;
    const tagMatch = pageSource.match(/"tags":\s*\[(.*?)\]/);
    if (tagMatch) {
      data.tags = JSON.parse('[' + tagMatch[1] + ']');
    }
  }

  // Description
  const descEl = document.querySelector(SELECTORS.description);
  data.description = descEl?.textContent?.trim() || '';

  // Shop
  const shopEl = document.querySelector(SELECTORS.shopName);
  data.shopName = shopEl?.textContent?.trim() || '';

  // Reviews & Favorites
  // ... similar extraction

  return data;
}
```

---

## Tag Merge Logic

```javascript
function mergeTags(existingTags, newTags, mode) {
  switch (mode) {
    case 'replace':
      return [...newTags].slice(0, 13); // Etsy max 13 tags

    case 'merge':
      const merged = [...existingTags];
      for (const tag of newTags) {
        if (!merged.includes(tag.toLowerCase())) {
          merged.push(tag);
        }
      }
      return merged.slice(0, 13);

    case 'append':
      return [...existingTags, ...newTags].slice(0, 13);

    default:
      return existingTags;
  }
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Not on Etsy listing page | Show toast: "Please open an Etsy listing page first" |
| Tags not found | Show partial data, note "Tags could not be extracted" |
| Page structure changed | Log error, show toast, still capture what's possible |
| Clipboard empty | Disable insert buttons, show "Capture a listing first" |

---

## Storage Limits

| Storage | Limit | Usage |
|---------|-------|-------|
| chrome.storage.local | 10MB | Research clipboard (temporary) |
| chrome.storage.sync | 100KB | Tag library (permanent, synced) |

Tag library limit: ~50 saved tag sets (at ~2KB each)

---

## Success Metrics

- Time saved per listing (target: 30+ seconds)
- Tag library adoption rate
- Capture success rate (target: 95%+)

---

## Next Steps

1. [ ] Create Research tab HTML structure
2. [ ] Add tab navigation for Research
3. [ ] Create etsy-scraper.js content script
4. [ ] Implement capture functionality
5. [ ] Add clipboard bar UI
6. [ ] Integrate with Create form
7. [ ] Add queue selection and apply
8. [ ] Implement tag library

