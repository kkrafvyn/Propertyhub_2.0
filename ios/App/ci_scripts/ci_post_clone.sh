#!/bin/bash
set -euo pipefail
cd "${CI_PRIMARY_REPOSITORY_PATH:?Xcode Cloud repository path is required}"
# Production public frontend settings must be provided in the Cloud workflow.
: "${VITE_SUPABASE_URL:?Set the production Supabase URL in Xcode Cloud}"
: "${VITE_SUPABASE_ANON_KEY:?Set the production Supabase anon key in Xcode Cloud}"
if ! command -v node >/dev/null || [ "$(node -p 'Number(process.versions.node.split(".")[0]) >= 22')" != true ]; then
  brew install node@24
  export PATH="$(brew --prefix node@24)/bin:$PATH"
fi
if ! command -v pod >/dev/null; then
  brew install cocoapods
fi
export VITE_ENABLE_DEMO_DATA=false
export MOBILE_SYNC_SKIP_PROVISION=1
export VITE_APP_VERSION="${VITE_APP_VERSION:-1.0.0}"
export VITE_APP_BUILD_NUMBER="${CI_BUILD_NUMBER:-1}"
npm ci --no-audit --no-fund
npm run mobile:consumer:sync
