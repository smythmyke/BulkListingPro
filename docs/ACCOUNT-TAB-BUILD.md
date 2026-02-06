# Account Tab & Tag Organization Build Document

> **Created:** February 5, 2026
> **Status:** Complete
> **Priority:** Next Feature

---

## Part 1: Account Tab

### Overview

Add an Account tab to centralize user profile, credits, tag library, and support links.

### Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Upload]  [Research]  [Account]                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── Profile ────────────────────────────────────────────   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤  user@email.com                                 │   │
│  │      Member since Feb 2026              [Sign Out]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Credits ────────────────────────────────────────────   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💰 48 credits (~24 listings)          [Buy More]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Tag Library ────────────────────────────────────────   │
│  (Organized by category - see Part 2)                      │
│                                                             │
│  ── Links ──────────────────────────────────────────────   │
│  Privacy Policy • Terms of Service • Report Issue          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sections

#### 1. Profile Section
- User avatar (from Google)
- User email
- Member since date (if available from backend)
- Sign Out button

#### 2. Credits Section
- Current balance with listing estimate
- "Buy More" button (opens credits modal)
- Future: Purchase history

#### 3. Tag Library Section
- Organized by category (see Part 2)
- Apply/Delete actions per tag set

#### 4. Links Section
- Privacy Policy (external link)
- Terms of Service (external link)
- Report Issue (GitHub issues link)

### Files to Modify

| File | Changes |
|------|---------|
| `sidepanel.html` | Add Account tab button and content |
| `sidepanel.css` | Add Account tab styles |
| `sidepanel.js` | Add Account tab logic, move user info display |

---

## Part 2: Category-Based Tag Organization

### Overview

Tags are saved and suggested based on category context. This makes tag suggestions smarter and more relevant.

### How It Works

#### Capture Flow
1. User captures competitor listing
2. System extracts: title, price, tags, description, **AND category**
3. User clicks "Save Tags"
4. Tags saved under the captured category

#### Use as Template Flow
1. User clicks "Use as Template" on captured data
2. Category auto-selects to match captured listing
3. Tags auto-fill from the capture

#### Single Listing Form (Smart Suggestions)
1. User opens single listing form
2. User selects a category (e.g., "Cutting Machine Files")
3. Tags field shows suggestions from:
   - Captured tags saved under that category
   - Previously entered tags for that category
4. User can click suggestions to add, or type new tags

### Data Structure

```javascript
// Storage key: bulklistingpro_tag_library
{
  "tagLibrary": {
    "Cutting Machine Files": {
      "sets": [
        {
          "id": "lib_001",
          "name": "SVG Bundle Tags",
          "tags": ["svg", "cut file", "cricut", "silhouette", ...],
          "source": "captured",  // or "manual"
          "sourceUrl": "https://etsy.com/listing/...",
          "createdAt": "2026-02-05T10:30:00Z"
        },
        {
          "id": "lib_002",
          "name": "My Favorites",
          "tags": ["digital download", "commercial use", ...],
          "source": "manual",
          "sourceUrl": null,
          "createdAt": "2026-02-05T11:00:00Z"
        }
      ],
      "recentTags": ["svg", "bundle", "cricut", ...]  // from manual entry
    },
    "Digital Planners": {
      "sets": [...],
      "recentTags": [...]
    }
  }
}
```

### UI Components

#### Tag Library in Account Tab

```
┌─────────────────────────────────────────────────────────────┐
│  ── Tag Library ────────────────────────────────────────   │
│                                                             │
│  ▼ Cutting Machine Files (2 sets)                          │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ SVG Bundle Tags (13 tags)            [Apply] [✕]    │ │
│    │ My Favorites (8 tags)                [Apply] [✕]    │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ▶ Digital Planners (1 set)                                │
│                                                             │
│  ▶ Clip Art & Image Files (3 sets)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tag Suggestions in Single Listing Form

```
┌─────────────────────────────────────────────────────────────┐
│  Category: [Cutting Machine Files        ▼]                │
│                                                             │
│  Tags:                                                      │
│  [svg] [cricut] [+ Add]                                    │
│                                                             │
│  Suggestions:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ From "SVG Bundle Tags":                             │   │
│  │ [silhouette] [cut file] [digital] [bundle]          │   │
│  │                                                     │   │
│  │ Recently used:                                      │   │
│  │ [commercial use] [instant download]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Capture Category
- Update etsy-scraper.js to extract category from breadcrumbs
- Display captured category in Research tab
- Include category in "Use as Template" flow

#### Phase 2: Category-Based Tag Storage
- Refactor tagLibrary storage structure
- Update save tags flow to include category
- Update tag library display in Account tab (grouped by category)

#### Phase 3: Smart Tag Suggestions
- Add suggestion UI to single listing form
- Track recently used tags per category
- Show relevant suggestions when category is selected

#### Phase 4: Account Tab
- Create Account tab UI
- Move user profile from inline to Account tab
- Integrate Tag Library display

### Category Mapping

When capturing, we need to map Etsy's breadcrumb categories to our internal category names:

| Etsy Breadcrumb Contains | Maps To |
|--------------------------|---------|
| "Clip Art" | Clip Art & Image Files |
| "SVG", "Cut File", "Cutting" | Cutting Machine Files |
| "Planner" | Planners & Templates |
| "Font" | Fonts |
| "Embroidery" | Embroidery Machine Files |
| ... | ... |

### Success Metrics

- Tags saved per category
- Template usage rate
- Tag suggestion click-through rate

---

## Next Steps

1. [x] Update etsy-scraper.js to capture category (already implemented)
2. [x] Refactor tag library data structure (category-based storage)
3. [x] Update Research tab save flow (includes category mapping)
4. [x] Add tag suggestions to single listing form (shows saved + recent tags)
5. [x] Build Account tab UI (Profile, Credits, Tag Library, Links)
6. [x] Migrate tag library to Account tab (grouped by category with expand/collapse)

**All phases complete!**

