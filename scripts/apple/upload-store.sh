#!/usr/bin/env bash
set -euo pipefail
umask 077
# Continue after the already uploaded Workspace build 101.
[[ "${BUILD_NUMBER:?Build number is required}" =~ ^[0-9]+$ ]] || { echo "Build number must be numeric"; exit 1; }
export BUILD_NUMBER="$((10#$BUILD_NUMBER + 101))"
export VITE_APP_BUILD_NUMBER="$BUILD_NUMBER"
export APPLE_TEAM_ID=7T2JK53K5M
export APPLE_RELEASE_DIR="$RUNNER_TEMP/apple-release-$PLATFORM"
mkdir -p "$APPLE_RELEASE_DIR" release
KEYCHAIN="$APPLE_RELEASE_DIR/signing.keychain-db"
cleanup() {
  security delete-keychain "$KEYCHAIN" 2>/dev/null || true
  python3 - <<'PY'
import os, shutil
from pathlib import Path
shutil.rmtree(os.environ['APPLE_RELEASE_DIR'], ignore_errors=True)
(Path.home() / '.appstoreconnect/private_keys' / ('AuthKey_' + os.environ['ASC_KEY_ID'] + '.p8')).unlink(missing_ok=True)
uuid = os.environ.get('IOS_PROFILE_UUID')
if uuid:
    for directory in ['Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles']:
        (Path.home() / directory / (uuid + '.mobileprovision')).unlink(missing_ok=True)
PY
}
trap cleanup EXIT
if [ -d /Applications/Xcode_26.3.app ]; then
  export DEVELOPER_DIR=/Applications/Xcode_26.3.app/Contents/Developer
fi
xcodebuild -version
python3 - <<'PY'
import os,re,subprocess
assert re.fullmatch(r'\d+\.\d+\.\d+', os.environ['APP_VERSION']), 'Version must be major.minor.patch'
version=subprocess.check_output(['xcodebuild','-version'], text=True)
assert int(re.search(r'Xcode (\d+)',version)[1]) >= 26, 'Xcode 26+ is required'
PY
npm ci --no-audit --no-fund
python3 scripts/apple/prepare-signing.py
if [ "$PLATFORM" = ios ]; then
  KEYCHAIN_PASSWORD="$(openssl rand -hex 24)"
  security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
  security set-keychain-settings -lut 21600 "$KEYCHAIN"
  security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
  security import "$APPLE_RELEASE_DIR/distribution.p12" -k "$KEYCHAIN" -P "$IOS_P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
  security list-keychains -d user -s "$KEYCHAIN" "$HOME/Library/Keychains/login.keychain-db"
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
  IOS_PROFILE_UUID="$(cat "$APPLE_RELEASE_DIR/profile-uuid")"
  export IOS_PROFILE_UUID
  npm run mobile:business:sync
  python3 - <<'PY'
import os
from pathlib import Path
p=Path('ios-business/App/App.xcodeproj/project.pbxproj')
s=p.read_text().replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "'+os.environ['IOS_PROFILE_UUID']+'";\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";')
p.write_text(s)
PY
  xcodebuild -workspace ios-business/App/App.xcworkspace -scheme App -configuration Release \
    -destination 'generic/platform=iOS' -archivePath release/Workspace.xcarchive \
    MARKETING_VERSION="$APP_VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" archive \
    >release/archive.log 2>&1 || { tail -60 release/archive.log; exit 1; }
  xcodebuild -exportArchive -archivePath release/Workspace.xcarchive \
    -exportOptionsPlist "$APPLE_RELEASE_DIR/ExportOptions.plist" -exportPath release \
    >release/export.log 2>&1 || { tail -60 release/export.log; exit 1; }
  FILES=(release/*.ipa)
  TYPE=ios
else
  npm run desktop:icons
  npm run build:desktop
  npm run desktop:prepare-builder
  npx electron-builder --mac mas --universal --publish never \
    --config.mas.provisioningProfile="$APPLE_RELEASE_DIR/workspace.provisionprofile" \
    --config.mas.bundleShortVersion="$APP_VERSION" --config.mas.bundleVersion="$BUILD_NUMBER" \
    --config.forceCodeSigning=true >release/mac-build.log 2>&1 || { tail -60 release/mac-build.log; exit 1; }
  FILES=(dist-desktop/mas-universal/*.pkg)
  TYPE=macos
fi
if [ "${#FILES[@]}" -ne 1 ] || [ ! -f "${FILES[0]}" ]; then
  echo 'Expected exactly one signed store package'; exit 1
fi
xcrun altool --validate-app -f "${FILES[0]}" -t "$TYPE" --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" >release/validate.log 2>&1 || { tail -60 release/validate.log; exit 1; }
xcrun altool --upload-app -f "${FILES[0]}" -t "$TYPE" --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" >release/upload.log 2>&1 || { tail -60 release/upload.log; exit 1; }
echo "$PLATFORM package uploaded to App Store Connect; processing and review remain." >> "$GITHUB_STEP_SUMMARY"
