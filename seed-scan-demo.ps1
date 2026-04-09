param(
    [ValidateSet('local', 'cloud')]
    [string]$Mode = 'local',
    [string]$Email = $(if ($env:EATFITAI_DEMO_EMAIL) { $env:EATFITAI_DEMO_EMAIL } else { 'scan-demo@redacted.local' }),
    [string]$Password = $(if ($env:EATFITAI_DEMO_PASSWORD) { $env:EATFITAI_DEMO_PASSWORD } else { 'SET_IN_SEED_SCRIPT' }),
    [string]$DisplayName = $(if ($env:EATFITAI_DEMO_DISPLAY_NAME) { $env:EATFITAI_DEMO_DISPLAY_NAME } else { 'Scan Demo Reliability' })
)

$env:EATFITAI_DEMO_EMAIL = $Email
$env:EATFITAI_DEMO_PASSWORD = $Password
$env:EATFITAI_DEMO_DISPLAY_NAME = $DisplayName

if ($Mode -eq 'cloud') {
    $scriptPath = Join-Path $PSScriptRoot 'eatfitai-mobile\scripts\production-smoke-seed-cloud.js'
    if (-not (Test-Path $scriptPath)) {
        throw "Cloud seed script not found: $scriptPath"
    }

    Write-Host "[seed-scan-demo] Mode: cloud"
    Write-Host "[seed-scan-demo] Email: $Email"
    & node $scriptPath
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    Write-Host '[seed-scan-demo] Cloud demo account seeded successfully.'
    Write-Host '[seed-scan-demo] Current shell env updated: EATFITAI_DEMO_EMAIL, EATFITAI_DEMO_PASSWORD, EATFITAI_DEMO_DISPLAY_NAME'
    exit 0
}

$projectPath = Join-Path $PSScriptRoot 'eatfitai-backend\EatFitAI.API.csproj'
if (-not (Test-Path $projectPath)) {
    throw "Backend project not found: $projectPath"
}

Write-Host "[seed-scan-demo] Mode: local"
Write-Host "[seed-scan-demo] Project: $projectPath"
Write-Host "[seed-scan-demo] Email: $Email"

$arguments = @(
    'run',
    '--project', $projectPath,
    '--',
    '--seed-scan-demo',
    '--demo-email', $Email,
    '--demo-password', $Password,
    '--demo-display-name', $DisplayName
)

& dotnet @arguments
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host '[seed-scan-demo] Local demo account seeded successfully.'
Write-Host '[seed-scan-demo] Current shell env updated: EATFITAI_DEMO_EMAIL, EATFITAI_DEMO_PASSWORD, EATFITAI_DEMO_DISPLAY_NAME'
