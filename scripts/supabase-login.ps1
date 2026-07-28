# Reliable Supabase CLI auth on Windows (avoids broken interactive login / credential store).
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envLocal = Join-Path $projectRoot "supabase\.env.local"

Write-Host ""
Write-Host "BaytMiftah Supabase login" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Opening token page in your browser..."
Start-Process "https://supabase.com/dashboard/account/tokens"
Write-Host ""
Write-Host "2. Click 'Generate new token' and copy it (starts with sbp_)."
Write-Host "   Paste below and press Enter. Characters are hidden but input is accepted."
Write-Host ""

$token = Read-Host "Paste Supabase access token"
$token = $token.Trim()

if (-not $token) {
  Write-Host "No token entered. Cancelled." -ForegroundColor Red
  exit 1
}

if ($token -notmatch '^sbp_') {
  Write-Host "Warning: token usually starts with sbp_. Continuing anyway..." -ForegroundColor Yellow
}

$lines = @()
if (Test-Path $envLocal) {
  $lines = Get-Content $envLocal | Where-Object { $_ -notmatch '^SUPABASE_ACCESS_TOKEN=' }
}

$lines += "SUPABASE_ACCESS_TOKEN=$token"
Set-Content -Path $envLocal -Value $lines -Encoding UTF8
Write-Host ""
Write-Host "Saved token to supabase\.env.local" -ForegroundColor Green

$env:SUPABASE_ACCESS_TOKEN = $token
Set-Location $projectRoot

Write-Host ""
Write-Host "Verifying login..."
npx supabase projects list
if ($LASTEXITCODE -ne 0) {
  Write-Host "Token verification failed. Check the token and try again." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Linking project ixmbfnfwpjwbfahqaftc..."
npx supabase link --project-ref ixmbfnfwpjwbfahqaftc --workdir . --yes
if ($LASTEXITCODE -ne 0) {
  Write-Host "Project link failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Deploying edge functions and secrets..."
npm run supabase:deploy:payments -- --skip-db
if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed. See errors above." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Supabase backend deploy complete." -ForegroundColor Green
Write-Host "Press Enter to close."
Read-Host | Out-Null
