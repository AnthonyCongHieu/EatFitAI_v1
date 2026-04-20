param(
    [string]$ApkPath = '',
    [string]$PackageName = 'com.eatfitai.app',
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

function Invoke-Adb {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & adb @Arguments 2>&1
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
        Command = "adb $($Arguments -join ' ')"
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

$allowUninstallOnSignatureMismatch =
    $UninstallOnSignatureMismatch -or $env:EATFITAI_ALLOW_UNINSTALL_ON_SIGNATURE_MISMATCH -eq '1'

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
