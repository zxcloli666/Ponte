#!/usr/bin/env bash
# Generate an Android signing keystore and print GitHub secrets ready for copy-paste.
#
# Usage:
#   ./scripts/android-generate-signing-key.sh
set -euo pipefail

KEYSTORE_FILE="ponte-release.jks"
KEY_ALIAS="ponte"
STORE_PASSWORD="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"
KEY_PASSWORD="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"

if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "ERROR: $KEYSTORE_FILE already exists. Remove it first if you want to regenerate." >&2
  exit 1
fi

echo "==> Generating keystore: $KEYSTORE_FILE"
keytool -genkeypair \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=Ponte, OU=Mobile, O=Ponte, L=Unknown, ST=Unknown, C=XX" \
  -storetype JKS

KEYSTORE_BASE64="$(base64 -w 0 "$KEYSTORE_FILE")"

echo ""
echo "======================================================"
echo "  GitHub Secrets — add these to your repo:"
echo "  Settings -> Secrets and variables -> Actions -> New"
echo "======================================================"
echo ""
echo "  Name: KEYSTORE_BASE64"
echo "  Value:"
echo "$KEYSTORE_BASE64"
echo ""
echo "  Name: KEY_ALIAS"
echo "  Value: $KEY_ALIAS"
echo ""
echo "  Name: KEY_PASSWORD"
echo "  Value: $KEY_PASSWORD"
echo ""
echo "  Name: STORE_PASSWORD"
echo "  Value: $STORE_PASSWORD"
echo ""
echo "======================================================"
echo "  Keystore file saved: $KEYSTORE_FILE"
echo "  Keep it safe! If you lose it, you can't update signed APKs."
echo "======================================================"
