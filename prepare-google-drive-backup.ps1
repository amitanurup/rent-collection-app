$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupRoot = Join-Path $projectRoot "google-drive-backups"
$projectBackupRoot = Join-Path $backupRoot "project-backups"
$dataBackupRoot = Join-Path $backupRoot "data-backups"
$stageRoot = Join-Path $projectRoot ".backup-stage"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$archiveName = "rent-collection-app-project-$timestamp.zip"
$archivePath = Join-Path $projectBackupRoot $archiveName

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $projectBackupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $dataBackupRoot -Force | Out-Null

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$includeItems = @(
    "index.html",
    "tenant-portal.html",
    "README.md",
    "GOOGLE-DRIVE-BACKUP.md",
    "Caddyfile",
    "start-local-site.ps1",
    "rent-collection.webmanifest",
    "rent-collection-sw.js",
    "assets"
)

foreach ($item in $includeItems) {
    $source = Join-Path $projectRoot $item
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing backup item: $item"
    }

    Copy-Item -LiteralPath $source -Destination (Join-Path $stageRoot $item) -Recurse -Force
}

if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $archivePath -Force
Remove-Item -LiteralPath $stageRoot -Recurse -Force

Write-Host "Google Drive project backup ready:"
Write-Host $archivePath
Write-Host ""
Write-Host "Data JSON backups ko yahan rakhiye:"
Write-Host $dataBackupRoot
