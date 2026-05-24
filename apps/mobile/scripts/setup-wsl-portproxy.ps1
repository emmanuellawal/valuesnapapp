# Windows-side one-time setup to let a physical phone reach the Expo dev server
# running inside WSL2. Run this from an *elevated* PowerShell prompt on the
# Windows host (not inside WSL).
#
# Prefer trying `networkingMode=mirrored` in %USERPROFILE%\.wslconfig first.
# If Windows still cannot reach http://<your-lan-ip>:8083/status from the host,
# use this script to open the explicit portproxy + firewall path instead. See
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

$ipconfig = Get-Command ipconfig.exe -ErrorAction SilentlyContinue
$winIp = $null
if ($ipconfig) {
    $winIp = (& $ipconfig.Source) `
        | ForEach-Object { $_.ToString().TrimEnd("`r") } `
        | Select-String -Pattern 'IPv4 Address' `
        | ForEach-Object { ($_ -split ': ')[-1] } `
        | Where-Object { $_ -match '^(192\.168|10\.)' } `
        | Select-Object -First 1
}

$portProxyTarget = $wslIp
if ($winIp -and $wslIp -eq $winIp) {
    $portProxyTarget = '127.0.0.1'
}

Write-Host "Configuring portproxy $Port -> $portProxyTarget`:$Port"

netsh.exe interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 2>$null | Out-Null
netsh.exe interface portproxy add    v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=$portProxyTarget | Out-Null

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
