# Build script for Chrome Web Store submission
# Removes the 'key' field from manifest.json and creates a zip

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $projectDir "dist"
$zipName = "BulkListingPro-store.zip"

Write-Host "Building BulkListingPro for Chrome Web Store..." -ForegroundColor Cyan

# Create dist directory
if (Test-Path $distDir) {
    Remove-Item -Recurse -Force $distDir
}
New-Item -ItemType Directory -Path $distDir | Out-Null

# Read manifest and remove 'key' field
$manifest = Get-Content (Join-Path $projectDir "manifest.json") -Raw | ConvertFrom-Json
if ($manifest.PSObject.Properties["key"]) {
    $manifest.PSObject.Properties.Remove("key")
    Write-Host "  Removed 'key' field from manifest" -ForegroundColor Yellow
}

# Files/folders to include
$includeItems = @(
    "manifest.json",
    "background",
    "content",
    "sidepanel",
    "editor",
    "popup",
    "services",
    "assets",
    "templates"
)

# Copy files to dist
foreach ($item in $includeItems) {
    $source = Join-Path $projectDir $item
    if (Test-Path $source) {
        $dest = Join-Path $distDir $item
        if ((Get-Item $source).PSIsContainer) {
            Copy-Item -Recurse $source $dest
        } else {
            Copy-Item $source $dest
        }
    }
}

# Remove test CSVs from templates
$testCsvs = Get-ChildItem (Join-Path $distDir "templates") -Filter "*test*" -ErrorAction SilentlyContinue
foreach ($csv in $testCsvs) {
    Remove-Item $csv.FullName
    Write-Host "  Removed test file: $($csv.Name)" -ForegroundColor Yellow
}

# Write modified manifest (without key)
$manifest | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $distDir "manifest.json") -Encoding UTF8

# Create zip
$zipPath = Join-Path $projectDir $zipName
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}
Compress-Archive -Path "$distDir\*" -DestinationPath $zipPath

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "  Output: $zipPath" -ForegroundColor White
Write-Host ""
Write-Host "Upload this zip to Chrome Web Store Developer Dashboard" -ForegroundColor Cyan
