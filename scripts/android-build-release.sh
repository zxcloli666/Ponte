#!/usr/bin/env bash
# Build a release APK and optionally sign it (mirrors the GitHub Actions release workflow).
#
# If KEYSTORE_PATH, KEY_ALIAS, KEY_PASSWORD, STORE_PASSWORD env vars are set, the APK
# will be signed with apksigner. Otherwise an unsigned APK is produced.
#
# Usage:
#   ./scripts/android-build-release.sh
#   KEYSTORE_PATH=keystore.jks KEY_ALIAS=ponte KEY_PASSWORD=pass STORE_PASSWORD=pass ./scripts/android-build-release.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
OUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"

echo "==> Building release APK..."
"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleRelease

UNSIGNED="$OUT_DIR/app-release-unsigned.apk"
SIGNED="$OUT_DIR/ponte-release.apk"

if [[ -n "${KEYSTORE_PATH:-}" && -n "${KEY_ALIAS:-}" && -n "${KEY_PASSWORD:-}" && -n "${STORE_PASSWORD:-}" ]]; then
  echo "==> Signing APK..."

  # Find apksigner — prefer ANDROID_HOME, fall back to PATH
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    BUILD_TOOLS_DIR="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools/" | tail -1)"
    APKSIGNER="$BUILD_TOOLS_DIR/apksigner"
  else
    APKSIGNER="apksigner"
  fi

  "$APKSIGNER" sign \
    --ks "$KEYSTORE_PATH" \
    --ks-key-alias "$KEY_ALIAS" \
    --ks-pass "pass:$STORE_PASSWORD" \
    --key-pass "pass:$KEY_PASSWORD" \
    "$UNSIGNED"

  mv "$UNSIGNED" "$SIGNED"
  echo "==> Signed APK: $SIGNED"
else
  echo "==> No signing credentials provided; unsigned APK at: $UNSIGNED"
fi

echo "Done."
