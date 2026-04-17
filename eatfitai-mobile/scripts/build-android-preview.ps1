$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
$googleServicesPath = Join-Path $androidRoot 'app\google-services.json'
$generatedResPath = Join-Path $androidRoot 'app\build\generated\res\createBundleReleaseJsAndAssets'
$generatedAssetsPath = Join-Path $androidRoot 'app\build\generated\assets\createBundleReleaseJsAndAssets'

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

function Remove-StalePreviewBuildOutputs {
    foreach ($path in @($generatedResPath, $generatedAssetsPath, $apkPath)) {
        if (Test-Path $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
}

$env:APP_ENV = 'preview'
$env:NODE_ENV = 'production'

$apiBaseUrl = Resolve-EnvValue 'EXPO_PUBLIC_API_BASE_URL'
if (-not $apiBaseUrl) {
    $apiBaseUrl = 'https://eatfitai-backend.onrender.com'
}
$env:EXPO_PUBLIC_API_BASE_URL = $apiBaseUrl

$supabaseUrl = Resolve-EnvValue 'EXPO_PUBLIC_SUPABASE_URL'
if (-not $supabaseUrl) {
    $supabaseUrl = 'https://bjlmndmafrajjysenpbm.supabase.co'
}
$env:EXPO_PUBLIC_SUPABASE_URL = $supabaseUrl

$googleWebClientId = Resolve-EnvValue 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'
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

$env:EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS = Resolve-EnvValue 'EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS'
if (-not $env:EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS) {
    $env:EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS = 'true'
}

$env:EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN = Resolve-EnvValue 'EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN'
if (-not $env:EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN) {
    $env:EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN = 'true'
}

Remove-StalePreviewBuildOutputs

Push-Location $androidRoot
try {
    & .\gradlew.bat assembleRelease
} finally {
    Pop-Location
}

if (-not (Test-Path $apkPath)) {
    throw "Preview APK was not created at $apkPath"
}

Write-Output $apkPath
