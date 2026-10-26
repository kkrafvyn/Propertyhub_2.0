#!/bin/bash
set -euo pipefail
cd "${CI_PRIMARY_REPOSITORY_PATH:?Xcode Cloud repository path is required}"
xcode_major="$(xcodebuild -version | awk '/^Xcode / {split($2, version, "."); print version[1]}')"
if [[ ! "$xcode_major" =~ ^[0-9]+$ ]] || (( xcode_major < 26 )); then
  echo "Select Xcode 26 or later in the consumer Xcode Cloud workflow." >&2
  exit 1
fi
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
if [[ ! "$VITE_APP_BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
  echo "CI_BUILD_NUMBER must be a positive integer." >&2
  exit 1
fi
# Cloud archives must refresh native dependencies as well as web assets.
unset MOBILE_SYNC_COPY_ONLY
npm ci --no-audit --no-fund
npm run mobile:consumer:sync
# The web environment value alone does not update CFBundleVersion.
cd ios/App
xcrun agvtool new-version -all "$VITE_APP_BUILD_NUMBER"
