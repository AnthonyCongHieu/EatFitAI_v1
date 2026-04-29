[CmdletBinding()]
param(
  [string]$Serial = $env:ANDROID_SERIAL,
  [string]$AppId = "com.eatfitai.app",
  [int]$MaxSize = 1080,
  [switch]$NoLaunchApp,
  [switch]$NoStayAwake
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptRoot "..")).Path
$repoRoot = (Resolve-Path (Join-Path $projectRoot "..")).Path

function Resolve-AdbExecutable {
  $bundledAdb = Join-Path $repoRoot "_tooling\android-sdk\platform-tools\adb.exe"
  if (Test-Path -LiteralPath $bundledAdb) {
    return $bundledAdb
  }

  $adbCommand = Get-Command adb -ErrorAction SilentlyContinue
  if ($adbCommand) {
    return $adbCommand.Source
  }

  throw "adb was not found. Install Android platform-tools or run the repo tooling setup first."
}

function Resolve-ScrcpyExecutable {
  $scrcpyCommand = Get-Command scrcpy -ErrorAction SilentlyContinue
  if ($scrcpyCommand) {
    return $scrcpyCommand.Source
  }

  $wingetPackages = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
  if (Test-Path -LiteralPath $wingetPackages) {
    $wingetScrcpy = Get-ChildItem -LiteralPath $wingetPackages -Recurse -Filter scrcpy.exe -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($wingetScrcpy) {
      return $wingetScrcpy.FullName
    }
  }

  throw "scrcpy was not found. Install it with: winget install --id Genymobile.scrcpy -e"
}

$adb = Resolve-AdbExecutable
$scrcpy = Resolve-ScrcpyExecutable

if ([string]::IsNullOrWhiteSpace($Serial)) {
  $devicesOutput = & $adb devices
  $devices = @($devicesOutput | Select-String -Pattern "^\S+\s+device$" | ForEach-Object { $_.ToString().Split()[0] })
  if ($devices.Count -gt 1) {
    throw "Multiple Android devices are connected. Set ANDROID_SERIAL or pass -Serial. Devices: $($devices -join ', ')"
  }

  if ($devices.Count -eq 1) {
    $Serial = $devices[0]
  }
}

if ([string]::IsNullOrWhiteSpace($Serial)) {
  throw "No Android device is connected over ADB."
}

$windowTitle = "EatFitAI MIUI real device - $Serial"
$adbSerialArgs = @("-s", $Serial)
& $adb @adbSerialArgs wait-for-device | Out-Null
& $adb @adbSerialArgs shell input keyevent KEYCODE_WAKEUP | Out-Null
& $adb @adbSerialArgs shell wm dismiss-keyguard 2>$null | Out-Null

if (-not $NoLaunchApp) {
  & $adb @adbSerialArgs shell monkey -p $AppId -c android.intent.category.LAUNCHER 1 | Out-Null
}

$existingScrcpy = Get-Process scrcpy -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -eq $windowTitle } |
  Select-Object -First 1

if ($existingScrcpy) {
  Write-Output "[scrcpy] Already running: pid=$($existingScrcpy.Id), serial=$Serial"
  exit 0
}

$scrcpyArgs = @(
  "-s",
  $Serial,
  "--no-audio",
  "--max-size",
  [string]$MaxSize,
  "--window-title",
  $windowTitle
)

if (-not $NoStayAwake) {
  $scrcpyArgs += "-w"
}

$startedScrcpy = Start-Process -FilePath $scrcpy -ArgumentList $scrcpyArgs -PassThru
Start-Sleep -Seconds 3

if ($startedScrcpy.HasExited) {
  throw "scrcpy did not stay open. Run '$scrcpy -s $Serial --no-audio --max-size $MaxSize' to inspect its stderr."
}

Write-Output "[scrcpy] Started: pid=$($startedScrcpy.Id), serial=$Serial"
