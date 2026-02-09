# BulkListingPro Feature Roadmap

> **Created:** February 5, 2026
> **Purpose:** Prioritized feature list based on user research and market analysis

---

## Already Implemented ✅

| Feature | Status | Notes |
|---------|--------|-------|
| CSV/Spreadsheet Integration | ✅ | XLSX/CSV import working |
| Safety Heartbeat | ✅ | Captcha/verification detection, auto-pause |
| Progress Persistence | ✅ | Resumes after crash/close |
| Retry Failed Listings | ✅ | Re-queue failed items with one click |
| Publish vs Draft Toggle | ✅ | Choose save mode before upload |
| Error Categorization | ✅ | Verification, timeout, network, DOM errors |
| Phase 1 Field Automation | ✅ | who_made, what_is_it, ai_content, when_made, renewal, materials, quantity, SKU |
| XLSX Template with Dropdowns | ✅ | ExcelJS generator with formatting, validation, Options sheet |
| Free Credits for New Users | ✅ | 10 credits on signup + welcome toast |

---

## Tier 1: Quick Wins

High value, low complexity. Implement first.

### 1.1 Keyword/Tag Copy Tool
**Priority:** High
**Complexity:** Easy
**Value:** Huge time saver for research

**Description:**
Allow users to paste a competitor's Etsy listing URL and extract their tags for reuse.

**User Flow:**
1. User clicks "Research" or "Copy Tags" button
2. Pastes Etsy listing URL (e.g., `https://www.etsy.com/listing/123456789/...`)
3. Extension fetches the page and extracts tags
4. Shows tags in a list with checkboxes
5. User can:
   - Copy selected tags to clipboard
   - Apply selected tags to current form
   - Apply selected tags to all queued listings

**Technical Approach:**
- Fetch listing page HTML
- Parse tags from the page (likely in JSON-LD or meta tags)
- Display in modal for selection

**Files to modify:**
- `sidepanel/sidepanel.html` - Add research UI
- `sidepanel/sidepanel.js` - Add fetch and parse logic

---

### ~~1.2 Internal Search & Replace~~ (Removed)

---

### 1.3 Free Credits for New Users ✅
**Status:** Complete

10 free credits on signup. Backend DEFAULT_CREDITS updated, welcome toast in sidepanel.

---

## Tier 2: Medium Effort

### 2.1 Listing Profiles/Templates
**Priority:** High
**Complexity:** Medium

**Description:**
Save and reuse full listing configurations (not just individual fields).

**Profiles could include:**
- Category
- Default description template
- Default tags
- Default price
- Shipping profile (future)
- Shop section (future)

**User Flow:**
1. Fill out form with common settings
2. Click "Save as Profile"
3. Name it (e.g., "Digital Planner", "SVG Bundle")
4. When creating new listings, select profile from dropdown
5. Profile pre-fills all saved fields

**Storage:**
- `chrome.storage.sync` for cross-device sync
- Limit to 10 profiles

---

### 2.2 Smart Field Propagation
**Priority:** High
**Complexity:** Medium

**Description:**
Lock certain fields to apply across entire batch.

**Lockable Fields:**
- Category
- Price
- Tags (append to existing)
- Description (or description template)

**User Flow:**
1. In queue view, click "Batch Settings"
2. Set values for fields you want to propagate
3. Click "Apply to All" or "Apply to Selected"
4. All queue items updated

---

### 2.3 Trending Tags Scraper
**Priority:** Medium
**Complexity:** Medium

**Description:**
Analyze top competitor listings to find trending tags.

**User Flow:**
1. User enters search term (e.g., "digital planner 2026")
2. Extension searches Etsy, gets top 10-20 results
3. Extracts and aggregates tags from all results
4. Shows frequency-sorted tag list
5. User selects tags to use

**Technical Challenges:**
- Rate limiting on Etsy searches
- May need to use Etsy API or careful scraping

---

### 2.4 Bulk Draft Editor
**Priority:** Medium
**Complexity:** Medium

**Description:**
Edit existing draft listings in bulk (not just new uploads).

**Features:**
- Fetch user's draft listings from Etsy
- Display in queue-like interface
- Apply bulk edits (tags, price, etc.)
- Save changes back to Etsy

**Technical Challenges:**
- Requires navigating to each draft's edit page
- More complex automation

---

## Tier 3: Complex (Future)

### 3.1 AI Metadata Generation
**Priority:** Medium
**Complexity:** Hard

**Description:**
Use AI to generate titles, descriptions, and tags based on uploaded images.

**Technical Requirements:**
- API integration (OpenAI GPT-4o-mini or similar)
- Image analysis capability
- Cost management (API calls cost money)

**User Flow:**
1. User uploads images
2. Clicks "Generate with AI"
3. AI analyzes image, suggests title/description/tags
4. User reviews and edits
5. Applies to listing

**Considerations:**
- API costs passed to user or included in credits?
- Privacy concerns with sending images to AI
- Quality of suggestions

---

### 3.2 Image Bulk-Resizer
**Priority:** Low
**Complexity:** Medium-Hard

**Description:**
Automatically resize/crop images to Etsy's preferred 2000x2000px format.

**Technical Approach:**
- Canvas API for client-side resizing
- Options: crop to square, pad with white, scale to fit

**Considerations:**
- Processing large batches may be slow
- Quality loss concerns
- User preferences for crop vs pad

---

### 3.3 POD/T-shirt Support
**Priority:** Medium
**Complexity:** Hard

**Description:**
Support Print-on-Demand listings (different UI flow on Etsy).

**Challenges:**
- POD has different form fields
- Integration with print providers
- Variant/size management
- Different category structure

**Market Opportunity:**
- High volume niche ("Beagle Mom", "Golden Retriever Mom" variations)
- Sellers create 100s of variations

---

## Target Niches (2026)

Based on market research, these niches have highest upload volume:

1. **SVG & Crafting Bundles** ✅ (Supported)
   - Cricut, Glowforge users
   - 50+ variations per design set

2. **Hyper-Personalized POD** (Future)
   - Micro-niche t-shirts
   - 200+ breed/name variations

3. **Small Business Branding Kits** ✅ (Supported)
   - Social media templates
   - Seasonal packs (30-50 items)

---

## Business Model Notes

### Freemium Strategy
- First 20-50 uploads free (builds trust)
- Sellers protective of accounts, need to see it working first
- Convert to paid after experiencing the "magic"

### Value Proposition
- Save time on uploading AND keyword research
- Doubles value if we solve both problems

---

## Implementation Status

| Feature | Status | Date |
|---------|--------|------|
| Keyword/Tag Copy Tool | 🟡 Phase 1 Complete | Feb 5, 2026 |
| ~~Search & Replace~~ | ❌ Removed | |
| Free Credits | ✅ Complete | Feb 6, 2026 |
| Listing Profiles | ⬜ Not started | |
| Smart Field Propagation | ⬜ Not started | |
| Trending Tags Scraper | ⬜ Not started | |
| Bulk Draft Editor | ⬜ Not started | |
| AI Metadata | ⬜ Future | |
| Image Resizer | ⬜ Future | |
| POD Support | ⬜ Future | |
