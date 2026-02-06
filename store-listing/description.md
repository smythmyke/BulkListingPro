# BulkListingPro - Chrome Web Store Listing

> Paste these fields into the Chrome Web Store Developer Dashboard.

---

## Name

BulkListingPro - Etsy Bulk Upload Tool

## Short Description (132 char max)

Bulk upload digital product listings to Etsy from a spreadsheet. Save hours on listing creation with automated uploads.

## Detailed Description

BulkListingPro automates Etsy listing creation so you can upload dozens
of digital products in minutes instead of hours.

HOW IT WORKS
1. Install the extension and log into Etsy
2. Fill in the spreadsheet template (or use the built-in form)
3. Click Upload — the extension creates each listing automatically
4. Track progress with pause, skip, and cancel controls

FEATURES
• Spreadsheet import — bulk upload from XLSX or CSV
• Single listing form — quick entry with image drag-and-drop
• URL support — reference images by web URL in spreadsheets
• Category dropdowns — pre-filled with Etsy digital product categories
• Tag management — up to 13 tags per listing
• Progress tracking — real-time status for each listing
• Pause / Resume / Cancel — full control over the upload process
• Auto-save — resume interrupted uploads

WHAT YOU NEED
• Google Chrome on Windows
• An Etsy seller account
• That's it! No extra software required.

POWER MODE (Optional)
Install the free helper app to use local file paths in your spreadsheets
(e.g., C:\Products\image.jpg). Most users don't need this.

NOTE
During uploads, Chrome shows a yellow "debugging" banner. This is normal
and required for automation to work.

PRICING
Each listing upload costs 2 credits. Credit packs start at $1.99 for 50
credits (~25 listings).

SUPPORT
Report issues: https://github.com/smythmyke/BulkListingPro/issues

## Category

Productivity

## Language

English

---

## Permission Justifications

| Permission | Justification |
|------------|---------------|
| `activeTab` / `scripting` / `tabs` | Detect Etsy pages and control the listing editor |
| `storage` | Save user preferences, queue state, and cached credit balance |
| `identity` | Google sign-in for authentication |
| `sidePanel` | Main extension UI |
| `nativeMessaging` | Optional: communicate with helper app for local file access |
| `debugger` | Automate form filling on Etsy listing pages |

## Host Permission Justifications

| Host | Justification |
|------|---------------|
| `*.etsy.com` | Listing automation on Etsy seller pages |
| Backend API | Authentication and credit management |
| `localhost:9222` | Optional: helper app communication for Power Mode |

## Single Purpose Description

Automates Etsy listing creation from spreadsheets.

## Data Use Disclosures

- Authentication tokens (Google OAuth) — used for user sign-in
- Credit balance — synced with backend for billing
- No browsing history collected
- No personal content collected
- No listing content transmitted to our servers
