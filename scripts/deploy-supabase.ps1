# Deploy BaytMiftah Supabase backend
# Usage: .\scripts\deploy-supabase.ps1 [-ProjectRef ixmbfnfwpjwbfahqaftc]

param(
  [string]$ProjectRef = "ixmbfnfwpjwbfahqaftc"
)

$ErrorActionPreference = "Stop"
$supabase = "npx supabase"

Write-Host "Linking project $ProjectRef..."
Invoke-Expression "$supabase link --project-ref $ProjectRef"

Write-Host "Pushing migrations..."
Invoke-Expression "$supabase db push"

Write-Host "Deploying Edge Functions..."
$functions = @(
  "marketplace",
  "bookings",
  "auth",
  "geo",
  "messaging",
  "agencies",
  "agent",
  "moderation",
  "persistence",
  "intelligence",
  "payments",
  "renter",
  "pms",
  "smart",
  "developer",
  "enterprise",
  "trust",
  "email"
)

foreach ($fn in $functions) {
  Write-Host "  -> $fn"
  Invoke-Expression "$supabase functions deploy $fn"
}

Write-Host "Done. Verify at https://supabase.com/dashboard/project/$ProjectRef"
