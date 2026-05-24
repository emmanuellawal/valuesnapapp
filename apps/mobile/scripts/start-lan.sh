#!/usr/bin/env bash
#
# Safe Expo LAN startup across native Linux/macOS and WSL2.
# On plain WSL2, `expo start --lan` advertises the distro's virtual 172.x.x.x
# address, which Expo Go on a phone cannot reach. We only allow the normal LAN
# path when mirrored networking is active; otherwise we fail fast with the fix.

set -euo pipefail

PORT="${EXPO_DEV_SERVER_PORT:-8083}"

is_wsl() {
  grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null
}

detect_native_lan_ip() {
  node <<'EOF'
const os = require('os');

for (const addresses of Object.values(os.networkInterfaces())) {
  for (const address of addresses || []) {
    if (address.family !== 'IPv4' || address.internal) {
      continue;
    }

    if (/^(192\.168|10\.|172\.20\.10\.)/.test(address.address)) {
      process.stdout.write(`${address.address}\n`);
      process.exit(0);
    }
  }
}
EOF
}

find_powershell() {
  local powershell
  powershell="$(command -v powershell.exe 2>/dev/null || true)"

  if [[ -n "$powershell" ]]; then
    printf '%s\n' "$powershell"
    return 0
  fi

  for path in /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe /mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe; do
    if [[ -x "$path" ]]; then
      printf '%s\n' "$path"
      return 0
    fi
  done

  return 1
}

require_supported_advertised_ip() {
  local ip="${1:-}"

  if [[ -z "$ip" ]]; then
    cat <<EOF >&2
Could not determine a routable LAN IP for Expo Go.

Supported device-testing hosts in this repo must be 192.168.x.x, 10.x.x.x, or
the iPhone hotspot range 172.20.10.x.
Blank hosts, 127.x.x.x, and WSL's virtual 172.x.x.x ranges are rejected on purpose.
EOF
    exit 2
  fi

  if [[ "$ip" =~ ^127\. ]] || { [[ "$ip" =~ ^172\. ]] && [[ ! "$ip" =~ ^172\.20\.10\. ]]; }; then
    cat <<EOF >&2
Refusing to start Expo Go with advertised host $ip:$PORT.

That host is not supported for device testing here. Use a real LAN address
(192.168.x.x, 10.x.x.x, or iPhone hotspot 172.20.10.x), not localhost or WSL's virtual NIC.
EOF
    exit 3
  fi

  if [[ ! "$ip" =~ ^(192\.168|10\.|172\.20\.10\.) ]]; then
    cat <<EOF >&2
Refusing to start Expo Go with advertised host $ip:$PORT.

This repo only supports device-testing hosts on 192.168.x.x, 10.x.x.x, or
iPhone hotspot 172.20.10.x so the QR code cannot silently point at a stale or
non-routable interface.
EOF
    exit 4
  fi
}

probe_windows_route_to_wsl() {
  local host_ip="$1"
  local powershell="$2"
  local probe_pid=""
  local ready=0

  node -e "
    const http = require('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('valuesnap-expo-probe');
    });
    server.listen(${PORT}, '0.0.0.0');
    setInterval(() => {}, 1000);
  " >/tmp/valuesnap-expo-probe.log 2>&1 &
  probe_pid=$!

  cleanup_probe() {
    if [[ -n "$probe_pid" ]]; then
      kill "$probe_pid" 2>/dev/null || true
      wait "$probe_pid" 2>/dev/null || true
    fi
  }

  trap cleanup_probe RETURN

  for _ in $(seq 1 20); do
    if curl -fsS --max-time 1 "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 0.25
  done

  if [[ "$ready" -ne 1 ]]; then
    return 1
  fi

  "$powershell" -NoProfile -Command "& { try { (Invoke-WebRequest -UseBasicParsing \"http://$host_ip:$PORT\" -TimeoutSec 3) | Out-Null; exit 0 } catch { exit 1 } }" >/dev/null 2>&1
}

find_ipconfig() {
  local ipconfig
  ipconfig="$(command -v ipconfig.exe 2>/dev/null || true)"

  if [[ -n "$ipconfig" ]]; then
    printf '%s\n' "$ipconfig"
    return 0
  fi

  for path in /mnt/c/Windows/System32/ipconfig.exe /mnt/c/WINDOWS/System32/ipconfig.exe; do
    if [[ -x "$path" ]]; then
      printf '%s\n' "$path"
      return 0
    fi
  done

  return 1
}

detect_windows_lan_ip() {
  local ipconfig="$1"
  local win_ip

  win_ip="$(
    "$ipconfig" 2>/dev/null \
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

  if [[ -z "$win_ip" ]]; then
    win_ip="$(
      "$ipconfig" 2>/dev/null \
        | tr -d '\r' \
        | awk -F': ' '/IPv4 Address/ { print $2 }' \
        | awk '/^(192\.168|10\.|172\.20\.10\.)/ { print; exit }'
    )"
  fi

  printf '%s\n' "$win_ip"
}

if ! is_wsl; then
  NATIVE_IP="$(detect_native_lan_ip || true)"
  require_supported_advertised_ip "$NATIVE_IP"
  export REACT_NATIVE_PACKAGER_HOSTNAME="$NATIVE_IP"
  echo "Native LAN mode detected."
  echo "Advertising Metro to Expo Go as: $NATIVE_IP:$PORT"
  exec npx expo start --lan --port "$PORT" "$@"
fi

IPCONFIG="$(find_ipconfig || true)"
POWERSHELL="$(find_powershell || true)"
WIN_IP=""

if [[ -n "$IPCONFIG" ]]; then
  WIN_IP="$(detect_windows_lan_ip "$IPCONFIG")"
fi

WSL_IPS="$(hostname -I | xargs)"
PRIMARY_WSL_IP="$(awk '{print $1}' <<<"$WSL_IPS")"

if [[ -n "$WIN_IP" ]] && grep -qw "$WIN_IP" <<<"$WSL_IPS"; then
  require_supported_advertised_ip "$WIN_IP"
  if [[ -z "$POWERSHELL" ]]; then
    cat <<EOF >&2
WSL mirrored networking detected at the interface level, but powershell.exe is unavailable,
so this script cannot verify that Windows can actually reach $WIN_IP:$PORT.

Continuing in mirrored LAN mode. If Expo Go fails, verify from the phone browser:
  http://$WIN_IP:$PORT/status
EOF
  elif ! probe_windows_route_to_wsl "$WIN_IP" "$POWERSHELL"; then
    cat <<EOF >&2
WSL mirrored networking detected, but the Windows host self-probe cannot reach http://$WIN_IP:$PORT.

Continuing in mirrored LAN mode because the phone browser test is the authoritative
Expo Go path. If Expo Go fails, open this on the phone first:
  http://$WIN_IP:$PORT/status
EOF
  fi

  export REACT_NATIVE_PACKAGER_HOSTNAME="$WIN_IP"
  echo "WSL mirrored networking detected."
  echo "Advertising Metro to Expo Go as: $WIN_IP:$PORT"
  exec npx expo start --lan --port "$PORT" "$@"
fi

cat <<EOF >&2
WSL detected without mirrored networking.

Expo LAN mode here would advertise ${PRIMARY_WSL_IP:-an unreachable WSL address}:$PORT to Expo Go,
which is why the phone shows "Could not connect to the server."

Preferred fix (Windows host):
  %USERPROFILE%\\.wslconfig
  [wsl2]
  networkingMode=mirrored

Then run:
  wsl --shutdown
  reopen WSL
  cd ~/projects/valuesnapapp/apps/mobile
  npm start

Success looks like Expo advertising 192.168.x.x:$PORT, 10.x.x.x:$PORT,
or iPhone hotspot 172.20.10.x:$PORT, not WSL's virtual NIC.

Fallback if mirrored networking is unavailable:
  npm run start:wsl
EOF

exit 1
