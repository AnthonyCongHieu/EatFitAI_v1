. (Join-Path $PSScriptRoot '_config\dev-env.ps1')

$env:EXPO_PUBLIC_API_BASE_URL = 'https://eatfitai-backend.onrender.com'
$env:EXPO_PUBLIC_API_PORT = ''
$env:EXPO_PUBLIC_API_SCHEME = 'https'

Set-Location (Join-Path $PSScriptRoot 'eatfitai-mobile')

try {
    & adb.exe reverse tcp:8081 tcp:8081 | Out-Null
} catch {
    Write-Warning 'adb reverse tcp:8081 tcp:8081 failed. Dev client may need LAN access instead.'
}

Write-Host "[start-mobile] API target: $($env:EXPO_PUBLIC_API_BASE_URL)"

node .\scripts\generate-local-ip.js
npx.cmd env-cmd -f .env.development --no-override -- node .\scripts\check-api-target.js
npx.cmd env-cmd -f .env.development --no-override -- expo start --localhost
