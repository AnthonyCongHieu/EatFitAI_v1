param(
    [string]$MetroPort = '8081',
    [string]$ApiBaseUrl = 'https://eatfitai-api.duckdns.org',
    [switch]$RestartMetro,
    [switch]$ClearLogsAfterOpen
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$mobileRoot = Join-Path $repoRoot 'eatfitai-mobile'
$envPath = Join-Path $mobileRoot '.env.development'
$outLog = Join-Path $repoRoot 'logs\expo-go-cloud.out.log'
$errLog = Join-Path $repoRoot 'logs\expo-go-cloud.err.log'

function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host "[expo-go-cloud] $Message"
}

function Ensure-DevEnv {
    if (Test-Path $envPath) {
        return
    }

    $content = @(
        '# Cloud-first development target for Expo Go / Metro.'
        "EXPO_PUBLIC_API_BASE_URL=$ApiBaseUrl"
        'APP_DEFAULT_TIME_ZONE=Asia/Ho_Chi_Minh'
        'EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL=https://pub-9081bce8ff6b4db5b4403ca7adae7b80.r2.dev'
        ''
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'
        'EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS=false'
        'EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN=false'
    ) -join [Environment]::NewLine

    Set-Content -LiteralPath $envPath -Value $content -Encoding ASCII
    Write-Step "Created $envPath"
}

function Get-MetroProcessId {
    $connection = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($connection) {
        return $connection.OwningProcess
    }

    return $null
}

function Stop-ExistingMetro {
    $metroProcessId = Get-MetroProcessId
    if (-not $metroProcessId) {
        return
    }

    Write-Step "Stopping existing Metro process $metroProcessId on port $MetroPort"
    Stop-Process -Id $metroProcessId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

function Start-MetroIfNeeded {
    $metroProcessId = Get-MetroProcessId
    if ($metroProcessId -and -not $RestartMetro) {
        Write-Step "Metro already listening on $MetroPort (PID $metroProcessId)"
        return
    }

    if ($RestartMetro) {
        Stop-ExistingMetro
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $outLog -Parent) | Out-Null
    Remove-Item -LiteralPath $outLog, $errLog -ErrorAction SilentlyContinue

    Write-Step 'Starting Metro with cloud backend env'
    $usbDevScriptPath = Join-Path $repoRoot 'start-mobile-usb-dev.ps1'
    $startProcessArgs = @{
        FilePath = 'powershell.exe'
        ArgumentList = @(
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            "`"$usbDevScriptPath`""
        )
        WorkingDirectory = $repoRoot
        WindowStyle = 'Hidden'
    }

    $startProcessArgs.RedirectStandardOutput = $outLog
    $startProcessArgs.RedirectStandardError = $errLog

    Start-Process @startProcessArgs | Out-Null

    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline) {
        if (Get-MetroProcessId) {
            Write-Step "Metro is listening on $MetroPort"
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Metro did not start on port $MetroPort."
}

function Open-ExpoGo {
    $devices = & adb.exe devices
    $deviceCount = @($devices | Where-Object { $_ -match "`tdevice$" }).Count
    if ($deviceCount -eq 0) {
        throw 'No authorized Android device found. Connect the phone and accept the USB debugging prompt.'
    }

    & adb.exe reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "adb reverse tcp:$MetroPort tcp:$MetroPort failed"
    }

    $expoUrl = "exp://127.0.0.1:$MetroPort"
    Write-Step "Opening Expo Go: $expoUrl"
    & adb.exe shell am force-stop host.exp.exponent | Out-Null
    & adb.exe shell am start -a android.intent.action.VIEW -d $expoUrl host.exp.exponent | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to open Expo Go. Make sure Expo Go is installed on the phone.'
    }
}

Ensure-DevEnv
Start-MetroIfNeeded
Open-ExpoGo

if ($ClearLogsAfterOpen) {
    Start-Sleep -Seconds 5
    Clear-Content -LiteralPath $outLog -ErrorAction SilentlyContinue
    Clear-Content -LiteralPath $errLog -ErrorAction SilentlyContinue
    Write-Step 'Cleared Metro logs after launch.'
}

Write-Step "Done. Logs: $outLog"
