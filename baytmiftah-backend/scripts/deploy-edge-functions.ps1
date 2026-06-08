param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [switch]$Force,

  [switch]$DryRun,

  [switch]$SkipLink
)

$ErrorActionPreference = "Stop"

$functions = @(
  "auth",
  "agencies",
  "marketplace",
  "smart-devices",
  "agency-crm",
  "compliance",
  "trust",
  "monetization"
)

function Invoke-Supabase {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & npx supabase @Arguments
}

$frontendEnvPath = Join-Path $PSScriptRoot "..\..\baytmiftah\.env"
if (Test-Path $frontendEnvPath) {
  $frontendUrl = Get-Content $frontendEnvPath |
    Where-Object { $_ -match "^\s*VITE_SUPABASE_URL\s*=" } |
    Select-Object -First 1

  if ($frontendUrl -match "https://([a-z0-9]+)\.supabase\.co") {
    $frontendProjectRef = $Matches[1]
    if ($frontendProjectRef -ne $ProjectRef -and -not $Force) {
      throw "Frontend .env points to '$frontendProjectRef', but deploy target is '$ProjectRef'. Re-run with -Force only if this mismatch is intentional."
    }
  }
}

Write-Host "Checking Supabase CLI access for $ProjectRef..."
Invoke-Supabase -Arguments @("projects", "api-keys", "--project-ref", $ProjectRef) | Out-Null

Write-Host "Checking required Edge Function secrets..."
$secretOutput = Invoke-Supabase -Arguments @("secrets", "list", "--project-ref", $ProjectRef) | Out-String
$requiredSecrets = @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
$optionalKeySecrets = @("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY")

foreach ($secret in $requiredSecrets) {
  if ($secretOutput -notmatch "\b$secret\b") {
    throw "Missing required Supabase secret '$secret' on project '$ProjectRef'."
  }
}

if (-not (($optionalKeySecrets | Where-Object { $secretOutput -match "\b$_\b" }).Count)) {
  throw "Missing required Supabase anon/publishable secret on project '$ProjectRef'. Expected SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY."
}

if (-not $SkipLink) {
  Write-Host "Linking Supabase project $ProjectRef..."
  Invoke-Supabase -Arguments @("link", "--project-ref", $ProjectRef)
}

Write-Host "Checking database migrations..."
if ($DryRun) {
  Invoke-Supabase -Arguments @("db", "push", "--linked", "--dry-run")
  Write-Host "Dry run complete. No migrations or functions were deployed."
  exit 0
}

Invoke-Supabase -Arguments @("db", "push", "--linked", "--yes")

foreach ($functionName in $functions) {
  Write-Host "Deploying Edge Function: $functionName"
  Invoke-Supabase -Arguments @("functions", "deploy", $functionName, "--project-ref", $ProjectRef)
}

Write-Host ""
Write-Host "Deployment commands completed."
Write-Host "Verify required function secrets are set in Supabase:"
Write-Host "  SUPABASE_URL"
Write-Host "  SUPABASE_SERVICE_ROLE_KEY"
Write-Host "  SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY"
