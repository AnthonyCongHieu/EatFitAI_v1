[CmdletBinding()]
param(
    [string]$DeviceSerial = "",
    [bool]$EnableStt = $true,
    [switch]$SkipExpoInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$mobileEnvFile = Join-Path $repoRoot "eatfitai-mobile\.env.development"
$aiProviderDir = Join-Path $repoRoot "ai-provider"
$backendDir = Join-Path $repoRoot "eatfitai-backend"
$backendProject = Join-Path $backendDir "EatFitAI.API.csproj"
$mobileDir = Join-Path $repoRoot "eatfitai-mobile"
$logsDir = Join-Path $repoRoot "tools\dev\logs"
$aiHealthUrl = "http://127.0.0.1:5050/healthz"
$backendHealthUrl = "http://127.0.0.1:5247/health"
$androidPackage = "com.eatfitai.app"

function Assert-PathExists {
    param(
        [string]$PathValue,
        [string]$Label
    )

    if (-not (Test-Path $PathValue)) {
        throw "$Label not found: $PathValue"
    }
}

function Assert-CommandExists {
    param(
        [string]$CommandName,
        [string]$InstallHint
    )

    $commandInfo = Get-Command $CommandName -ErrorAction SilentlyContinue
    if (-not $commandInfo) {
        throw "$CommandName was not found in PATH. $InstallHint"
    }
}

function Set-MobileApiBaseUrl {
    param(
        [string]$EnvFile,
        [string]$ApiBaseUrl
    )

    $lines = @()
    if (Test-Path $EnvFile) {
        $lines = @(Get-Content $EnvFile -Encoding utf8)
    }

    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^EXPO_PUBLIC_API_BASE_URL=') {
            $lines[$i] = "EXPO_PUBLIC_API_BASE_URL=$ApiBaseUrl"
            $updated = $true
        }
    }

    if (-not $updated) {
        $lines = @("EXPO_PUBLIC_API_BASE_URL=$ApiBaseUrl") + $lines
    }

    Set-Content -Path $EnvFile -Value $lines -Encoding utf8
}

function Start-PowerShellWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$LogFilePath = ""
    )

    $loggedCommand = $Command
    if (-not [string]::IsNullOrWhiteSpace($LogFilePath)) {
        Set-Content -Path $LogFilePath -Value @() -Encoding utf8
        $escapedLogPath = $LogFilePath.Replace("'", "''")
        $loggedCommand = @"
& {
$Command
} *>&1 | Tee-Object -FilePath '$escapedLogPath' -Append
"@
    }

$wrappedCommand = @"
$Host.UI.RawUI.WindowTitle = '$Title'
try {
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    `$PSNativeCommandUseErrorActionPreference = `$false
}
$loggedCommand
} catch {
    Write-Host ''
    Write-Host '[FAIL]' -ForegroundColor Red
    Write-Host `$_.Exception.Message -ForegroundColor Red
}
"@

    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $wrappedCommand
    ) | Out-Null
}

function Get-AvailablePort {
    param(
        [int[]]$Candidates = @(8081, 8082, 8083, 8084, 8085)
    )

    foreach ($candidate in $Candidates) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $candidate -ErrorAction SilentlyContinue
        if (-not $listener) {
            return $candidate
        }
    }

    throw "No free Metro port found in candidates: $($Candidates -join ', '). Close the existing Expo/Metro process first."
}

function Test-HttpEndpointHealthy {
    param(
        [string]$Url
    )

    try {
        $null = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

function Wait-ForHttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds,
        [string]$FailureMessage
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $null = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    throw $FailureMessage
}

function Get-ProcessCommandLine {
    param(
        [int]$ProcessId
    )

    try {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId"
        return $process.CommandLine
    } catch {
        return $null
    }
}

function Stop-ExistingMetroProcesses {
    param(
        [string]$ProjectPath,
        [int[]]$CandidatePorts = @(8081, 8082, 8083, 8084, 8085)
    )

    $processIds = @(
        Get-NetTCPConnection -State Listen -LocalPort $CandidatePorts -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    )

    foreach ($processId in $processIds) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

function Wait-ForPortsToBeFree {
    param(
        [int[]]$Ports,
        [int]$TimeoutSeconds = 20
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $listeners = Get-NetTCPConnection -State Listen -LocalPort $Ports -ErrorAction SilentlyContinue
        if (-not $listeners) {
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Existing Metro ports did not become free within $TimeoutSeconds seconds. Close lingering Expo processes and retry."
}

function Wait-ForMetroPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($listener) {
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "Metro did not start on port $Port within $TimeoutSeconds seconds. Check the 'EatFitAI Mobile (USB Device)' terminal."
}

function Get-AdbDeviceLines {
    return @(
        (& adb devices | Select-Object -Skip 1) |
        Where-Object { $_ -match '\S' }
    )
}

function Resolve-AuthorizedDeviceSerial {
    param(
        [string]$RequestedSerial
    )

    $deviceLines = Get-AdbDeviceLines
    $authorizedDevices = @(
        $deviceLines |
        Where-Object { $_ -match '\sdevice$' } |
        ForEach-Object { ($_ -split '\s+')[0] }
    )
    $unauthorizedDevices = @($deviceLines | Where-Object { $_ -match '\sunauthorized$' } | ForEach-Object { ($_ -split '\s+')[0] })
    $offlineDevices = @($deviceLines | Where-Object { $_ -match '\soffline$' } | ForEach-Object { ($_ -split '\s+')[0] })
    $authorizedPhysicalDevices = @($authorizedDevices | Where-Object { $_ -notmatch '^emulator-' })

    if (-not [string]::IsNullOrWhiteSpace($RequestedSerial)) {
        if ($authorizedDevices -contains $RequestedSerial) {
            return $RequestedSerial
        }

        if ($unauthorizedDevices -contains $RequestedSerial) {
            throw "Requested device '$RequestedSerial' is unauthorized. Unlock the phone and accept the USB debugging prompt."
        }

        if ($offlineDevices -contains $RequestedSerial) {
            throw "Requested device '$RequestedSerial' is offline. Reconnect USB and re-enable USB debugging."
        }

        throw "Requested device '$RequestedSerial' was not found in adb devices."
    }

    if ($authorizedPhysicalDevices.Count -eq 1) {
        return $authorizedPhysicalDevices[0]
    }

    if ($authorizedPhysicalDevices.Count -gt 1) {
        throw "Multiple authorized physical Android devices are connected: $($authorizedPhysicalDevices -join ', '). Rerun with -DeviceSerial <serial>."
    }

    if ($authorizedDevices.Count -eq 1) {
        return $authorizedDevices[0]
    }

    if ($authorizedDevices.Count -gt 1) {
        throw "Multiple authorized Android devices are connected: $($authorizedDevices -join ', '). Rerun with -DeviceSerial <serial>."
    }

    if ($unauthorizedDevices.Count -gt 0) {
        throw "Android device detected but unauthorized: $($unauthorizedDevices -join ', '). Unlock the phone and accept the USB debugging prompt, then rerun."
    }

    if ($offlineDevices.Count -gt 0) {
        throw "Android device detected but offline: $($offlineDevices -join ', '). Reconnect USB and rerun."
    }

    throw "No Android device detected. Connect the phone via USB, enable USB debugging, then rerun."
}

function Launch-AppOnDevice {
    param(
        [string]$Serial,
        [string]$PackageName
    )

    & adb -s $Serial shell am start -n "$PackageName/.MainActivity" | Out-Null
}

function Test-AppInForeground {
    param(
        [string]$Serial,
        [string]$PackageName
    )

    $windowDump = & adb -s $Serial shell dumpsys window
    return ($windowDump | Select-String "mCurrentFocus=.*$PackageName|mFocusedApp=.*$PackageName" -Quiet)
}

function Ensure-AppForeground {
    param(
        [string]$Serial,
        [string]$PackageName,
        [int]$Attempts = 3
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        Launch-AppOnDevice -Serial $Serial -PackageName $PackageName
        Start-Sleep -Seconds 3

        if (Test-AppInForeground -Serial $Serial -PackageName $PackageName) {
            return
        }
    }

    throw "App $PackageName did not reach foreground on $Serial after $Attempts launch attempts."
}

function Ensure-MobileDependencies {
    if ($SkipExpoInstall) {
        return
    }

    if (Test-Path (Join-Path $mobileDir "node_modules")) {
        return
    }

    Write-Host "Installing mobile dependencies because node_modules is missing..."
    Push-Location $mobileDir
    try {
        & npm.cmd install
    } finally {
        Pop-Location
    }
}

Assert-PathExists -PathValue $aiProviderDir -Label "AI provider directory"
Assert-PathExists -PathValue $backendDir -Label "Backend directory"
Assert-PathExists -PathValue $backendProject -Label "Backend project"
Assert-PathExists -PathValue $mobileDir -Label "Mobile directory"

Assert-CommandExists -CommandName "powershell.exe" -InstallHint "Windows PowerShell is required."
Assert-CommandExists -CommandName "dotnet.exe" -InstallHint "Install .NET SDK 9 and ensure dotnet is on PATH."
Assert-CommandExists -CommandName "npm.cmd" -InstallHint "Install Node 20.x and ensure npm is on PATH."
Assert-CommandExists -CommandName "adb.exe" -InstallHint "Install Android platform-tools and ensure adb is on PATH."
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

$resolvedDeviceSerial = Resolve-AuthorizedDeviceSerial -RequestedSerial $DeviceSerial

Set-MobileApiBaseUrl -EnvFile $mobileEnvFile -ApiBaseUrl "http://127.0.0.1:5247"

& adb -s $resolvedDeviceSerial reverse tcp:5247 tcp:5247 | Out-Null

if (-not (Test-HttpEndpointHealthy -Url $aiHealthUrl)) {
    $enableSttValue = if ($EnableStt) { "true" } else { "false" }
    Start-PowerShellWindow -Title "EatFitAI AI Provider" -Command @"
Set-Location '$aiProviderDir'
if (-not (Test-Path '.\venv\Scripts\python.exe')) {
    throw 'Missing ai-provider virtual environment at .\venv\Scripts\python.exe'
}
if (Test-Path '.\.env') {
    Get-Content '.\.env' | ForEach-Object {
        if (`$_ -match '^(.*?)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2])
        }
    }
}
`$env:ENABLE_STT = '$enableSttValue'
.\venv\Scripts\python.exe app.py
"@

    Wait-ForHttpEndpoint `
        -Url $aiHealthUrl `
        -TimeoutSeconds 180 `
        -FailureMessage "AI provider did not become healthy at $aiHealthUrl within 45 seconds. Check the 'EatFitAI AI Provider' terminal."
}

if (-not (Test-HttpEndpointHealthy -Url $backendHealthUrl)) {
    Start-PowerShellWindow -Title "EatFitAI Backend" -Command @"
Set-Location '$backendDir'
dotnet run --project '$backendProject'
"@

    Wait-ForHttpEndpoint `
        -Url $backendHealthUrl `
        -TimeoutSeconds 60 `
        -FailureMessage "Backend did not become healthy at $backendHealthUrl within 60 seconds. Check the 'EatFitAI Backend' terminal."
}

Ensure-MobileDependencies

Stop-ExistingMetroProcesses -ProjectPath $mobileDir
Wait-ForPortsToBeFree -Ports @(8081, 8082, 8083, 8084, 8085)
$metroPort = Get-AvailablePort
& adb -s $resolvedDeviceSerial reverse "tcp:$metroPort" "tcp:$metroPort" | Out-Null

Start-PowerShellWindow -Title "EatFitAI Mobile (USB Device)" -Command @"
Set-Location '$mobileDir'
cmd /c "npm run dev:device -- --clear --port $metroPort 2>&1"
"@ -LogFilePath (Join-Path $logsDir "mobile-usb.log")

Wait-ForMetroPort -Port $metroPort -TimeoutSeconds 45
Ensure-AppForeground -Serial $resolvedDeviceSerial -PackageName $androidPackage

Write-Host "EatFitAI USB device lane started."
Write-Host "Device serial: $resolvedDeviceSerial"
Write-Host "Mobile API base URL set to http://127.0.0.1:5247 in $mobileEnvFile"
Write-Host "adb reverse has been configured for ports 5247 and $metroPort."
Write-Host "STT enabled: $EnableStt"
