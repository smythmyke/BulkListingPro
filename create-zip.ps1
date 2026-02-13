$source = 'C:\Projects\BulkListingPro-extension'
$version = '0.7.1'
$dest = "$source\BulkListingPro-v$version.zip"
$temp = "$source\_temp_zip"

if (Test-Path $dest) { Remove-Item $dest }
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

@('assets', 'background', 'content', 'editor', 'popup', 'services', 'sidepanel', 'templates') | ForEach-Object {
    $srcPath = Join-Path $source $_
    if (Test-Path $srcPath) { Copy-Item -Path $srcPath -Destination $temp -Recurse }
}

Copy-Item -Path (Join-Path $source 'manifest.json') -Destination $temp

Get-ChildItem -Path $temp -Recurse -File | Where-Object {
    $_.Name -eq 'generate-icons.js' -or $_.Extension -eq '.map'
} | Remove-Item -Force

Compress-Archive -Path "$temp\*" -DestinationPath $dest -Force
Remove-Item $temp -Recurse -Force
Write-Host "Created: $dest"
