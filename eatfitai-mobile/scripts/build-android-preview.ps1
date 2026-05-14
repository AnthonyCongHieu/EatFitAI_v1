$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $projectRoot
$androidRoot = Join-Path $projectRoot 'android'
$easConfigPath = Join-Path $projectRoot 'eas.json'
$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
$googleServicesPath = Join-Path $androidRoot 'app\google-services.json'
$generatedResPath = Join-Path $androidRoot 'app\build\generated\res\createBundleReleaseJsAndAssets'
$generatedAssetsPath = Join-Path $androidRoot 'app\build\generated\assets\createBundleReleaseJsAndAssets'
$generatedUpdatesResourcesPath = Join-Path $androidRoot 'app\build\generated\assets\createReleaseUpdatesResources'
$mergedReleaseAssetsPath = Join-Path $androidRoot 'app\build\intermediates\assets\release\mergeReleaseAssets'
$compressedReleaseAssetsPath = Join-Path $androidRoot 'app\build\intermediates\compressed_assets\release\compressReleaseAssets'
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
            if ($oauthClient.client_id -and $oauthClient.client_type -eq 3) {
                return [string]$oauthClient.client_id
            }
        }

        $otherClients = $client.services.appinvite_service.other_platform_oauth_client
        foreach ($oauthClient in @($otherClients)) {
            if ($oauthClient.client_id -and $oauthClient.client_type -eq 3) {
                return [string]$oauthClient.client_id
            }
        }
    }

    return ''
}

function Test-GoogleClientIdIsAndroidClient {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ClientId
    )

    if (-not $ClientId -or -not (Test-Path $googleServicesPath)) {
        return $false
    }

    $json = Get-Content -Raw $googleServicesPath | ConvertFrom-Json
    foreach ($client in @($json.client)) {
        foreach ($oauthClient in @($client.oauth_client)) {
            if ($oauthClient.client_id -eq $ClientId -and $oauthClient.client_type -eq 1) {
                return $true
            }
        }
    }

    return $false
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
    foreach ($path in @(
        $generatedResPath,
        $generatedAssetsPath,
        $generatedUpdatesResourcesPath,
        $mergedReleaseAssetsPath,
        $compressedReleaseAssetsPath,
        $apkPath
    )) {
        if (Test-Path $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
}

function Assert-EmbeddedUpdatesManifestHasMascotAssets {
    $mascotCharacterPath = Join-Path $projectRoot 'src\components\MascotCharacter.tsx'
    $mochiRigPath = Join-Path $projectRoot 'src\features\mochi\MochiRig.tsx'

    if ((Test-Path $mascotCharacterPath) -and (Test-Path $mochiRigPath)) {
        $mascotCharacterSource = Get-Content -Raw $mascotCharacterPath
        if (($mascotCharacterSource -match 'MochiRig') -and ($mascotCharacterSource -notmatch 'MOCHI_ASSETS\[')) {
            return
        }
    }

    $mascotAssetDir = Join-Path $projectRoot 'src\assets\mascot\mochi\characters'
    if (-not (Test-Path $mascotAssetDir)) {
        return
    }

    $expectedMochiCount = @(Get-ChildItem -LiteralPath $mascotAssetDir -Filter '*.png' -File).Count
    if ($expectedMochiCount -eq 0) {
        return
    }

    $manifestPath = Join-Path $generatedUpdatesResourcesPath 'app.manifest'
    if (-not (Test-Path $manifestPath)) {
        throw "Embedded Expo Updates manifest was not created at $manifestPath"
    }

    $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
    $manifestAssets = @($manifest.assets)
    $mochiAssets = @(
        $manifestAssets | Where-Object {
            ($_.subdirectory -like '*/assets/src/assets/mascot/mochi/characters*') -or
            ($_.resourcesFilename -like 'src_assets_mascot_mochi_characters_*')
        }
    )

    if ($mochiAssets.Count -lt $expectedMochiCount) {
        throw "Embedded Expo Updates manifest is missing Mochi assets ($($mochiAssets.Count)/$expectedMochiCount). Rebuild after clearing stale createReleaseUpdatesResources outputs."
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

function Invoke-PreviewApkIdentityGuard {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApkToVerify
    )

    $verifyScript = Join-Path $projectRoot 'scripts\verify-android-preview-apk.js'
    & node $verifyScript --apk $ApkToVerify
    $verifyExitCode = $LASTEXITCODE
    if ($verifyExitCode -ne 0) {
        throw "Preview APK identity verification failed with exit code $verifyExitCode"
    }
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
$googleServicesWebClientId = Resolve-GoogleWebClientId
if ($googleWebClientId -and (Test-GoogleClientIdIsAndroidClient -ClientId $googleWebClientId)) {
    if (-not $googleServicesWebClientId) {
        throw 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID points to an Android OAuth client and no Web OAuth client could be derived from google-services.json.'
    }

    Write-Warning 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID points to an Android OAuth client. Using the Web OAuth client from google-services.json instead.'
    $googleWebClientId = $googleServicesWebClientId
}
if (-not $googleWebClientId) {
    $googleWebClientId = $googleServicesWebClientId
}
if (-not $googleWebClientId) {
    throw 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing and could not be derived from google-services.json.'
}
$env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = $googleWebClientId

$googleIosClientId = Resolve-EnvValue 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'
if ($googleIosClientId) {
    $env:EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = $googleIosClientId
}

$env:EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS = Resolve-BuildValue -Name 'EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS' -ProfileEnv $previewProfileEnv -Default 'false'
$env:EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN = Resolve-BuildValue -Name 'EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN' -ProfileEnv $previewProfileEnv -Default 'false'

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

Assert-EmbeddedUpdatesManifestHasMascotAssets

if (-not (Test-Path $apkPath)) {
    throw "Preview APK was not created at $apkPath"
}

Invoke-PreviewApkIdentityGuard -ApkToVerify $apkPath

Write-Output $apkPath
