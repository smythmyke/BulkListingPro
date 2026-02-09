# BulkListingPro - Chrome Web Store Listing

> Paste these fields into the Chrome Web Store Developer Dashboard.

---

## Name

BulkListingPro - Etsy Bulk Upload Tool

## Short Description (132 char max)

Bulk upload Etsy listings with AI-powered titles, tags & descriptions. Import spreadsheets, research competitors, upload in minutes.

## Detailed Description

BulkListingPro automates Etsy listing creation for digital product sellers. Upload dozens of SVG files, digital planners, printables, and templates in minutes instead of hours.

NEW IN v0.5: Guided product tour for new users, full-page Listing Editor with AI tools, and tag intelligence.

HOW IT WORKS
1. Import your spreadsheet (XLSX/CSV) or use the built-in form
2. Edit listings in the full-page editor — form view or grid view
3. Click Upload — listings are created automatically on Etsy
4. Track progress with pause, skip, and resume controls

LISTING EDITOR
• Form & Grid views — card-based editing or spreadsheet-style bulk edits
• AI-powered generation — titles, descriptions, and tags with one click
• Listing evaluation — SEO quality scores and actionable recommendations
• Tag intelligence — category suggestions, competitor tag import, frequency analysis
• Validation — catch missing fields, duplicates, similar tags, and price outliers
• Undo/Redo — every action tracked, up to 50 steps (Ctrl+Z / Ctrl+Y)
• Image management — drag-and-drop, reorder, lightbox preview
• Export — save your work as XLSX or CSV anytime

BULK UPLOAD FEATURES
• Spreadsheet import — upload 10, 50, or 100+ listings at once
• 24 digital product categories — SVG cut files, fonts, planners, templates, and more
• Smart tag management — up to 13 tags per listing
• Draft or Publish — choose to save as draft for review or publish immediately
• Image support — drag-and-drop up to 5 images per listing
• Progress tracking — real-time status with error details
• Retry failed listings — one-click re-queue for failed uploads

RESEARCH TOOLS
• Capture competitor listings — extract tags, title, price, and description
• Tag Library — save and reuse tag sets across listings
• Use as Template — apply captured data to new listings instantly

PERFECT FOR
• SVG & cut file sellers (Cricut, Silhouette, Glowforge)
• Digital planner creators
• Printable art and wall art shops
• Template sellers (Canva, social media, resume)
• Font designers
• Embroidery pattern shops

REQUIREMENTS
• Google Chrome on Windows
• Etsy seller account
• Free helper app for local file paths (optional, one-time install)

PRICING
2 credits per listing. Packs start at $1.99 for 50 credits (~25 listings).
New users get 5 free credits to try it out!

SUPPORT & FEEDBACK
https://github.com/smythmyke/BulkListingPro/issues

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
