param(
    [ValidateSet('Dev', 'Preview', 'Both')]
    [string]$Mode = 'Dev',
    [switch]$UseLocalApi,
    [switch]$InstallDebugBuild,
    [switch]$InstallPreview,
    [switch]$OpenSpy,
    [switch]$RunDoctor,
    [switch]$RunVisualAudit,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $projectRoot
$usbDevScript = Join-Path $repoRoot 'start-mobile-usb-dev.ps1'
$buildPreviewScript = Join-Path $projectRoot 'scripts\build-android-preview.ps1'
$installPreviewScript = Join-Path $projectRoot 'scripts\install-android-preview.ps1'
$adbFlowScript = Join-Path $projectRoot 'scripts\real-device-adb-flow.js'
$deviceSpyScript = Join-Path $projectRoot 'scripts\device-spy.js'

function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host "[android-fast] $Message"
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command,
        [Parameter(Mandatory = $true)][string]$DryRunCommand
    )

    Write-Step $Name
    if ($DryRun) {
        Write-Step "DRY RUN: $DryRunCommand"
        return
    }

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

if (-not $env:EATFITAI_ANDROID_TARGET) {
    $env:EATFITAI_ANDROID_TARGET = 'real-device'
}

if ($RunDoctor) {
    # Runs real-device-adb-flow.js doctor when the lane should verify ADB/device readiness.
    Invoke-Step `
        -Name 'Running real-device doctor' `
        -DryRunCommand "node $adbFlowScript doctor" `
        -Command { & node $adbFlowScript doctor }
}

if ($Mode -in @('Preview', 'Both')) {
    Invoke-Step `
        -Name 'Building preview APK' `
        -DryRunCommand "powershell -ExecutionPolicy Bypass -File $buildPreviewScript" `
        -Command { & powershell -ExecutionPolicy Bypass -File $buildPreviewScript }

    if ($InstallPreview) {
        Invoke-Step `
            -Name 'Installing preview APK' `
            -DryRunCommand "powershell -ExecutionPolicy Bypass -File $installPreviewScript" `
            -Command { & powershell -ExecutionPolicy Bypass -File $installPreviewScript }
    }
}

if ($RunVisualAudit) {
    Invoke-Step `
        -Name 'Running visual-ui-audit' `
        -DryRunCommand "node $adbFlowScript visual-ui-audit --flow all --record" `
        -Command { & node $adbFlowScript visual-ui-audit --flow all --record }
}

if ($OpenSpy) {
    Write-Step 'Starting device-spy.js serve'
    if ($DryRun) {
        Write-Step "DRY RUN: node $deviceSpyScript serve --port 49152"
    } else {
        Start-Process `
            -FilePath 'node' `
            -ArgumentList @($deviceSpyScript, 'serve', '--port', '49152') `
            -WorkingDirectory $projectRoot `
            -WindowStyle Hidden | Out-Null
        Write-Step 'Device spy dashboard requested at http://127.0.0.1:49152'
    }
}

if ($Mode -in @('Dev', 'Both')) {
    $devArgs = @('-ExecutionPolicy', 'Bypass', '-File', $usbDevScript)
    if ($UseLocalApi) { $devArgs += '-UseLocalApi' }
    if ($InstallDebugBuild) { $devArgs += '-InstallDebugBuild' }
    if ($DryRun) { $devArgs += '-DryRun' }

    Invoke-Step `
        -Name 'Starting USB dev loop' `
        -DryRunCommand "powershell $($devArgs -join ' ')" `
        -Command { & powershell @devArgs }
}
