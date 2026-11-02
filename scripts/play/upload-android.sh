#!/usr/bin/env bash
set -euo pipefail
umask 077

VARIANT="${PLAY_VARIANT:-consumer}"
APP_VERSION="${APP_VERSION:-1.0.0}"
BUILD_NUMBER="${BUILD_NUMBER:-1}"
PLAY_TRACK="${PLAY_TRACK:-internal}"
PLAY_STATUS="${PLAY_STATUS:-completed}"

case "$VARIANT" in
  consumer)
    PACKAGE_NAME="com.baytmiftah.app"
    ANDROID_DIR="android"
    SYNC_VARIANT="consumer"
    ;;
  workspace)
    PACKAGE_NAME="com.baytmiftah.workspace"
    ANDROID_DIR="android-business"
    SYNC_VARIANT="business"
    ;;
  *)
    echo "PLAY_VARIANT must be consumer or workspace"
    exit 1
    ;;
esac

export PLAY_VARIANT="$VARIANT"
export PLAY_SIGNING_DIR="${RUNNER_TEMP:-/tmp}/play-signing-${VARIANT}"
eval "$(node scripts/play/prepare-android-signing.mjs)"

npm ci --no-audit --no-fund

export MOBILE_SYNC_SKIP_PROVISION=1
export VITE_ENABLE_DEMO_DATA=false
export VITE_APP_VERSION="$APP_VERSION"
export VITE_APP_BUILD_NUMBER="$BUILD_NUMBER"

node scripts/mobile-sync.mjs "$SYNC_VARIANT"

cd "$ANDROID_DIR"
chmod +x gradlew
./gradlew bundleRelease -PplayVersionCode="$BUILD_NUMBER" -PplayVersionName="$APP_VERSION"

AAB="app/build/outputs/bundle/release/app-release.aab"
if [ ! -f "$AAB" ]; then
  echo "Expected AAB at $ANDROID_DIR/$AAB"
  exit 1
fi

mkdir -p ../release
cp "$AAB" "../release/${VARIANT}-release.aab"
cd ..

echo "Built ${VARIANT} AAB (version ${APP_VERSION}, code ${BUILD_NUMBER})" >> "${GITHUB_STEP_SUMMARY:-/dev/null}" 2>/dev/null || true
echo "PACKAGE_NAME=$PACKAGE_NAME"
echo "AAB_PATH=release/${VARIANT}-release.aab"
