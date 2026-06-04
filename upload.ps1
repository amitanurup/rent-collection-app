$data = Get-Content 'c:\Users\amita\Desktop\rent-collection-backup.json' -Raw
$json = @{
    files = @{
        'app-state.json' = @{
            content = $data
        }
    }
} | ConvertTo-Json -Depth 10
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Error "GITHUB_TOKEN environment variable is not set"
    exit 1
}

Invoke-RestMethod -Uri 'https://api.github.com/gists/e6074ee14fc1506ed012f42f894a16d7' -Method Patch -Headers @{ Authorization = "token $token" } -Body $json -ContentType 'application/json'
