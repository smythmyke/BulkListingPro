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
1. Fill in the included spreadsheet template (or use the built-in form)
2. Click Upload — the extension creates each listing on Etsy automatically
3. Track progress in the sidepanel with pause, skip, and cancel controls

FEATURES
• Spreadsheet import — bulk upload from XLSX or CSV
• Single listing form — quick entry with image drag-and-drop
• Category dropdowns — pre-filled with Etsy digital product categories
• Tag management — up to 13 tags per listing
• Progress tracking — real-time status for each listing
• Pause / Resume / Cancel — full control over the upload process
• Credit-based pricing — pay only for what you upload

WHAT YOU NEED
• Google Chrome on Windows
• A one-time helper app install (free, download from extension)
• An Etsy seller account

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
| `storage` | Save user preferences and cached credit balance |
| `identity` | Google sign-in for authentication |
| `sidePanel` | Main extension UI |
| `nativeMessaging` | Communicate with local helper app for browser automation |

## Host Permission Justifications

| Host | Justification |
|------|---------------|
| `*.etsy.com` | Listing automation on Etsy seller pages |
| Backend API | Authentication and credit management |
| `localhost:9222` | CDP connection to user's browser for automation |

## Single Purpose Description

Automates Etsy listing creation from spreadsheets.

## Data Use Disclosures

- Authentication tokens (Google OAuth) — used for user sign-in
- Credit balance — synced with backend for billing
- No browsing history collected
- No personal content collected
- No listing content transmitted to our servers
