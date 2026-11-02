# Run after Play Console shows upload key valid (Consumer: com.baytmiftah.app).
# App integrity → Upload key: "will become valid on …" must be in the past.

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

Write-Host "1. Internal testing → Edit draft 1.0.1 → Upload release\consumer-release.aab → Save → Roll out"
Write-Host "2. Publishing overview → Send app for review (when enabled)"
Write-Host ""
Write-Host "AAB:" (Join-Path $Root "release\consumer-release.aab")
Write-Host "Upload folder:" "C:\Users\ponk3\Desktop\play-upload-baytmiftah\consumer-release.aab"
Write-Host ""
Write-Host "Optional: python scripts/serve-play-upload.py  (port 8765 for browser upload)"
