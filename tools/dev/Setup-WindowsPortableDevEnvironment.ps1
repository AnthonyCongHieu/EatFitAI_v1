[CmdletBinding()]
param(
    [string]$AndroidSdkRoot = "",
    [string]$AvdName = "EatFitAI_API_34",
    [switch]$SkipScrcpyInstall,
    [switch]$SkipAndroidInstall,
    [switch]$SkipPreflight
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot

if (-not $SkipScrcpyInstall) {
    Write-Host "== scrcpy =="
    winget install --id Genymobile.scrcpy -e --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "scrcpy installation failed."
    }
}

if (-not $SkipAndroidInstall) {
    Write-Host "`n== Android SDK =="
    & (Join-Path $scriptRoot "Install-AndroidSdkComponents.ps1") -SdkRoot $AndroidSdkRoot -AvdName $AvdName -PersistUserEnvironment
    if ($LASTEXITCODE -ne 0) {
        throw "Android SDK installation failed."
    }
}

if (-not $SkipPreflight) {
    Write-Host "`n== Preflight =="
    & (Join-Path $scriptRoot "Invoke-DevPreflight.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Environment preflight failed. Fix the reported items and rerun the setup."
    }
}

Write-Host "`nEatFitAI Windows portable environment bootstrap completed."
