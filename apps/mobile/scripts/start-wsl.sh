#!/usr/bin/env bash
# Start Expo dev server from WSL2 so a physical phone on the same Wi-Fi can reach it.
#
# The problem: inside WSL2, `expo start --lan` binds Metro to WSL's virtual NIC
# (172.x.x.x, which is NOT routable from your phone). This script detects the
# Windows host's real LAN IP via `ipconfig.exe`, advertises it to Expo Go via
# REACT_NATIVE_PACKAGER_HOSTNAME, then ensures a Windows port-proxy + firewall
# rule forward traffic from <windows-lan-ip>:8083 into WSL.
#
# Prefer `networkingMode=mirrored` in .wslconfig if your WSL version supports it
# (WSL 2.0+, Windows 11 22H2+) — mirrored mode makes this script unnecessary.
#
# Usage: npm run start:wsl

set -euo pipefail

PORT="${EXPO_DEV_SERVER_PORT:-8083}"

# Guard: only run under WSL
if ! grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; then
  echo "This script is for WSL only. On macOS/Linux use: npm run start:lan" >&2
  exit 1
fi

# Locate Windows executables (PATH may or may not include them under WSL)
IPCONFIG="$(command -v ipconfig.exe 2>/dev/null || true)"
POWERSHELL="$(command -v powershell.exe 2>/dev/null || true)"
NETSH="$(command -v netsh.exe 2>/dev/null || true)"

if [[ -z "$IPCONFIG" ]]; then
  for path in /mnt/c/Windows/System32/ipconfig.exe /mnt/c/WINDOWS/System32/ipconfig.exe; do
    if [[ -x "$path" ]]; then IPCONFIG="$path"; break; fi
  done
fi

if [[ -z "$IPCONFIG" ]]; then
  echo "Could not locate ipconfig.exe. Is Windows interop enabled in WSL?" >&2
  exit 2
fi

# Grab the Wi-Fi adapter's IPv4 address from the Windows host.
# `ipconfig` emits CRLF; strip them before parsing.
WIN_IP="$(
  "$IPCONFIG" 2>/dev/null \
    | tr -d '\r' \
    | awk '
        /^Wireless LAN adapter Wi-Fi:/ { in_wifi=1; next }
        /^[A-Za-z]/ && !/^   / { in_wifi=0 }
        in_wifi && /IPv4 Address/ {
          sub(/^.*: /, "")
          print
          exit
        }
      '
)"

# Fallback: any adapter's IPv4 in a common RFC1918 range (not WSL's 172.16/12).
if [[ -z "$WIN_IP" ]]; then
  WIN_IP="$(
    "$IPCONFIG" 2>/dev/null \
      | tr -d '\r' \
      | awk -F': ' '/IPv4 Address/ { print $2 }' \
      | grep -E '^(192\.168|10\.)' \
      | head -n1
  )"
fi

if [[ -z "$WIN_IP" ]]; then
  echo "Could not detect a Windows LAN IPv4 address from ipconfig.exe output." >&2
  echo "Make sure you are on Wi-Fi (not only cellular tethering)." >&2
  exit 3
fi

# Grab WSL's own IP so we can wire the portproxy.
WSL_IP="$(hostname -I | awk '{print $1}')"

echo "Detected: Windows LAN IP = $WIN_IP    WSL IP = $WSL_IP    Port = $PORT"

# One-time setup hint — the portproxy + firewall rule must be installed from an
# admin PowerShell. We can test whether traffic already flows by probing.
if [[ -n "$NETSH" ]]; then
  EXISTING="$("$NETSH" interface portproxy show v4tov4 2>/dev/null | tr -d '\r' || true)"
  if ! grep -qE "(^|[[:space:]])$PORT([[:space:]]|$)" <<<"$EXISTING"; then
    cat <<WARN >&2

[!] Windows portproxy for port $PORT is not configured. From an *admin* PowerShell, run:

    netsh interface portproxy add v4tov4 listenport=$PORT listenaddress=0.0.0.0 connectport=$PORT connectaddress=$WSL_IP
    New-NetFirewallRule -DisplayName "WSL Expo $PORT" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $PORT

(One-time. Re-run if your WSL IP changes, which it does on reboot unless you use
networkingMode=mirrored. See docs/deployment/README.md.)

WARN
  fi
fi

# Hand off to expo start --lan, but tell Metro to advertise the Windows IP to
# Expo Go. Without this, the QR/exp:// URL points at the unreachable WSL IP.
export REACT_NATIVE_PACKAGER_HOSTNAME="$WIN_IP"
echo "Advertising Metro to Expo Go as: $WIN_IP:$PORT"
echo

exec npx expo start --lan --port "$PORT" "$@"
