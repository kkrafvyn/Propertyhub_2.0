param(
  [string]$ProjectRef
)

$ErrorActionPreference = "Stop"

$frontendEnvPath = Join-Path $PSScriptRoot "..\..\baytmiftah\.env"
$frontendProjectRef = $null

if (Test-Path $frontendEnvPath) {
  $frontendUrl = Get-Content $frontendEnvPath |
    Where-Object { $_ -match "^\s*VITE_SUPABASE_URL\s*=" } |
    Select-Object -First 1

  if ($frontendUrl -match "https://([a-z0-9]+)\.supabase\.co") {
    $frontendProjectRef = $Matches[1]
  }
}

if (-not $ProjectRef) {
  $ProjectRef = $frontendProjectRef
}

if (-not $ProjectRef) {
  throw "No ProjectRef supplied and no VITE_SUPABASE_URL project ref found in frontend .env."
}

$frontendLabel = if ($frontendProjectRef) { $frontendProjectRef } else { "<not found>" }
Write-Host "Frontend project ref: $frontendLabel"
Write-Host "Target project ref:   $ProjectRef"

if ($frontendProjectRef -and $frontendProjectRef -ne $ProjectRef) {
  Write-Host "WARNING: frontend .env does not match target project ref." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking project access..."
npx supabase projects api-keys --project-ref $ProjectRef | Out-Null
Write-Host "Project access: OK"

Write-Host ""
Write-Host "Remote Edge Functions:"
npx supabase functions list --project-ref $ProjectRef

Write-Host ""
Write-Host "Required secret status:"
$secretOutput = npx supabase secrets list --project-ref $ProjectRef | Out-String
foreach ($secret in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY")) {
  $status = if ($secretOutput -match "\b$secret\b") { "present" } else { "missing" }
  Write-Host "  $secret`: $status"
}

Write-Host ""
Write-Host "Migration dry-run:"
npx supabase link --project-ref $ProjectRef | Out-Null
npx supabase db push --linked --dry-run
