# BulkListingPro

> Chrome extension for bulk uploading digital product listings to Etsy

## What It Does

1. Upload a spreadsheet with your listing data
2. Preview listings in a queue
3. Click "Upload" - extension automates Etsy listing creation
4. Pay per listing with credits

## Status

**Phase:** Early Development

## Quick Start (Development)

```bash
# Clone/navigate to project
cd C:\Projects\BulkListingPro-extension

# Install dependencies (when package.json exists)
npm install

# Load in Chrome
1. Go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder
```

## Project Structure

```
BulkListingPro-extension/
├── manifest.json        # Extension config
├── background/          # Service worker
├── content/             # Etsy page automation
├── sidepanel/           # Main UI
├── services/            # Shared utilities
├── popup/               # Quick status popup
├── assets/              # Icons, styles
└── docs/                # Documentation
    ├── ARCHITECTURE.md  # System design
    ├── ETSY-SELECTORS.md # DOM selectors
    └── CREDIT-SYSTEM.md # Monetization
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant context
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [docs/ETSY-SELECTORS.md](./docs/ETSY-SELECTORS.md) - Etsy DOM selectors
- [docs/CREDIT-SYSTEM.md](./docs/CREDIT-SYSTEM.md) - Credit pricing & flow

## Related Projects

| Project | Purpose |
|---------|---------|
| [GovToolsPro Extension](C:\Projects\GovToolsPro-extension) | Reference for credit system |
| [Etsy Uploader (Node.js)](C:\Projects\etsy-uploader-gumroad) | Automation logic to port |

## License

Proprietary - All rights reserved
