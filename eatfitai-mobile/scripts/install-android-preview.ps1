param(
    [string]$ApkPath = '',
    [string]$PackageName = 'com.eatfitai.app',
    [string]$DeviceSerial = '',
    [switch]$UninstallOnSignatureMismatch
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

if (-not $DeviceSerial -and $env:ANDROID_SERIAL) {
    $DeviceSerial = $env:ANDROID_SERIAL.Trim()
}

function Invoke-Adb {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $adbArguments = $Arguments
    if ($DeviceSerial) {
        $adbArguments = @('-s', $DeviceSerial) + $Arguments
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & adb @adbArguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($output) {
        $output | ForEach-Object { Write-Output $_ }
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = ($output -join "`n")
        Command = "adb $($adbArguments -join ' ')"
    }
}

function Invoke-AdbChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $result = Invoke-Adb -Arguments $Arguments
    if ($result.ExitCode -ne 0) {
        throw "$($result.Command) failed with exit code $($result.ExitCode)"
    }

    return $result
}

function Test-TruthyEnv {
    param(
        [string]$Value
    )

    if (-not $Value) {
        return $false
    }

    return $Value.Trim().ToLowerInvariant() -in @('1', 'true')
}

function Resolve-AndroidTargetMode {
    $rawMode = $env:EATFITAI_ANDROID_TARGET
    if (-not $rawMode) {
        $rawMode = $env:EATFITAI_ANDROID_TARGET_MODE
    }

    if (-not $rawMode) {
        return ''
    }

    switch ($rawMode.Trim().ToLowerInvariant()) {
        { $_ -in @('emulator', 'avd') } { return 'emulator' }
        { $_ -in @('real', 'real-device', 'device', 'usb') } { return 'real-device' }
        default { throw "Unsupported EATFITAI_ANDROID_TARGET '$rawMode'. Use emulator or real-device." }
    }
}

$allowUninstallOnSignatureMismatch =
    $UninstallOnSignatureMismatch -or (Test-TruthyEnv -Value $env:EATFITAI_ALLOW_UNINSTALL_ON_SIGNATURE_MISMATCH)

$androidTargetMode = Resolve-AndroidTargetMode
if (Test-TruthyEnv -Value $env:EATFITAI_REQUIRE_ANDROID_EMULATOR) {
    $androidTargetMode = 'emulator'
}

if ($androidTargetMode -eq 'emulator') {
    if (-not $DeviceSerial) {
        throw 'EATFITAI_REQUIRE_ANDROID_EMULATOR=1 requires ANDROID_SERIAL or -DeviceSerial.'
    }

    if ($DeviceSerial -notmatch '^emulator-\d+$') {
        throw "Refusing to install on non-emulator adb target while EATFITAI_REQUIRE_ANDROID_EMULATOR=1: $DeviceSerial"
    }

    $qemu = (Invoke-AdbChecked -Arguments @('shell', 'getprop', 'ro.kernel.qemu')).Output.Trim()
    if ($qemu -ne '1') {
        throw "Refusing to install because adb target $DeviceSerial did not report ro.kernel.qemu=1."
    }
} elseif ($androidTargetMode -eq 'real-device') {
    if (-not $DeviceSerial) {
        throw 'EATFITAI_ANDROID_TARGET=real-device requires ANDROID_SERIAL or -DeviceSerial.'
    }

    if ($DeviceSerial -match '^emulator-\d+$') {
        throw "Refusing to install on emulator adb target while EATFITAI_ANDROID_TARGET=real-device: $DeviceSerial"
    }

    $qemu = (Invoke-AdbChecked -Arguments @('shell', 'getprop', 'ro.kernel.qemu')).Output.Trim()
    if ($qemu -eq '1') {
        throw "Refusing to install because adb target $DeviceSerial reported ro.kernel.qemu=1."
    }
}

$installResult = Invoke-Adb -Arguments @('install', '-r', $ApkPath)
if ($installResult.ExitCode -ne 0) {
    $isSignatureMismatch = $installResult.Output -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE'
    if (-not $isSignatureMismatch -or -not $allowUninstallOnSignatureMismatch) {
        if ($isSignatureMismatch) {
            Write-Output "Signature mismatch detected for $PackageName. Re-run with -UninstallOnSignatureMismatch or set EATFITAI_ALLOW_UNINSTALL_ON_SIGNATURE_MISMATCH=1 on a dedicated test device to clear app data and retry."
        }

        throw "$($installResult.Command) failed with exit code $($installResult.ExitCode)"
    }

    Write-Warning "Signature mismatch detected for $PackageName. Uninstalling the existing package will clear local app data before retrying install."
    Invoke-AdbChecked -Arguments @('uninstall', $PackageName) | Out-Null
    Invoke-AdbChecked -Arguments @('install', '-r', $ApkPath) | Out-Null
}

$packageDump = (Invoke-AdbChecked -Arguments @('shell', 'dumpsys', 'package', $PackageName)).Output
if ($packageDump -match '\bDEBUGGABLE\b') {
    Write-Warning 'Installed app is still debuggable. Release-like lane expects a non-debuggable build.'
} else {
    Write-Output 'Installed non-debuggable preview/release-like Android build.'
}

Write-Output $ApkPath
