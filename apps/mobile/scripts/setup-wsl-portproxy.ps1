# Windows-side one-time setup to let a physical phone reach the Expo dev server
# running inside WSL2. Run this from an *elevated* PowerShell prompt on the
# Windows host (not inside WSL).
#
# Prefer `networkingMode=mirrored` in %USERPROFILE%\.wslconfig over this script.
# Mirrored mode removes the need for any portproxy or firewall rule. See
# docs/deployment/README.md.

[CmdletBinding()]
param(
    [int]$Port = 8083
)

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run this script from an elevated (admin) PowerShell prompt."
    exit 1
}

$wslIp = (wsl.exe -- hostname -I).Trim().Split(' ')[0]
if (-not $wslIp) {
    Write-Error "Could not determine the WSL IP. Is your WSL distribution running?"
    exit 1
}

Write-Host "Configuring portproxy $Port -> $wslIp`:$Port"

netsh.exe interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 2>$null | Out-Null
netsh.exe interface portproxy add    v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=$wslIp | Out-Null

$ruleName = "WSL Expo $Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    Write-Host "Adding firewall rule: $ruleName"
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
} else {
    Write-Host "Firewall rule already present: $ruleName"
}

Write-Host ""
Write-Host "Done. Current portproxy rules:"
netsh.exe interface portproxy show v4tov4
