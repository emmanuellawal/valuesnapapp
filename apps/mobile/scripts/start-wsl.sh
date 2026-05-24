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

require_supported_advertised_ip() {
  local ip="${1:-}"

  if [[ -z "$ip" ]]; then
    cat <<EOF >&2
Could not determine a routable Windows LAN IP for Expo Go.

Supported device-testing hosts in this repo must be 192.168.x.x, 10.x.x.x, or
the iPhone hotspot range 172.20.10.x.
Blank hosts, 127.x.x.x, and WSL's virtual 172.x.x.x ranges are rejected on purpose.
EOF
    exit 3
  fi

  if [[ "$ip" =~ ^127\. ]] || { [[ "$ip" =~ ^172\. ]] && [[ ! "$ip" =~ ^172\.20\.10\. ]]; }; then
    cat <<EOF >&2
Refusing to start Expo Go with advertised host $ip:$PORT.

That host is not supported for device testing here. Use a real Windows LAN
address (192.168.x.x, 10.x.x.x, or iPhone hotspot 172.20.10.x), not localhost or WSL's virtual NIC.
EOF
    exit 4
  fi

  if [[ ! "$ip" =~ ^(192\.168|10\.|172\.20\.10\.) ]]; then
    cat <<EOF >&2
Refusing to start Expo Go with advertised host $ip:$PORT.

This repo only supports device-testing hosts on 192.168.x.x, 10.x.x.x, or
iPhone hotspot 172.20.10.x so the QR code cannot silently point at a stale or
non-routable interface.
EOF
    exit 5
  fi
}

# Guard: only run under WSL
if ! grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; then
  echo "This script is for WSL only. On macOS/Linux use: npm run start:lan" >&2
  exit 1
fi

# Locate Windows executables (PATH may or may not include them under WSL)
IPCONFIG="$(command -v ipconfig.exe 2>/dev/null || true)"
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

# Fallback: common LAN ranges plus the iPhone hotspot subnet.
if [[ -z "$WIN_IP" ]]; then
  WIN_IP="$(
    "$IPCONFIG" 2>/dev/null \
      | tr -d '\r' \
      | awk -F': ' '/IPv4 Address/ { print $2 }' \
      | grep -E '^(192\.168|10\.|172\.20\.10\.)' \
      | head -n1
  )"
fi

if [[ -z "$WIN_IP" ]]; then
  echo "Could not detect a Windows LAN IPv4 address from ipconfig.exe output." >&2
  echo "Make sure you are on Wi-Fi (not only cellular tethering)." >&2
  exit 6
fi

# Grab WSL's own IP so we can wire the portproxy.
WSL_IP="$(hostname -I | awk '{print $1}')"
require_supported_advertised_ip "$WIN_IP"

if [[ "$WSL_IP" == "$WIN_IP" ]]; then
  cat <<EOF >&2
WSL mirrored networking is active: Windows LAN IP and WSL IP are both $WIN_IP.

Do not use npm run start:wsl in this mode. Classic portproxy is for non-mirrored
WSL with a 172.x.x.x distro IP, and can steal Metro's port in mirrored mode.

Use:
  npm start

If Expo Go fails after npm start, test the phone browser first:
  http://$WIN_IP:$PORT/status
EOF
  exit 9
fi

PORTPROXY_TARGET="$WSL_IP"

echo "Detected: Windows LAN IP = $WIN_IP    WSL IP = $WSL_IP    Port = $PORT    Portproxy target = $PORTPROXY_TARGET"

# One-time setup hint — the portproxy + firewall rule must be installed from an
# admin PowerShell. We can test whether traffic already flows by probing.
if [[ -z "$NETSH" ]]; then
  echo "Could not locate netsh.exe. Windows interop is required for npm run start:wsl." >&2
  exit 7
fi

EXISTING="$("$NETSH" interface portproxy show v4tov4 2>/dev/null | tr -d '\r' || true)"
if ! grep -qE "(^|[[:space:]])$PORT([[:space:]]|$)" <<<"$EXISTING"; then
  cat <<WARN >&2

[!] Windows portproxy for port $PORT is not configured. From an *admin* PowerShell, run:

    netsh interface portproxy add v4tov4 listenport=$PORT listenaddress=0.0.0.0 connectport=$PORT connectaddress=$PORTPROXY_TARGET
    New-NetFirewallRule -DisplayName "WSL Expo $PORT" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $PORT

(One-time. Re-run if your WSL IP changes, which it does on reboot unless you use
networkingMode=mirrored. See docs/deployment/README.md.)

WARN
  exit 8
fi

# Hand off to expo start --lan, but tell Metro to advertise the Windows IP to
# Expo Go. Without this, the QR/exp:// URL points at the unreachable WSL IP.
export REACT_NATIVE_PACKAGER_HOSTNAME="$WIN_IP"
echo "WSL portproxy mode detected."
echo "Advertising Metro to Expo Go as: $WIN_IP:$PORT"

exec npx expo start --lan --port "$PORT" "$@"
