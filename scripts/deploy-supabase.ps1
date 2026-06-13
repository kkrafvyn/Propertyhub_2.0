# Deploy BaytMiftah Supabase backend
# Usage: .\scripts\deploy-supabase.ps1 [-ProjectRef tcnsqtnwyyufeupktkhs]

param(
  [string]$ProjectRef = "tcnsqtnwyyufeupktkhs"
)

$ErrorActionPreference = "Stop"

Write-Host "Linking project $ProjectRef..."
supabase link --project-ref $ProjectRef

Write-Host "Pushing migrations..."
supabase db push

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
  supabase functions deploy $fn
}

Write-Host "Done. Verify at https://supabase.com/dashboard/project/$ProjectRef"
