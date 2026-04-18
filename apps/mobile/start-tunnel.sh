#!/bin/bash
# Start Expo with a localtunnel-based tunnel.
# Uses npx localtunnel — no account, no token, no install needed.
# REACT_NATIVE_PACKAGER_HOSTNAME embeds the tunnel URL in the QR code so
# iPhone Expo Go scanning works from anywhere (no same-WiFi requirement).

set -e
unset ANDROID_HOME
cd "$(dirname "$0")"

PORT=8083
LT_LOG="/tmp/lt-expo.log"

# Kill any previous localtunnel for this port
pkill -f "lt --port $PORT" 2>/dev/null || true
sleep 1

echo "Starting tunnel on port $PORT..."
rm -f "$LT_LOG"

# Start localtunnel in background; it prints the URL to stdout on the first line
npx --yes localtunnel --port $PORT > "$LT_LOG" 2>&1 &
LT_PID=$!

# Wait for localtunnel to print its URL (up to 20s)
TUNNEL_URL=""
for i in $(seq 1 20); do
  sleep 1
  TUNNEL_URL=$(grep -m1 "your url is:" "$LT_LOG" 2>/dev/null | sed 's/.*your url is: //' | tr -d '[:space:]' || true)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  # Check if lt died
  if ! kill -0 $LT_PID 2>/dev/null; then
    break
  fi
done

if [ -z "$TUNNEL_URL" ]; then
  echo ""
  echo "❌ Could not get tunnel URL. Log:"
  cat "$LT_LOG" 2>/dev/null
  kill $LT_PID 2>/dev/null
  exit 1
fi

# Strip protocol prefix — Metro needs just the hostname
TUNNEL_HOST=$(echo "$TUNNEL_URL" | sed 's|https://||')
echo "✅ Tunnel active: $TUNNEL_URL"
echo "📱 Scan the QR code in Expo Go"
echo ""

# Trap to kill localtunnel when Metro exits
trap "kill $LT_PID 2>/dev/null; echo 'tunnel stopped.'" EXIT

# Start Metro — REACT_NATIVE_PACKAGER_HOSTNAME embeds the tunnel URL in the QR
REACT_NATIVE_PACKAGER_HOSTNAME="$TUNNEL_HOST" npx expo start --port $PORT
