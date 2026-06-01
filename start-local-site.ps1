$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$caddyPath = Join-Path $env:LOCALAPPDATA "Microsoft\\WinGet\\Packages\\CaddyServer.Caddy_Microsoft.Winget.Source_8wekyb3d8bbwe\\caddy.exe"
$configPath = Join-Path $projectRoot "Caddyfile"
$logsRoot = Join-Path $projectRoot "logs"
$stdoutLog = Join-Path $logsRoot "caddy.out.log"
$stderrLog = Join-Path $logsRoot "caddy.err.log"

if (-not (Test-Path -LiteralPath $caddyPath)) {
    throw "Caddy was not found at $caddyPath"
}

New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null

$existing = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "caddy.exe" -and
        $_.CommandLine -match [regex]::Escape($configPath)
    }

if ($existing) {
    Write-Host "Rent collection app is already running on http://127.0.0.1:8091"
    return
}

$process = Start-Process `
    -FilePath $caddyPath `
    -ArgumentList @("run", "--config", "`"$configPath`"", "--adapter", "caddyfile") `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1

    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8091" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
            Write-Host "Rent collection app is live at http://127.0.0.1:8091"
            Write-Host "Caddy PID: $($process.Id)"
            return
        }
    } catch {
    }
}

throw "Caddy did not answer on http://127.0.0.1:8091. Check $stderrLog"
