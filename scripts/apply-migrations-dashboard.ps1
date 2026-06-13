# Opens Supabase SQL Editor and prints apply steps.
# Full schema: run `npm run db:bundle` first to generate scripts/all-migrations.sql

param(
  [string]$ProjectRef = "tcnsqtnwyyufeupktkhs"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sqlPath = Join-Path $root "scripts\all-migrations.sql"

if (-not (Test-Path $sqlPath)) {
  Write-Host "Generating bundled migrations..."
  Push-Location $root
  npm run db:bundle
  Pop-Location
}

$url = "https://supabase.com/dashboard/project/$ProjectRef/sql/new"
Write-Host ""
Write-Host "1. Open SQL Editor: $url"
Write-Host "2. Paste contents of: $sqlPath"
Write-Host "3. Click Run"
Write-Host "4. Verify: npm run check:supabase"
Write-Host "5. Deploy functions: npm run deploy:backend"
Write-Host ""

Start-Process $url
