$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$previewBuildScript = Join-Path $PSScriptRoot 'build-android-preview.ps1'
$releaseApkPath = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
$testApkPath = Join-Path $androidRoot 'app\build\outputs\apk\androidTest\release\app-release-androidTest.apk'
$detoxApkDir = if ($env:EATFITAI_DETOX_APK_DIR) {
    $env:EATFITAI_DETOX_APK_DIR
} else {
    Join-Path $env:LOCALAPPDATA 'EatFitAI\detox'
}

$env:EXPO_PUBLIC_E2E_AUTOMATION = '1'

& $previewBuildScript

$gradleExitCode = $null
Push-Location $androidRoot
try {
    & .\gradlew.bat :app:assembleReleaseAndroidTest -DtestBuildType=release
    $gradleExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($gradleExitCode -ne 0) {
    throw "Gradle assembleAndroidTest failed with exit code $gradleExitCode"
}

if (-not (Test-Path $testApkPath)) {
    throw "Detox Android test APK was not created at $testApkPath"
}

if (-not (Test-Path $releaseApkPath)) {
    throw "Detox Android release APK was not created at $releaseApkPath"
}

New-Item -ItemType Directory -Force -Path $detoxApkDir | Out-Null
$detoxReleaseApkPath = Join-Path $detoxApkDir 'app-release.apk'
$detoxTestApkPath = Join-Path $detoxApkDir 'app-release-androidTest.apk'
Copy-Item -LiteralPath $releaseApkPath -Destination $detoxReleaseApkPath -Force
Copy-Item -LiteralPath $testApkPath -Destination $detoxTestApkPath -Force

Write-Output $detoxReleaseApkPath
Write-Output $detoxTestApkPath
