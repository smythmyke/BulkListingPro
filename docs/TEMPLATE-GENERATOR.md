# Template Generator

## Overview

`scripts/generate-template.js` generates the official BulkListingPro XLSX spreadsheet template that users download to bulk-import listings. It uses **ExcelJS** for full formatting support (colors, dropdowns, data validation).

## Usage

```bash
node scripts/generate-template.js
```

Output: `templates/BulkListingPro-template.xlsx`

## Dependencies

- **exceljs** (npm) - Full-featured Excel generation with formatting, data validation, and styling

## Generated Sheets

| # | Sheet | Purpose |
|---|-------|---------|
| 1 | Products | Main data entry with dropdowns and validation (33 columns) |
| 2 | Categories | Category list referenced by Products dropdown |
| 3 | Options | Reference table showing all valid dropdown values |
| 4 | Instructions | Column-by-column guide with requirements, examples, defaults |
| 5 | File Paths Help | How to get local file paths and cloud URLs |

## Color Theme

| Color | ARGB | Used For |
|-------|------|----------|
| Orange | `FFF56400` | Required column headers, File Paths header |
| Gray | `FF666666` | Optional column headers |
| Yellow | `FFFFF9C4` | Example row background |
| Blue | `FF1565C0` | Categories sheet header |
| Purple | `FF6A1B9A` | Instructions sheet header |
| Green | `FF2E7D32` | Options sheet header |

## Key Structures

### COLUMNS array
Defines all 33 spreadsheet columns with `key`, `header`, `width`, and `note` (cell comment). Column order in this array = column order in the spreadsheet.

### OPTIONS object
Dropdown values for selection fields. These use **friendly text** (e.g., "I did") which gets mapped to code values (e.g., `i_did`) by `sanitizeListing()` in `sidepanel/sidepanel.js`.

### CATEGORIES array
Must match the category list in `sidepanel/sidepanel.html`. The Products sheet references the Categories sheet for its dropdown.

### applyDropdown() helper
Applies inline data validation dropdowns to rows 2-501 for a given column. Uses comma-joined formulae for inline lists.

## Adding a New Dropdown Field

1. Add values to `OPTIONS` object
2. Add column to `COLUMNS` array (position determines column order)
3. Call `applyDropdown()` in the Products sheet section
4. Add entry to `optionEntries` for the Options sheet
5. Add row to `instructions` array for the Instructions sheet
6. Update `sanitizeListing()` in `sidepanel/sidepanel.js` with friendly-to-code mapping
7. Regenerate: `node scripts/generate-template.js`

## Adding a New Category

1. Add to `CATEGORIES` array
2. Add description to `CATEGORY_DESCRIPTIONS` object
3. Update the category `<select>` in `sidepanel/sidepanel.html` to match
4. Regenerate: `node scripts/generate-template.js`
