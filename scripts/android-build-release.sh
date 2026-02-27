#!/usr/bin/env bash
# Build a release APK with a freshly generated keystore each time.
#
# Each build creates a new signing key, signs the APK with it, and outputs
# the keystore alongside the APK for reference.
#
# Usage:
#   ./scripts/android-build-release.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
OUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
KEYSTORE_DIR="$OUT_DIR"
KEYSTORE_PATH="$KEYSTORE_DIR/release-$TIMESTAMP.jks"
KEY_ALIAS="ponte"
STORE_PASSWORD="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"
KEY_PASSWORD="$STORE_PASSWORD"

# --- Build ---
echo "==> Building release APK..."
"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleRelease

mkdir -p "$KEYSTORE_DIR"

# --- Generate keystore ---
echo "==> Generating fresh keystore: $KEYSTORE_PATH"
keytool -genkeypair \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 365 \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=Ponte Dev Build, OU=Dev, O=Ponte, L=Unknown, ST=Unknown, C=XX" \
  -storetype JKS

# --- Find apksigner ---
if [[ -n "${ANDROID_HOME:-}" ]]; then
  BUILD_TOOLS_DIR="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools/" | sort -V | tail -1)"
  APKSIGNER="$BUILD_TOOLS_DIR/apksigner"
else
  APKSIGNER="apksigner"
fi

# --- Sign ---
UNSIGNED="$OUT_DIR/app-release-unsigned.apk"
SIGNED="$OUT_DIR/ponte-release.apk"

if [[ ! -f "$UNSIGNED" ]]; then
  echo "ERROR: unsigned APK not found at $UNSIGNED" >&2
  exit 1
fi

echo "==> Signing APK..."
"$APKSIGNER" sign \
  --ks "$KEYSTORE_PATH" \
  --ks-key-alias "$KEY_ALIAS" \
  --ks-pass "pass:$STORE_PASSWORD" \
  --key-pass "pass:$KEY_PASSWORD" \
  --out "$SIGNED" \
  "$UNSIGNED"

echo "==> Verifying signature..."
"$APKSIGNER" verify "$SIGNED"

echo ""
echo "Done!"
echo "  APK:      $SIGNED"
echo "  Keystore: $KEYSTORE_PATH"
echo "  Alias:    $KEY_ALIAS"
echo "  Password: $STORE_PASSWORD"
