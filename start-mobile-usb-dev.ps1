param(
    [switch]$InstallDebugBuild,
    [switch]$UninstallFirst,
    [switch]$ClearCache,
    [switch]$SkipApiCheck,
    [switch]$UseLocalApi,
    [switch]$DryRun,
    [string]$ApiBaseUrl = '',
    [string]$ApiPort = '5247',
    [string]$MetroPort = '8081'
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$devEnvPath = Join-Path $repoRoot '_config\dev-env.ps1'
$mobileRoot = Join-Path $repoRoot 'eatfitai-mobile'
$androidRoot = Join-Path $mobileRoot 'android'
$localPropertiesPath = Join-Path $androidRoot 'local.properties'
$packageName = 'com.eatfitai.app'

function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host "[usb-dev] $Message"
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage,
        [string]$DryRunMessage = $FailureMessage
    )

    if ($DryRun) {
        Write-Step "DRY RUN: $DryRunMessage"
        return
    }

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (exit code $LASTEXITCODE)"
    }
}

function Ensure-AndroidLocalProperties {
    if (-not $env:ANDROID_SDK_ROOT) {
        throw 'ANDROID_SDK_ROOT is not set. _config/dev-env.ps1 should provide it.'
    }

    $normalizedSdkRoot = $env:ANDROID_SDK_ROOT -replace '\\', '/'
    $content = "sdk.dir=$normalizedSdkRoot"

    if ($DryRun) {
        Write-Step "DRY RUN: ensure $localPropertiesPath contains sdk.dir=$normalizedSdkRoot"
        return
    }

    if ((Test-Path $localPropertiesPath) -and ((Get-Content $localPropertiesPath -Raw).Trim() -eq $content)) {
        return
    }

    Set-Content -LiteralPath $localPropertiesPath -Value $content -Encoding ASCII
}

function Get-OnlineAndroidDeviceCount {
    if ($DryRun) {
        return 1
    }

    $devices = & adb.exe devices
    return @(
        $devices | Where-Object { $_ -match "`tdevice$" }
    ).Count
}

function Invoke-AdbReverse {
    param(
        [Parameter(Mandatory = $true)][string]$DevicePort,
        [Parameter(Mandatory = $true)][string]$HostPort
    )

    if ($DryRun) {
        Write-Step "DRY RUN: adb reverse tcp:$DevicePort tcp:$HostPort"
        return
    }

    & adb.exe reverse "tcp:${DevicePort}" "tcp:${HostPort}" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "adb reverse tcp:$DevicePort tcp:$HostPort failed. Check USB debugging and device authorization."
    }
}

if (-not (Test-Path $mobileRoot)) {
    throw "Expo mobile project was not found at $mobileRoot"
}

if (Test-Path $devEnvPath) {
    . $devEnvPath
}

Set-Location $repoRoot
Ensure-AndroidLocalProperties

$onlineDeviceCount = Get-OnlineAndroidDeviceCount
if ($onlineDeviceCount -eq 0) {
    throw 'No authorized Android device found. Connect the phone, enable USB debugging, and accept the RSA prompt.'
}

$env:APP_ENV = 'development'
$env:NODE_ENV = 'development'
$env:EXPO_NO_TELEMETRY = '1'

$apiTarget = $ApiBaseUrl.Trim()
if ([string]::IsNullOrWhiteSpace($apiTarget) -and $UseLocalApi) {
    $apiTarget = "http://127.0.0.1:$ApiPort"
}

$shouldReverseApi = $false
if (-not [string]::IsNullOrWhiteSpace($apiTarget)) {
    $env:EXPO_PUBLIC_API_BASE_URL = $apiTarget

    try {
        $apiUri = [System.Uri]$apiTarget
        $env:EXPO_PUBLIC_API_SCHEME = $apiUri.Scheme
        if (-not $apiUri.IsDefaultPort) {
            $env:EXPO_PUBLIC_API_PORT = [string]$apiUri.Port
        }

        $shouldReverseApi = $apiUri.Host -in @('localhost', '127.0.0.1')
    } catch {
        throw "Invalid ApiBaseUrl: $apiTarget"
    }
}

Write-Step "Device count: $onlineDeviceCount"
Write-Step "Metro over USB: device 127.0.0.1:$MetroPort -> host 127.0.0.1:$MetroPort"
if ($shouldReverseApi) {
    Write-Step "API over USB: device 127.0.0.1:$ApiPort -> host 127.0.0.1:$ApiPort"
    Write-Step "API target override: $($env:EXPO_PUBLIC_API_BASE_URL)"
} else {
    Write-Step 'API target: cloud/env backend from .env.development'
}

Invoke-AdbReverse -DevicePort $MetroPort -HostPort $MetroPort
if ($shouldReverseApi) {
    Invoke-AdbReverse -DevicePort $ApiPort -HostPort $ApiPort
}

if ($UninstallFirst) {
    Write-Step "Uninstalling $packageName from the connected device. This clears local app data."
    if (-not $DryRun) {
        & adb.exe uninstall $packageName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "adb uninstall returned exit code $LASTEXITCODE. Continuing; the app may not have been installed."
        }
    }
}

if ($InstallDebugBuild) {
    Write-Step 'Installing Android debug build. This is the one slow step; future JS/SVG edits use Metro reload.'
    Push-Location $androidRoot
    try {
        Invoke-Checked `
            -Command { & .\gradlew.bat installDebug } `
            -FailureMessage 'Gradle installDebug failed' `
            -DryRunMessage 'android\gradlew.bat installDebug'
    } finally {
        Pop-Location
    }
}

Set-Location $mobileRoot

if (-not $DryRun) {
    & node .\scripts\generate-local-ip.js
    if ($LASTEXITCODE -ne 0) {
        throw "generate-local-ip.js failed with exit code $LASTEXITCODE"
    }

    if (-not $SkipApiCheck) {
        & npx.cmd env-cmd -f .env.development --no-override -- node .\scripts\check-api-target.js
        if ($LASTEXITCODE -ne 0) {
            throw "check-api-target.js failed with exit code $LASTEXITCODE"
        }
    }
} else {
    Write-Step 'DRY RUN: node scripts/generate-local-ip.js'
    if (-not $SkipApiCheck) {
        Write-Step 'DRY RUN: npx env-cmd -f .env.development --no-override -- node scripts/check-api-target.js'
    }
}

$expoArgs = @(
    'env-cmd',
    '-f',
    '.env.development',
    '--no-override',
    '--',
    'expo',
    'start',
    '--localhost',
    '--port',
    $MetroPort
)

if ($ClearCache) {
    $expoArgs += '--clear'
}

Write-Step "Starting Expo Metro. Keep this terminal open, then reload the app on the phone."
if ($DryRun) {
    Write-Step "DRY RUN: npx $($expoArgs -join ' ')"
    return
}

& npx.cmd @expoArgs
