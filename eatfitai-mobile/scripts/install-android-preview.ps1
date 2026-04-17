param(
    [string]$ApkPath = ''
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$defaultApkPath = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'

if (-not $ApkPath) {
    $ApkPath = $defaultApkPath
}

if (-not (Test-Path $ApkPath)) {
    throw "APK not found: $ApkPath"
}

adb install -r $ApkPath

$packageDump = adb shell dumpsys package com.eatfitai.app
if ($packageDump -match '\bDEBUGGABLE\b') {
    Write-Warning 'Installed app is still debuggable. Release-like lane expects a non-debuggable build.'
} else {
    Write-Output 'Installed non-debuggable preview/release-like Android build.'
}

Write-Output $ApkPath
