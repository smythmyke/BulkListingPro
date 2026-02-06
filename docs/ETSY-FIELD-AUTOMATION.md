# Etsy Listing Field Automation Plan

## Overview

Expand the extension to support all Etsy listing form fields beyond the basics (title, description, price, tags, category). Users should be able to set these via the single listing form or spreadsheet columns, with sensible defaults for digital products.

## Current State

**Fields we handle today:**
- Title (`textarea#listing-title-input`)
- Description (`textarea#listing-description-textarea`)
- Price (`input#listing-price-input`)
- Tags (`input#listing-tags-input` + `button#listing-tags-button`)
- Category (`input#category-field-search`)
- Images / Digital files (file inputs)
- Listing state: draft vs active (applied at upload time)

**Fields Etsy requires that we skip entirely:**
- Who made it (defaults to whatever Etsy pre-selects)
- What is it (defaults to whatever Etsy pre-selects)
- AI content disclosure (not set)
- When was it made (not set)
- Listing type physical/digital (not set)
- Renewal option (not set)

---

## Phase 1: Easy Wins (Simple Selectors)

These fields use standard HTML controls (radio buttons, `<select>` dropdowns, text inputs) with stable selectors. They can be automated with straightforward CDP commands.

### 1.1 Who Made It — Radio Buttons

| Option | Index | Label |
|--------|-------|-------|
| 0 | default | "I did" |
| 1 | | "A member of my shop" |
| 2 | | "Another company or person" |

- **Selector:** `input[name="whoMade"]` (click by index)
- **Default for digital products:** `0` ("I did")
- **Spreadsheet column:** `who_made` / `WhoMade` / `Who Made`
- **Accepted values:** `i_did`, `member`, `another`
- **Form UI:** Dropdown or radio in single listing form

### 1.2 What Is It — Radio Buttons

| Option | Index | Label |
|--------|-------|-------|
| 0 | default | "A finished product" |
| 1 | | "A supply or tool to make things" |

- **Selector:** `input[name="isSupply"]` (click by index)
- **Default for digital products:** `0` ("A finished product")
- **Spreadsheet column:** `what_is_it` / `WhatIsIt` / `What Is It`
- **Accepted values:** `finished_product`, `supply`
- **Form UI:** Dropdown or radio in single listing form

### 1.3 AI Content Disclosure — Radio Buttons

| Option | Value | Label |
|--------|-------|-------|
| Created by me | `original` | "Created by me" |
| AI generated | `ai_gen` | "With an AI generator" |

- **Selector:** `input[name="whatContent"][value="original"]` or `[value="ai_gen"]`
- **Default:** `original` ("Created by me")
- **Spreadsheet column:** `ai_content` / `AiContent` / `AI Content`
- **Accepted values:** `original`, `ai_gen`
- **Form UI:** Dropdown or radio in single listing form

### 1.4 When Was It Made — Standard Select Dropdown

| Value | Label | Use Case |
|-------|-------|----------|
| `made_to_order` | Made To Order | Most digital products |
| `2020_2026` | 2020 - 2026 | Recently created |
| `2010_2019` | 2010 - 2019 | Older |

- **Selector:** `select#when-made-select`
- **Default for digital products:** `made_to_order`
- **Spreadsheet column:** `when_made` / `WhenMade` / `When Made`
- **Accepted values:** `made_to_order`, `2020_2026`, `2010_2019`, `2007_2009`, `before_2007`
- **Automation:** Standard `select.value = x` + change event

### 1.5 Renewal Option — Radio Buttons

| Option | Index | Label |
|--------|-------|-------|
| 0 | default | "Automatic" ($0.20 per renewal) |
| 1 | | "Manual" |

- **Selector:** `input[name="shouldAutoRenew"]` (click by index)
- **Default:** `0` ("Automatic") — Etsy's own default
- **Spreadsheet column:** `renewal` / `Renewal` / `auto_renew`
- **Accepted values:** `automatic`, `manual`
- **Form UI:** Dropdown in single listing form

### 1.6 Shop Section — Standard Select Dropdown

- **Selector:** `select#shop-section-select`
- **Default:** `0` (None)
- **Spreadsheet column:** `shop_section` / `ShopSection` / `Shop Section`
- **Accepted values:** Section name (matched against available options) or section ID
- **Note:** Options are shop-specific, loaded dynamically. Automation needs to match by option text content.

### 1.7 Materials — Chip Input (Same Pattern as Tags)

- **Selector:** `input#listing-materials-input` + `button#listing-materials-button`
- **Default:** Empty
- **Spreadsheet columns:** `materials` (comma-separated) or `material_1` through `material_13`
- **Automation:** Same type-and-click pattern as tags

### 1.8 Quantity — Number Input

- **Selector:** `input#listing-quantity-input`
- **Default:** `999` (common for digital products)
- **Spreadsheet column:** `quantity` / `Quantity`
- **Automation:** Standard input fill

### 1.9 SKU — Text Input

- **Selector:** `input#listing-sku-input`
- **Default:** Empty
- **Spreadsheet column:** `sku` / `SKU`
- **Note:** Field is hidden by default (`aria-hidden="true"`), may need to toggle visibility first

---

## Phase 2: Medium Complexity

These fields require more interaction (typeahead menus, expanding sections, overlay modals).

### 2.1 Primary / Secondary Color — Typeahead Dropdowns

- **Container:** `#field-attributes-attribute-2` (primary), `#field-attributes-attribute-271` (secondary)
- **Options:** Beige, Black, Blue, Bronze, Brown, Clear, Copper, Gold, Gray, Green, Orange, Pink, Purple, Rainbow, Red, Rose gold, Silver, White, Yellow
- **Automation:** Type color name into typeahead input, wait for menu, click matching `button[role="menuitemradio"]`
- **Note:** Category-dependent — only appears for certain categories

### 2.2 Personalization — Expandable Section

- **Toggle:** Button "Add personalization" → reveals form
- **Sub-fields:**
  - Instructions textarea: `textarea#field-personalization-personalizationInstructions`
  - Char limit input: `input#field-personalization-personalizationCharCountMax`
  - Required toggle: `input#field-personalization-personalizationIsRequired`
- **Automation:** Click expand button, fill sub-fields

### 2.3 Listing Type — Radio Cards with Confirmation Dialog

- **Selector:** `input[name="listing_type_options_group"][value="download"]`
- **Complication:** Switching to digital triggers confirmation dialog
- **Automation:** Click radio, detect dialog, click confirm

### 2.4 Featured Listing / Etsy Ads — Toggle Switches

- **Featured:** `input#listing-featured-rank-checkbox`
- **Etsy Ads:** `input#listing-is-promoted-checkbox`
- **Automation:** Simple toggle click, but need to check current state first

---

## Phase 3: Complex (Overlays & Dynamic Content)

### 3.1 Shipping Profile — Overlay Selection
### 3.2 Return Policy — Overlay Selection
### 3.3 Processing Time / Readiness State
### 3.4 Production Partners (conditional)
### 3.5 GPSR Compliance (EU)

---

## Implementation Order

### Step 1: Update Content Script (etsy.js)

Add new selector constants and automation functions:

```
SELECTORS additions:
  whoMade: 'input[name="whoMade"]'
  isSupply: 'input[name="isSupply"]'
  whatContent: 'input[name="whatContent"]'
  whenMade: 'select#when-made-select'
  shouldAutoRenew: 'input[name="shouldAutoRenew"]'
  shopSection: 'select#shop-section-select'
  materialsInput: 'input#listing-materials-input'
  materialsButton: 'button#listing-materials-button'
  quantityInput: 'input#listing-quantity-input'
  skuInput: 'input#listing-sku-input'
```

New helper functions:
- `selectRadioByIndex(name, index)` — for radio button groups
- `selectRadioByValue(name, value)` — for radio buttons with value attrs
- `selectDropdownValue(selector, value)` — for standard `<select>` elements
- `addChipItems(inputSelector, buttonSelector, items)` — for materials (reuse tag pattern)

### Step 2: Update Sidepanel Form (sidepanel.html)

Add new fields to single listing form:
- Who made it (select dropdown)
- What is it (select dropdown)
- AI content (select dropdown)
- When made (select dropdown)
- Renewal (select dropdown)
- Shop section (select dropdown, populated dynamically later)
- Materials (text input, comma-separated)
- Quantity (number input, default 999)
- SKU (text input)

Group these under a collapsible "Advanced Options" section to keep the form clean.

### Step 3: Update Sanitize + Data Pipeline (sidepanel.js)

- Add new fields to `sanitizeListing()` with defaults
- Add new fields to the listing object built before upload (lines 1306-1331)
- Map spreadsheet columns to new fields

### Step 4: Update ETSY-SELECTORS.md

Add all new selectors and their options to the reference doc.

### Step 5: Test Each Field

Test automation of each field individually via CDP:
1. Navigate to listing creation page
2. Run selector, verify element found
3. Set value, verify it took
4. Check for any React state issues (Etsy may not register programmatic changes)

---

## Defaults for Digital Products

| Field | Default Value | Rationale |
|-------|--------------|-----------|
| Who made it | "I did" (index 0) | Most sellers made their own digital products |
| What is it | "A finished product" (index 0) | Digital downloads are finished products |
| AI content | "Created by me" (original) | Conservative default, user overrides if AI |
| When made | "Made to order" | Standard for digital products |
| Listing type | "Digital files" (download) | This is a digital product uploader |
| Renewal | "Automatic" (index 0) | Etsy's recommended default |
| Shop section | None (0) | User-specific, no good default |
| Materials | Empty | Not typical for digital products |
| Quantity | 999 | Digital = unlimited, 999 is common convention |
| SKU | Empty | Optional, user-specific |

---

## Spreadsheet Column Reference (After Implementation)

| Field | Column Names Accepted | Values |
|-------|----------------------|--------|
| who_made | `who_made`, `WhoMade`, `Who Made` | `i_did`, `member`, `another` |
| what_is_it | `what_is_it`, `WhatIsIt`, `What Is It` | `finished_product`, `supply` |
| ai_content | `ai_content`, `AiContent`, `AI Content` | `original`, `ai_gen` |
| when_made | `when_made`, `WhenMade`, `When Made` | `made_to_order`, `2020_2026`, `2010_2019`, etc. |
| renewal | `renewal`, `Renewal`, `auto_renew` | `automatic`, `manual` |
| shop_section | `shop_section`, `ShopSection`, `Shop Section` | Section name or ID |
| materials | `materials`, `Materials` | Comma-separated list |
| quantity | `quantity`, `Quantity` | Number |
| sku | `sku`, `SKU` | Text |
