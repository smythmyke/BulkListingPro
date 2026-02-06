# Etsy DOM Selectors Reference

> **Source:** Verified against captured listing editor HTML (Feb 2026)
> **Last Updated:** February 6, 2026
> **Etsy UI Version:** React-based listing editor

## Important Notes

1. **Etsy uses React** - DOM is dynamic, selectors may change
2. **Multiple fallbacks** - Use comma-separated selectors
3. **data-test-id / data-testid** - Most reliable when available
4. **IDs with UUIDs** (e.g., `wt-radio-*`) are dynamic per page load — use `name` attributes instead
5. **Always test** - Verify selectors before each release

## Listing Creation URL

```
https://www.etsy.com/your/shops/me/listing-editor/create
```

## Form Structure — Tabs

| Tab | URL Hash | Selector |
|-----|----------|----------|
| About | `#about` | `a[href*="#about"]` |
| Price & Inventory | `#price-inventory` | `a[href*="#price-inventory"]` |
| Variations | `#variations` | `a[href*="#variations"]` |
| Details | `#details` | `a[href*="#details"]` |
| Shipping | `#shipping` | `a[href*="#shipping"]` |
| Settings | `#settings` | `a[href*="#settings"]` |

## Selector Reference

### About This Listing — Required Radio/Select Fields

**Who made it?** — Radio button group

| Option | Index | Selector |
|--------|-------|----------|
| I did | 0 | `input[name="whoMade"]` (index 0) |
| A member of my shop | 1 | `input[name="whoMade"]` (index 1) |
| Another company or person | 2 | `input[name="whoMade"]` (index 2) |

**What is it?** — Radio button group

| Option | Index | Selector |
|--------|-------|----------|
| A finished product | 0 | `input[name="isSupply"]` (index 0) |
| A supply or tool to make things | 1 | `input[name="isSupply"]` (index 1) |

**Content type (AI disclosure)** — Radio button group

| Option | Value | Selector |
|--------|-------|----------|
| Created by me | `original` | `input[name="whatContent"][value="original"]` |
| With an AI generator | `ai_gen` | `input[name="whatContent"][value="ai_gen"]` |

**When was it made?** — Standard `<select>` dropdown

| Selector | `select#when-made-select` |
|----------|--------------------------|

| Value | Label |
|-------|-------|
| `made_to_order` | Made To Order |
| `2020_2026` | 2020 - 2026 |
| `2010_2019` | 2010 - 2019 |
| `2007_2009` | 2007 - 2009 |
| `before_2007` | Before 2007 |
| *(vintage)* | `2000_2006`, `1990s`, `1980s`, `1970s`, `1960s`, `1950s`, etc. |

### Listing Type

| Option | Value | Selector |
|--------|-------|----------|
| Physical item | `physical` | `input[name="listing_type_options_group"][value="physical"]` |
| Digital files | `download` | `input[name="listing_type_options_group"][value="download"]` |

Note: Switching to digital triggers a confirmation dialog.

### Category

| Element | Selector |
|---------|----------|
| Search input | `input#category-field-search` (`role="combobox"`) |
| Selected path display | `#seller-taxonomy-path-name` (`data-test-id="seller-taxonomy-path-name"`) |

### Title

| Element | Selector |
|---------|----------|
| Title textarea | `textarea#listing-title-input` or `textarea[name="title"]` |
| Character count | `#listing-title-character-count` (`data-testid="listing-title-character-count"`) |

Max 140 chars. `aria-required="true"`.

### Photos and Video

| Element | Selector |
|---------|----------|
| File input (hidden) | `input[type="file"][multiple].wt-display-none` |
| Upload area | `.wt-upload__area` |
| Drop zone | `.wt-upload__drop-indicator` |

Container: `#field-listingImages`. Up to 20 photos + 1 video.

### Description

| Element | Selector |
|---------|----------|
| Textarea | `textarea#listing-description-textarea` or `textarea[name="description"]` |
| Helper text | `#listing-description-helper-text` |

`aria-required="true"`.

### Tags

| Element | Selector |
|---------|----------|
| Tag input | `input#listing-tags-input` |
| Add button | `button#listing-tags-button` |
| Helper text | `#tags-helper` |

Max 13 tags. Chip-style input — type text, click Add button.

### Materials

| Element | Selector |
|---------|----------|
| Materials input | `input#listing-materials-input` |
| Add button | `button#listing-materials-button` |
| Helper text | `#materials-helper` |

Same chip-style as tags.

### Price & Inventory

| Element | Selector |
|---------|----------|
| Price input | `input#listing-price-input` (`data-testid="price-input"`) |
| Production cost | `input#production-cost-input` |
| Quantity input | `input#listing-quantity-input` |
| SKU input | `input#listing-sku-input` |

Note: SKU has `aria-hidden="true"` — may need visibility toggle.

### Category Attributes (Conditional)

Appear inside `#field-attributes` after category selection. Attribute set depends on category.

**Primary Color** — Typeahead with `role="menuitemradio"` buttons
- Container: `#field-attributes-attribute-2`
- 19 options: Beige, Black, Blue, Bronze, Brown, Clear, Copper, Gold, Gray, Green, Orange, Pink, Purple, Rainbow, Red, Rose gold, Silver, White, Yellow

**Secondary Color** — Same pattern
- Container: `#field-attributes-attribute-271`

### Personalization

| Element | Selector |
|---------|----------|
| Toggle/expand | Button with text "Add personalization" |
| Form container | `#personalization-form` (initially `wt-display-none`) |
| Instructions | `textarea#field-personalization-personalizationInstructions` |
| Char limit | `input#field-personalization-personalizationCharCountMax` |
| Required toggle | `input#field-personalization-personalizationIsRequired` |

### Shop Section

| Element | Selector |
|---------|----------|
| Dropdown | `select#shop-section-select` |

Options are shop-specific. `value="0"` = None. `value="1"` = Add new section.

### Shipping

| Element | Selector |
|---------|----------|
| Profile container | `#field-sourceShippingProfileId` |
| Select/Change button | Button with text "Select profile" or "Change profile" |
| Overlay | `#shipping-profile-overlay` |

### Processing

| Element | Selector |
|---------|----------|
| Ready to ship | `input[name="readinessState"][value="1"]` |
| Made to order | `input[name="readinessState"][value="2"]` |
| Processing time | `select[name="processingRange"]` |

Processing time options: `0` (1 day), `1` (1-2 days), `2` (1-3 days), `custom_range`.

### Return Policy

| Element | Selector |
|---------|----------|
| Policy container | `#field-returnPolicyId` (`data-testid="policy-list"`) |
| Change button | Button with text "Change policy" |
| Overlay | `#select-return-policy-overlay` |

### Renewal Options (Settings tab)

| Option | Index | Selector |
|--------|-------|----------|
| Automatic | 0 | `input[name="shouldAutoRenew"]` (index 0) |
| Manual | 1 | `input[name="shouldAutoRenew"]` (index 1) |

### Toggles

| Toggle | Selector |
|--------|----------|
| Featured listing | `input#listing-featured-rank-checkbox` |
| Etsy Ads | `input#listing-is-promoted-checkbox` |

### Action Buttons

| Button | Selector |
|--------|----------|
| Save as draft | `button[data-testid="save"]` or `button#shop-manager--listing-save` |
| Publish | `button[data-testid="publish"]` |
| Preview | Button with text "Preview" |

### Feedback

| Element | Selector |
|---------|----------|
| Success toast | `[data-test-id="toast-success"]` |
| Error toast | `[data-test-id="toast-error"]`, `[role="alert"]` |

## Automation Helpers

```javascript
// Radio by index (whoMade, isSupply, shouldAutoRenew)
const radios = document.querySelectorAll('input[name="whoMade"]');
radios[0].click(); // "I did"

// Radio by value (whatContent)
document.querySelector('input[name="whatContent"][value="original"]').click();

// Standard select dropdown (whenMade, shopSection)
const select = document.querySelector('select#when-made-select');
select.value = 'made_to_order';
select.dispatchEvent(new Event('change', { bubbles: true }));

// Chip input (tags, materials)
const input = document.querySelector('input#listing-tags-input');
const btn = document.querySelector('button#listing-tags-button');
input.focus();
input.value = 'my tag';
input.dispatchEvent(new Event('input', { bubbles: true }));
btn.click();
```

## Testing Checklist

Before each release, verify on Etsy listing editor:

- [ ] Who made it — all 3 radio options selectable
- [ ] What is it — both radio options selectable
- [ ] AI content — both radio options selectable
- [ ] When made — dropdown value changes
- [ ] Category search works
- [ ] Title textarea accepts text
- [ ] Description textarea accepts text
- [ ] Price input accepts numbers
- [ ] Quantity input accepts numbers
- [ ] Tags added via chip input
- [ ] Materials added via chip input
- [ ] Shop section dropdown changes
- [ ] Renewal option — both radio options selectable
- [ ] Photo upload triggers
- [ ] Digital file upload triggers
- [ ] Save as draft button works
- [ ] Publish button works
- [ ] Success toast appears

## Known Issues

1. **Radio IDs are dynamic** — `wt-radio-*` UUIDs change per page load, use `name` attribute
2. **Tag/Materials input** — Click the Add button; Enter key may not work reliably
3. **Photo upload** — File input is hidden, set `.files` via DataTransfer
4. **Category search** — Debounced, need delay after typing
5. **Save button** — May show loading state, wait for completion
6. **SKU field** — Has `aria-hidden="true"`, may need special handling
7. **Listing type switch** — Triggers confirmation dialog when switching to digital
