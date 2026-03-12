[CmdletBinding()]
param(
    [string]$AndroidSdkRoot = "",
    [string]$AvdName = "EatFitAI_API_34",
    [switch]$SkipAppiumInstall,
    [switch]$SkipAndroidInstall,
    [switch]$SkipPreflight
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot

if (-not $SkipAppiumInstall) {
    Write-Host "== Appium =="
    & (Join-Path $scriptRoot "Install-Appium.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Appium installation failed."
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
