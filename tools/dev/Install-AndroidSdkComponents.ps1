[CmdletBinding()]
param(
    [string]$SdkRoot = "",
    [string]$AvdName = "EatFitAI_API_34",
    [string]$SystemImagePackage = "system-images;android-34;google_apis_playstore;x86_64",
    [string]$CmdlineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip",
    [string]$CmdlineToolsArchivePath = "",
    [switch]$PersistUserEnvironment
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SdkRoot)) {
    $SdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
}

function Add-PathEntryIfMissing {
    param(
        [string]$PathValue,
        [switch]$PersistUserEnvironment
    )

    if ([string]::IsNullOrWhiteSpace($PathValue) -or -not (Test-Path $PathValue)) {
        return
    }

    $segments = ($env:PATH -split ';') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    if ($segments -notcontains $PathValue) {
        $env:PATH = ($segments + $PathValue) -join ';'
    }

    if ($PersistUserEnvironment) {
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $userSegments = @()
        if (-not [string]::IsNullOrWhiteSpace($userPath)) {
            $userSegments = ($userPath -split ';') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        }

        if ($userSegments -notcontains $PathValue) {
            [Environment]::SetEnvironmentVariable("Path", (($userSegments + $PathValue) -join ';'), "User")
        }
    }
}

function Get-FirstFile {
    param(
        [string]$Root,
        [string]$Filter
    )

    if (-not (Test-Path $Root)) {
        return $null
    }

    return Get-ChildItem -Path $Root -Recurse -Filter $Filter -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not (Test-Path $SdkRoot)) {
    New-Item -ItemType Directory -Path $SdkRoot -Force | Out-Null
}

$cmdlineToolsRoot = Join-Path $SdkRoot "cmdline-tools"
$latestCmdlineToolsRoot = Join-Path $cmdlineToolsRoot "latest"
$sdkManager = Get-FirstFile -Root $SdkRoot -Filter "sdkmanager.bat"
$avdManager = Get-FirstFile -Root $SdkRoot -Filter "avdmanager.bat"

if (-not $sdkManager -or -not $avdManager) {
    if ($CmdlineToolsArchivePath -and -not (Test-Path $CmdlineToolsArchivePath)) {
        throw "The provided cmdline-tools archive path does not exist: $CmdlineToolsArchivePath"
    }

    if ($CmdlineToolsArchivePath) {
        Write-Host "Android cmdline-tools were not found. Bootstrapping from local archive: $CmdlineToolsArchivePath"
    } else {
        Write-Host "Android cmdline-tools were not found. Bootstrapping from $CmdlineToolsUrl"
    }
    New-Item -ItemType Directory -Path $cmdlineToolsRoot -Force | Out-Null

    $tempId = [Guid]::NewGuid().ToString("N")
    $tempZip = if ($CmdlineToolsArchivePath) {
        $CmdlineToolsArchivePath
    } else {
        Join-Path $env:TEMP ("eatfitai-android-cmdline-tools-{0}.zip" -f $tempId)
    }
    $tempExtractRoot = Join-Path $env:TEMP ("eatfitai-android-cmdline-tools-{0}" -f $tempId)
    if (Test-Path $tempExtractRoot) {
        Remove-Item -Path $tempExtractRoot -Recurse -Force
    }

    if (-not $CmdlineToolsArchivePath) {
        Write-Host "Downloading Android command-line tools archive..."
        $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curl) {
            & $curl.Source -L $CmdlineToolsUrl -o $tempZip
            if ($LASTEXITCODE -ne 0) {
                throw "curl.exe failed to download the Android command-line tools archive."
            }
        } else {
            Invoke-WebRequest -Uri $CmdlineToolsUrl -OutFile $tempZip
        }
    }

    Write-Host "Extracting Android command-line tools archive..."
    Expand-Archive -Path $tempZip -DestinationPath $tempExtractRoot -Force

    $nestedRoot = Join-Path $tempExtractRoot "cmdline-tools"
    if (-not (Test-Path (Join-Path $nestedRoot "bin"))) {
        $nestedRoot = Get-ChildItem -Path $tempExtractRoot -Directory | Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not (Test-Path (Join-Path $nestedRoot "bin"))) {
        throw "Could not locate cmdline-tools\\bin in the extracted Android command-line tools archive."
    }

    if (Test-Path $latestCmdlineToolsRoot) {
        Remove-Item -Path $latestCmdlineToolsRoot -Recurse -Force
    }

    New-Item -ItemType Directory -Path $cmdlineToolsRoot -Force | Out-Null
    Move-Item -Path $nestedRoot -Destination $latestCmdlineToolsRoot -Force

    if (-not $CmdlineToolsArchivePath) {
        Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -Path $tempExtractRoot -Recurse -Force -ErrorAction SilentlyContinue

    $sdkManager = Get-FirstFile -Root $SdkRoot -Filter "sdkmanager.bat"
    $avdManager = Get-FirstFile -Root $SdkRoot -Filter "avdmanager.bat"
}

if (-not $sdkManager -or -not $avdManager) {
    throw "cmdline-tools are missing under $SdkRoot after bootstrap."
}

$env:ANDROID_SDK_ROOT = $SdkRoot
if ($PersistUserEnvironment) {
    [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $SdkRoot, "User")
}

$packages = @(
    "cmdline-tools;latest",
    "platform-tools",
    "emulator",
    "build-tools;34.0.0",
    "platforms;android-34",
    $SystemImagePackage
)

Write-Host "Accepting Android SDK licenses"
$licenseOutput = (1..50 | ForEach-Object { "y" }) | & $sdkManager --sdk_root=$SdkRoot --licenses 2>&1 | Out-String
Write-Host $licenseOutput
if ($LASTEXITCODE -ne 0 -or $licenseOutput -notmatch "All SDK package licenses accepted") {
    throw "sdkmanager failed while accepting Android SDK licenses."
}

Write-Host "Installing Android SDK packages into $SdkRoot"
& $sdkManager --sdk_root=$SdkRoot --install @packages
if ($LASTEXITCODE -ne 0) {
    throw "sdkmanager failed to install required Android SDK packages."
}

Add-PathEntryIfMissing -PathValue (Join-Path $SdkRoot "platform-tools") -PersistUserEnvironment:$PersistUserEnvironment
Add-PathEntryIfMissing -PathValue (Join-Path $SdkRoot "emulator") -PersistUserEnvironment:$PersistUserEnvironment
Add-PathEntryIfMissing -PathValue (Join-Path $latestCmdlineToolsRoot "bin") -PersistUserEnvironment:$PersistUserEnvironment

$avdExists = $false
$avdListOutput = & $avdManager list avd 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -and $avdListOutput -match [Regex]::Escape("Name: $AvdName")) {
    $avdExists = $true
}

if (-not $avdExists) {
    Write-Host "Creating AVD '$AvdName'"
    cmd.exe /c ('echo no| "{0}" create avd --force --name "{1}" --package "{2}" --device "pixel_7"' -f $avdManager, $AvdName, $SystemImagePackage)
    if ($LASTEXITCODE -ne 0) {
        throw "avdmanager failed to create the emulator profile."
    }
} else {
    Write-Host "AVD '$AvdName' already exists."
}

$adbPath = Join-Path $SdkRoot "platform-tools\adb.exe"
$emulatorPath = Join-Path $SdkRoot "emulator\emulator.exe"
$sdkManagerPath = Join-Path $latestCmdlineToolsRoot "bin\sdkmanager.bat"

if (-not (Test-Path $adbPath)) {
    throw "adb.exe was not found after installation."
}

if (-not (Test-Path $emulatorPath)) {
    throw "emulator.exe was not found after installation."
}

if (-not (Test-Path $sdkManagerPath)) {
    throw "sdkmanager.bat was not found under cmdline-tools\\latest\\bin after installation."
}

Write-Host "ANDROID_SDK_ROOT=$SdkRoot"
Write-Host "adb=$adbPath"
Write-Host "emulator=$emulatorPath"
Write-Host "sdkmanager=$sdkManagerPath"
Write-Host "Android SDK lane is ready. Launch an emulator with: emulator -avd $AvdName"
