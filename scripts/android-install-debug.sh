#!/usr/bin/env bash
# Build and install debug APK on a connected device / emulator.
# Usage: ./scripts/android-install-debug.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"

echo "==> Building debug APK..."
"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleDebug

APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$APK" ]]; then
  echo "ERROR: APK not found at $APK"
  exit 1
fi

echo "==> Installing on device..."
adb install -r "$APK"

echo "==> Launching Ponte..."
adb shell am start -n com.ponte/.ui.MainActivity

echo "Done."
