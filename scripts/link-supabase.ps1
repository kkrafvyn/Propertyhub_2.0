# Link Supabase CLI to BaytMiftah and push migrations.
# Add your database password to .env first (Dashboard → Project Settings → Database).

param(
  [string]$ProjectRef = "ixmbfnfwpjwbfahqaftc"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

function Read-DotEnv($path) {
  if (-not (Test-Path $path)) { return @{} }
  $vars = @{}
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $vars[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
  return $vars
}

$dotenv = Read-DotEnv $envFile
$dbPassword = $dotenv['SUPABASE_DB_PASSWORD']
if (-not $dbPassword) { $dbPassword = $env:SUPABASE_DB_PASSWORD }

Write-Host "Linking project $ProjectRef..."
Push-Location $root

if ($dbPassword) {
  npx supabase link --project-ref $ProjectRef --password $dbPassword
  Write-Host "Pushing migrations..."
  npx supabase db push --password $dbPassword
} else {
  npx supabase link --project-ref $ProjectRef
  Write-Host ""
  Write-Host "Add SUPABASE_DB_PASSWORD to .env (from Supabase Dashboard → Database), then re-run:"
  Write-Host "  npm run supabase:link"
}

Pop-Location
