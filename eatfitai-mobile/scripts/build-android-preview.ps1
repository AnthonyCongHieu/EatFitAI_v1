$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $projectRoot
$androidRoot = Join-Path $projectRoot 'android'
$easConfigPath = Join-Path $projectRoot 'eas.json'
$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
$googleServicesPath = Join-Path $androidRoot 'app\google-services.json'
$generatedResPath = Join-Path $androidRoot 'app\build\generated\res\createBundleReleaseJsAndAssets'
$generatedAssetsPath = Join-Path $androidRoot 'app\build\generated\assets\createBundleReleaseJsAndAssets'
$localPropertiesPath = Join-Path $androidRoot 'local.properties'
$devEnvPath = Join-Path $repoRoot '_config\dev-env.ps1'

function Resolve-EnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    foreach ($scope in 'Process', 'User', 'Machine') {
        $value = [Environment]::GetEnvironmentVariable($Name, $scope)
        if ($value) {
            return $value.Trim()
        }
    }

    return ''
}

function Resolve-GoogleWebClientId {
    if (-not (Test-Path $googleServicesPath)) {
        return ''
    }

    $json = Get-Content -Raw $googleServicesPath | ConvertFrom-Json
    foreach ($client in @($json.client)) {
        foreach ($oauthClient in @($client.oauth_client)) {
            if ($oauthClient.client_id) {
                return [string]$oauthClient.client_id
            }
        }

        $otherClients = $client.services.appinvite_service.other_platform_oauth_client
        foreach ($oauthClient in @($otherClients)) {
            if ($oauthClient.client_id) {
                return [string]$oauthClient.client_id
            }
        }
    }

    return ''
}

function Get-EasBuildConfig {
    if (-not $script:EasBuildConfig) {
        if (-not (Test-Path $easConfigPath)) {
            throw "eas.json was not found at $easConfigPath"
        }

        $script:EasBuildConfig = Get-Content -Raw $easConfigPath | ConvertFrom-Json
    }

    return $script:EasBuildConfig
}

function Resolve-EasProfileEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProfileName
    )

    $buildConfig = (Get-EasBuildConfig).build
    $profile = $buildConfig.PSObject.Properties[$ProfileName].Value
    if (-not $profile) {
        throw "EAS profile '$ProfileName' was not found in $easConfigPath"
    }

    $resolved = @{}

    if ($profile.extends) {
        $resolved = Resolve-EasProfileEnv -ProfileName ([string]$profile.extends)
    }

    if ($profile.env) {
        foreach ($property in $profile.env.PSObject.Properties) {
            $resolved[$property.Name] = [string]$property.Value
        }
    }

    return $resolved
}

function Resolve-BuildValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [hashtable]$ProfileEnv = @{},
        [string]$Default = ''
    )

    $value = Resolve-EnvValue $Name
    if (-not $value -and $ProfileEnv.ContainsKey($Name)) {
        $value = $ProfileEnv[$Name].Trim()
    }
    if (-not $value) {
        $value = $Default
    }

    return $value
}

function Remove-StalePreviewBuildOutputs {
    foreach ($path in @($generatedResPath, $generatedAssetsPath, $apkPath)) {
        if (Test-Path $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
}

function Resolve-AndroidSdkRoot {
    $candidates = @(
        (Resolve-EnvValue 'ANDROID_SDK_ROOT'),
        (Resolve-EnvValue 'ANDROID_HOME'),
        (Join-Path $repoRoot '_tooling\android-sdk')
    ) | Where-Object { $_ }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }

    return ''
}

function Ensure-AndroidLocalProperties {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SdkRoot
    )

    $normalizedSdkRoot = $SdkRoot -replace '\\', '/'
    $content = "sdk.dir=$normalizedSdkRoot"

    if ((Test-Path $localPropertiesPath) -and ((Get-Content $localPropertiesPath -Raw).Trim() -eq $content)) {
        return
    }

    Set-Content -LiteralPath $localPropertiesPath -Value $content -Encoding ASCII
}

if (Test-Path $devEnvPath) {
    . $devEnvPath
}

$androidSdkRoot = Resolve-AndroidSdkRoot
if (-not $androidSdkRoot) {
    throw 'Android SDK not found. Set ANDROID_SDK_ROOT/ANDROID_HOME or provide the vendored SDK under _tooling/android-sdk.'
}

$env:ANDROID_SDK_ROOT = $androidSdkRoot
if (-not (Resolve-EnvValue 'ANDROID_HOME')) {
    $env:ANDROID_HOME = $androidSdkRoot
}
Ensure-AndroidLocalProperties -SdkRoot $androidSdkRoot

$previewProfileEnv = Resolve-EasProfileEnv -ProfileName 'preview'

$env:EAS_BUILD_PROFILE = 'preview'
$env:EAS_BUILD_PLATFORM = 'android'
$env:APP_ENV = Resolve-BuildValue -Name 'APP_ENV' -ProfileEnv $previewProfileEnv -Default 'preview'
$env:NODE_ENV = Resolve-BuildValue -Name 'NODE_ENV' -ProfileEnv $previewProfileEnv -Default 'production'

$apiBaseUrl = Resolve-BuildValue -Name 'EXPO_PUBLIC_API_BASE_URL' -ProfileEnv $previewProfileEnv
if (-not $apiBaseUrl) {
    throw 'EXPO_PUBLIC_API_BASE_URL is missing for the preview release build.'
}
$env:EXPO_PUBLIC_API_BASE_URL = $apiBaseUrl

$mediaPublicBaseUrl = Resolve-BuildValue -Name 'EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL' -ProfileEnv $previewProfileEnv
if (-not $mediaPublicBaseUrl) {
    throw 'EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL is missing for the preview release build.'
}
$env:EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL = $mediaPublicBaseUrl

$googleWebClientId = Resolve-BuildValue -Name 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID' -ProfileEnv $previewProfileEnv
if (-not $googleWebClientId) {
    $googleWebClientId = Resolve-GoogleWebClientId
}
if (-not $googleWebClientId) {
    throw 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing and could not be derived from google-services.json.'
}
$env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = $googleWebClientId

$googleIosClientId = Resolve-EnvValue 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'
if ($googleIosClientId) {
    $env:EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = $googleIosClientId
}

$env:EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS = Resolve-BuildValue -Name 'EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS' -ProfileEnv $previewProfileEnv -Default 'true'
$env:EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN = Resolve-BuildValue -Name 'EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN' -ProfileEnv $previewProfileEnv -Default 'true'

Remove-StalePreviewBuildOutputs

$gradleExitCode = $null
Push-Location $androidRoot
try {
    & .\gradlew.bat assembleRelease
    $gradleExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($gradleExitCode -ne 0) {
    throw "Gradle assembleRelease failed with exit code $gradleExitCode"
}

if (-not (Test-Path $apkPath)) {
    throw "Preview APK was not created at $apkPath"
}

Write-Output $apkPath
