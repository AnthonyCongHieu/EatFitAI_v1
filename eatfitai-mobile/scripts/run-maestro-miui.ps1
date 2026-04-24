[CmdletBinding()]
param(
  [string]$Suite = "miui-auth-entry",
  [string]$Serial = $env:ANDROID_SERIAL,
  [int]$PromptWatchSeconds = 120,
  [switch]$NoAutoAccept
)

$ErrorActionPreference = "Stop"

if ($Suite -notmatch "^[A-Za-z0-9:_-]+$") {
  throw "Invalid Maestro suite name: $Suite"
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptRoot "..")).Path
$repoRoot = (Resolve-Path (Join-Path $projectRoot "..")).Path
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ss-fffZ")
$logRoot = Join-Path $repoRoot ("_logs\maestro-miui\" + $timestamp)
$logFile = Join-Path $logRoot ("maestro-" + $Suite + ".log")

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Resolve-AdbExecutable {
  $bundledAdb = Join-Path $repoRoot "_tooling\android-sdk\platform-tools\adb.exe"
  if (Test-Path -LiteralPath $bundledAdb) {
    return $bundledAdb
  }

  return "adb"
}

$adb = Resolve-AdbExecutable
$adbSerialArgs = @()
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

$adbSerialArgs = @("-s", $Serial)

function Invoke-AdbText {
  param([string[]]$Arguments)

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    return (& $adb @adbSerialArgs @Arguments 2>$null | Out-String)
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Invoke-AdbQuiet {
  param([string[]]$Arguments)

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $adb @adbSerialArgs @Arguments 1>$null 2>$null
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Get-DeviceSize {
  $sizeOutput = Invoke-AdbText -Arguments @("shell", "wm", "size")
  if ($sizeOutput -match "Physical size:\s*(\d+)x(\d+)") {
    return @{
      Width = [int]$matches[1]
      Height = [int]$matches[2]
    }
  }

  return @{
    Width = 1080
    Height = 2400
  }
}

$deviceSize = Get-DeviceSize

function Invoke-RelativeTap {
  param(
    [double]$XRatio,
    [double]$YRatio
  )

  $x = [int][Math]::Round($deviceSize.Width * $XRatio)
  $y = [int][Math]::Round($deviceSize.Height * $YRatio)
  Invoke-AdbQuiet -Arguments @("shell", "input", "tap", [string]$x, [string]$y)
}

function Test-MiuiInstallPrompt {
  $windowDump = Invoke-AdbText -Arguments @("shell", "dumpsys", "window")
  $focusLines = ($windowDump -split "`n") | Where-Object {
    $_ -match "mCurrentFocus|mFocusedApp|mTopResumedActivity"
  }

  if (($focusLines -join "`n") -match "com\.miui\.securitycenter|AdbInstall|PackageInstaller|packageinstaller|com\.android\.packageinstaller") {
    return $true
  }

  $dumpPath = "/sdcard/eatfitai-miui-window.xml"
  Invoke-AdbQuiet -Arguments @("shell", "uiautomator", "dump", $dumpPath)
  $uiXml = Invoke-AdbText -Arguments @("shell", "cat", $dumpPath)
  $isInstallerPackage = $uiXml -match 'package="(com\.miui\.securitycenter|com\.google\.android\.packageinstaller|com\.android\.packageinstaller)"'
  $hasInstallPromptText = $uiXml -match "Cài đặt qua USB|Gỡ lỗi USB|Cho phép|Cài đặt|Install via USB|USB debugging|Allow|Install"
  return $isInstallerPackage -and $hasInstallPromptText
}

function Save-DeviceScreenshot {
  param([int]$Attempt)

  $devicePath = "/sdcard/eatfitai-miui-install-prompt.png"
  $hostPath = Join-Path $logRoot ("install-prompt-" + $Attempt + ".png")
  Invoke-AdbQuiet -Arguments @("shell", "screencap", "-p", $devicePath)
  Invoke-AdbQuiet -Arguments @("pull", $devicePath, $hostPath)
}

function Accept-MiuiInstallPrompt {
  Invoke-RelativeTap -XRatio 0.16 -YRatio 0.86
  Start-Sleep -Milliseconds 250
  Invoke-RelativeTap -XRatio 0.29 -YRatio 0.91
  Start-Sleep -Milliseconds 250
  Invoke-RelativeTap -XRatio 0.76 -YRatio 0.91
}

$envPathParts = @(
  (Join-Path $repoRoot "_tooling\android-sdk\platform-tools"),
  (Join-Path $repoRoot "_tooling\maestro\maestro\bin"),
  $env:PATH
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$debugRoot = Join-Path $logRoot "debug"
New-Item -ItemType Directory -Path $debugRoot -Force | Out-Null
$maestroDebugRoot = Join-Path $env:LOCALAPPDATA ("EatFitAI\maestro-miui\" + $timestamp + "\debug")
New-Item -ItemType Directory -Path $maestroDebugRoot -Force | Out-Null

$nodeCommand = Get-Command node -ErrorAction Stop
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $nodeCommand.Source
$processInfo.Arguments = "scripts/run-maestro.js $Suite"
$processInfo.WorkingDirectory = $projectRoot
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.EnvironmentVariables["PATH"] = ($envPathParts -join [IO.Path]::PathSeparator)
$processInfo.EnvironmentVariables["EATFITAI_SKIP_MAESTRO_BOOTSTRAP"] = "1"
$processInfo.EnvironmentVariables["MAESTRO_DEBUG_OUTPUT"] = $maestroDebugRoot
if (-not [string]::IsNullOrWhiteSpace($Serial)) {
  $processInfo.EnvironmentVariables["ANDROID_SERIAL"] = $Serial
}

Write-Output "[miui-maestro] Running suite '$Suite' on serial '$Serial'."
Write-Output "[miui-maestro] Log: $logFile"

$process = [System.Diagnostics.Process]::Start($processInfo)
$stdoutBuilder = New-Object System.Text.StringBuilder
$stderrBuilder = New-Object System.Text.StringBuilder
$stdoutHandler = [System.Diagnostics.DataReceivedEventHandler]{
  param($sender, $eventArgs)
  if ($null -ne $eventArgs.Data) {
    [void]$stdoutBuilder.AppendLine($eventArgs.Data)
  }
}
$stderrHandler = [System.Diagnostics.DataReceivedEventHandler]{
  param($sender, $eventArgs)
  if ($null -ne $eventArgs.Data) {
    [void]$stderrBuilder.AppendLine($eventArgs.Data)
  }
}
$process.add_OutputDataReceived($stdoutHandler)
$process.add_ErrorDataReceived($stderrHandler)
$process.BeginOutputReadLine()
$process.BeginErrorReadLine()
$deadline = [DateTime]::UtcNow.AddSeconds($PromptWatchSeconds)
$promptAttempts = 0

while (-not $process.HasExited -and [DateTime]::UtcNow -lt $deadline) {
  Start-Sleep -Milliseconds 800

  if (-not $NoAutoAccept -and (Test-MiuiInstallPrompt)) {
    Save-DeviceScreenshot -Attempt $promptAttempts
    Accept-MiuiInstallPrompt
    $promptAttempts++
    Start-Sleep -Milliseconds 700
  }
}

if (-not $process.HasExited) {
  [void]$process.WaitForExit(120000)
}

if (-not $process.HasExited) {
  $process.Kill()
  [void]$process.WaitForExit()
  Write-Output "[miui-maestro] Timed out waiting for Maestro to finish."
  $stdout = $stdoutBuilder.ToString()
  $stderr = $stderrBuilder.ToString()
  Set-Content -LiteralPath $logFile -Value ($stdout + $stderr) -Encoding UTF8
  Copy-Item -Path (Join-Path $maestroDebugRoot "*") -Destination $debugRoot -Recurse -Force -ErrorAction SilentlyContinue
  Write-Output ($stdout + $stderr)
  Write-Output "MAESTRO_MIUI_LOG_ROOT=$logRoot"
  Write-Output "MAESTRO_MIUI_DEBUG_ROOT=$debugRoot"
  Write-Output "MIUI_PROMPT_TAP_ATTEMPTS=$promptAttempts"
  exit 124
}

$process.WaitForExit()
$stdout = $stdoutBuilder.ToString()
$stderr = $stderrBuilder.ToString()
Set-Content -LiteralPath $logFile -Value ($stdout + $stderr) -Encoding UTF8
Copy-Item -Path (Join-Path $maestroDebugRoot "*") -Destination $debugRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Output ($stdout + $stderr)

Write-Output "MAESTRO_MIUI_LOG_ROOT=$logRoot"
Write-Output "MAESTRO_MIUI_DEBUG_ROOT=$debugRoot"
Write-Output "MIUI_PROMPT_TAP_ATTEMPTS=$promptAttempts"
exit $process.ExitCode
