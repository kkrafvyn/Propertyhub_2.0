#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."

# Uses the same archive/export/altool upload path as Workspace, with consumer assets.
: "${APP_VERSION:=1.0.0}"
: "${BUILD_NUMBER:?Set an unused consumer build number}"
: "${ASC_KEY_ID:?Set the App Store Connect key ID}"
: "${ASC_ISSUER_ID:?Set the App Store Connect issuer ID}"
[[ "$APP_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Invalid APP_VERSION'; exit 1; }
[[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid BUILD_NUMBER'; exit 1; }
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode_26.3.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode_26.3.app/Contents/Developer
fi
xcode_major="$(xcodebuild -version | awk '/^Xcode / {split($2,v,".");print v[1]}')"
if [[ ! "$xcode_major" =~ ^[0-9]+$ ]] || (( xcode_major < 26 )); then
  echo 'Consumer store upload requires Xcode 26+. Set DEVELOPER_DIR to its Contents/Developer folder.' >&2
  exit 1
fi

export VITE_APP_VERSION="$APP_VERSION" VITE_APP_BUILD_NUMBER="$BUILD_NUMBER"
export VITE_ENABLE_DEMO_DATA=false MOBILE_SYNC_SKIP_PROVISION=1
unset MOBILE_SYNC_COPY_ONLY
npm ci --no-audit --no-fund
npm run mobile:consumer:sync
output_dir="$(pwd)/release/consumer-store-$BUILD_NUMBER"
[[ ! -e "$output_dir" ]] || { echo "Output already exists: $output_dir"; exit 1; }
mkdir -p "$output_dir"
export CONSUMER_STORE_OUTPUT="$output_dir"
python3 - <<'PY'
import os, plistlib
from pathlib import Path
options = {'method': 'app-store-connect', 'teamID': '7T2JK53K5M',
           'signingStyle': 'automatic', 'destination': 'export',
           'manageAppVersionAndBuildNumber': False, 'uploadSymbols': True}
with (Path(os.environ['CONSUMER_STORE_OUTPUT']) / 'ExportOptions.plist').open('wb') as f:
    plistlib.dump(options, f)
PY
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$output_dir/Consumer.xcarchive" \
  -allowProvisioningUpdates MARKETING_VERSION="$APP_VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" DEVELOPMENT_TEAM=7T2JK53K5M archive \
  >"$output_dir/archive.log" 2>&1 || { tail -60 "$output_dir/archive.log"; exit 1; }
xcodebuild -exportArchive -archivePath "$output_dir/Consumer.xcarchive" \
  -exportOptionsPlist "$output_dir/ExportOptions.plist" -exportPath "$output_dir/export" \
  -allowProvisioningUpdates >"$output_dir/export.log" 2>&1 || { tail -60 "$output_dir/export.log"; exit 1; }
packages=("$output_dir"/export/*.ipa)
[[ ${#packages[@]} -eq 1 && -f "${packages[0]}" ]] || { echo 'Expected one consumer IPA'; exit 1; }
python3 - "${packages[0]}" <<'PY'
import sys, zipfile, plistlib
with zipfile.ZipFile(sys.argv[1]) as z:
    name = next(n for n in z.namelist() if n.startswith('Payload/') and n.count('/') == 2 and n.endswith('/Info.plist'))
    info = plistlib.loads(z.read(name))
    assert info['CFBundleIdentifier'] == 'com.baymiftah.app', 'Wrong app bundle; refusing upload'
PY
xcrun altool --validate-app -f "${packages[0]}" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" \
  >"$output_dir/validate.log" 2>&1 || { tail -60 "$output_dir/validate.log"; exit 1; }
xcrun altool --upload-app -f "${packages[0]}" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" \
  >"$output_dir/upload.log" 2>&1 || { tail -60 "$output_dir/upload.log"; exit 1; }
echo "Consumer uploaded. Apple processing and review remain. Logs: $output_dir"
