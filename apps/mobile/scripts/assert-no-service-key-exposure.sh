#!/bin/bash
# Fails if any EXPO_PUBLIC_* variable is used for a service-role credential.

set -euo pipefail

ENV_FILES=$(find apps/mobile -maxdepth 1 -type f -name '.env*' -not -name '.env.example' 2>/dev/null || true)

if [ -z "$ENV_FILES" ]; then
  echo "No .env files found to scan."
  exit 0
fi

found=0

while IFS= read -r file; do
  [ -z "$file" ] && continue

  if grep -nEi '^[[:space:]]*(export[[:space:]]+)?EXPO_PUBLIC[_A-Z0-9]*(SERVICE|SERVICE_ROLE|SERVICE_KEY)[_A-Z0-9]*[[:space:]]*=' "$file" >/dev/null 2>&1; then
    echo "ERROR: Service-role style credential exposed through EXPO_PUBLIC_* in $file"
    grep -nEi '^[[:space:]]*(export[[:space:]]+)?EXPO_PUBLIC[_A-Z0-9]*(SERVICE|SERVICE_ROLE|SERVICE_KEY)[_A-Z0-9]*[[:space:]]*=' "$file" || true
    found=1
  fi
done <<< "$ENV_FILES"

if [ "$found" -ne 0 ]; then
  echo "Move backend-only credentials to non-EXPO_PUBLIC variables."
  exit 1
fi

echo "No EXPO_PUBLIC service-role style variables detected."
