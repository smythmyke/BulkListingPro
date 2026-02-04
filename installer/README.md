# BulkListingPro Installer

This directory contains the Inno Setup script for creating the Windows installer.

## Prerequisites

1. **Inno Setup 6+** - Download from https://jrsoftware.org/isdl.php
2. **Node.js** - To pre-install node_modules (optional but recommended)

## Building the Installer

### Option A: With Pre-bundled Dependencies (Recommended)

This creates a larger installer (~15MB) but users don't need npm:

```bash
# 1. Install dependencies in native-host folder
cd ../native-host
npm install --production

# 2. Open BulkListingPro.iss in Inno Setup
# 3. Click Build > Compile (or press Ctrl+F9)
# 4. Output: ../dist/BulkListingPro-Setup-v0.1.0.exe
```

### Option B: Without Dependencies

Users will need Node.js and npm install runs during setup:

```bash
# 1. Delete node_modules from native-host (if exists)
# 2. Compile the .iss file
# 3. Installer will run `npm install` during setup
```

## What the Installer Does

1. Checks if Node.js is installed (prompts to install if not)
2. Copies native host files to `C:\Users\{user}\AppData\Local\Programs\BulkListingPro`
3. Installs npm dependencies (if not bundled)
4. Creates `com.bulklistingpro.host.json` manifest
5. Registers native messaging host in Windows Registry
6. Creates desktop shortcut "Chrome (BulkListingPro)"
7. Creates Start Menu entries

## Files

| File | Purpose |
|------|---------|
| `BulkListingPro.iss` | Inno Setup script |
| `Launch Chrome.bat` | Batch file for launching Chrome |
| `LaunchChrome.vbs` | VBScript for launching Chrome (no console window) |

## Updating Version

1. Edit `#define MyAppVersion` in `BulkListingPro.iss`
2. Recompile
3. Upload to GitHub Releases:
   ```bash
   gh release create v0.2.0 ../dist/BulkListingPro-Setup-v0.2.0.exe
   ```
