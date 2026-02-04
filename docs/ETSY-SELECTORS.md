# Etsy DOM Selectors Reference

> **Source:** Ported from `C:\Projects\etsy-uploader-gumroad\src\selectors.js`
> **Last Updated:** February 3, 2026
> **Etsy UI Version:** React-based listing editor

## Important Notes

1. **Etsy uses React** - DOM is dynamic, selectors may change
2. **Multiple fallbacks** - Use comma-separated selectors
3. **data-test-id** - Most reliable when available
4. **Text selectors** - Use `:has-text()` as fallback
5. **Always test** - Verify selectors before each release

## Listing Creation URL

```
https://www.etsy.com/your/shops/me/listing-editor/create
```

## Selector Reference

### Category Selection Modal

First step when creating a new listing.

| Element | Selector |
|---------|----------|
| Search input | `input[placeholder*="Search for a category"]` |
| Category option | `text="${categoryName}"` |
| Continue button | `button:has-text("Continue")` |
| Cancel button | `button:has-text("Cancel")` |

### Item Details Modal

"Tell us about your listing" modal.

| Element | Selector |
|---------|----------|
| Physical item | `[data-test-id="physical-item-card"]` |
| Digital files | `[data-test-id="digital-item-card"]` |

**Who made it:**
| Option | Selector |
|--------|----------|
| I did | `input[value="i_did"]` or `label:has-text("I did")` |
| Member of shop | `input[value="collective"]` |
| Another company | `input[value="someone_else"]` |

**What is it:**
| Option | Selector |
|--------|----------|
| Finished product | `input[value="finished_product"]` |
| Supply or tool | `input[value="supply"]` |

**When made:**
| Element | Selector |
|---------|----------|
| Dropdown | `select[name="when_made"]` |
| Option | `option[value="${year}"]` |

**Digital creation method:**
| Option | Selector |
|--------|----------|
| Created by me | `label:has-text("Created by me")` |
| With AI | `label:has-text("With an AI generator")` |

### Main Form Tabs

| Tab | Selector |
|-----|----------|
| About | `button:has-text("About")` |
| Price & Inventory | `button:has-text("Price & Inventory")` |
| Variations | `button:has-text("Variations")` |
| Details | `button:has-text("Details")` |
| Processing & Shipping | `button:has-text("Processing & Shipping")` |
| Settings | `button:has-text("Settings")` |

### About Tab

| Element | Selector |
|---------|----------|
| Title input | `input[name="title"]` or `[data-test-id="title-input"] input` |
| Photo upload input | `input[type="file"][accept*="image"]` |
| Digital file input | `input[type="file"]:not([accept*="image"])` |
| Add file button | `button:has-text("Add file")` |
| Description | `textarea[name="description"]` |
| Note to buyers | `textarea[name="note_to_buyers"]` |

### Price & Inventory Tab

| Element | Selector |
|---------|----------|
| Price input | `input[name="price"]` |
| Quantity input | `input[name="quantity"]` |
| SKU input | `input[name="sku"]` |

### Details Tab (Tags)

| Element | Selector |
|---------|----------|
| Tag input | `input[placeholder*="tag"]` |
| Add tag button | `button:has-text("Add")` |
| Tag chip | `[data-test-id="tag-chip"]:has-text("${tag}")` |
| Remove tag | `[data-test-id="tag-chip"]:has-text("${tag}") button` |

### Action Buttons

| Button | Selector |
|--------|----------|
| Save as draft | `button:has-text("Save as draft")` |
| Publish | `button:has-text("Publish")` |
| Preview | `button:has-text("Preview")` |
| Cancel | `button:has-text("Cancel")` |

### Feedback

| Element | Selector |
|---------|----------|
| Success toast | `[data-test-id="toast-success"]` or `:has-text("successfully")` |
| Error toast | `[data-test-id="toast-error"]` or `[role="alert"]` |

## Content Script Selector Usage

```javascript
// In content script context, use standard DOM methods
const titleInput = document.querySelector('input[name="title"]');

// For multiple fallbacks
const selectors = ['input[name="title"]', '[data-test-id="title-input"] input'];
let element = null;
for (const sel of selectors) {
  element = document.querySelector(sel);
  if (element) break;
}

// Wait for element (Etsy loads dynamically)
async function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeout);
  });
}
```

## File Upload Handling

Etsy's file inputs are hidden. Need to trigger them programmatically:

```javascript
// Find the hidden file input
const fileInput = document.querySelector('input[type="file"][accept*="image"]');

// Create a DataTransfer to simulate file selection
const dataTransfer = new DataTransfer();
dataTransfer.items.add(file); // file is a File object

// Set the files and trigger change
fileInput.files = dataTransfer.files;
fileInput.dispatchEvent(new Event('change', { bubbles: true }));
```

## Known Issues

1. **Tag input** - May need to press Enter after typing
2. **Photo upload** - Wait for thumbnail to appear before proceeding
3. **Category search** - Debounced, need delay after typing
4. **Save button** - May show loading state, wait for completion

## Testing Checklist

Before each release, manually verify:

- [ ] Category selection modal opens
- [ ] Item type selection works
- [ ] Title input accepts text
- [ ] Photo upload triggers
- [ ] Digital file upload triggers
- [ ] Price input accepts numbers
- [ ] Tags can be added
- [ ] Save as draft button works
- [ ] Success toast appears

## Updating Selectors

When Etsy updates their UI:

1. Open DevTools on listing page
2. Inspect changed elements
3. Look for `data-test-id` first
4. Fall back to semantic selectors
5. Update this document
6. Update `services/etsySelectors.js`
7. Test all flows
