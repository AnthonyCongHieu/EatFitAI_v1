[CmdletBinding()]
param(
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

function Get-PreferredLocalIpAddress {
    $candidates = @()

    foreach ($entry in Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue) {
        if ($entry.IPAddress -match '^127\.') {
            continue
        }

        if ($entry.IPAddress -match '^169\.254\.') {
            continue
        }

        $alias = $entry.InterfaceAlias
        $priority = if ($alias -match 'Wi-?Fi|WLAN') {
            1
        } elseif ($alias -match 'Ethernet') {
            2
        } else {
            3
        }

        $interfaceMetricProp = $entry.PSObject.Properties["InterfaceMetric"]
        $interfaceIndexProp = $entry.PSObject.Properties["InterfaceIndex"]
        $sortMetric = if ($null -ne $interfaceMetricProp -and $null -ne $interfaceMetricProp.Value) {
            [int]$interfaceMetricProp.Value
        } elseif ($null -ne $interfaceIndexProp -and $null -ne $interfaceIndexProp.Value) {
            [int]$interfaceIndexProp.Value
        } else {
            9999
        }

        $candidates += [pscustomobject]@{
            InterfaceAlias = $alias
            IPAddress = $entry.IPAddress
            Priority = $priority
            SortMetric = $sortMetric
        }
    }

    $selected = $candidates |
        Sort-Object Priority, SortMetric, IPAddress |
        Select-Object -First 1

    if (-not $selected) {
        throw "Could not auto-detect a LAN IPv4 address. Connect to Wi-Fi/Ethernet and retry."
    }

    return $selected.IPAddress
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
        if (Test-HttpEndpointHealthy -Url $Url) {
            return
        }

        Start-Sleep -Seconds 2
    }

    throw $FailureMessage
}

function Get-ListeningProcessIds {
    param(
        [int[]]$Ports
    )

    return @(
        Get-NetTCPConnection -State Listen -LocalPort $Ports -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    )
}

function Start-DetachedPowerShell {
    param(
        [string]$WorkingDirectory,
        [string]$Title,
        [string]$Command
    )

    $wrappedCommand = @"
$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location '$WorkingDirectory'
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    `$PSNativeCommandUseErrorActionPreference = `$false
}
$Command
"@

    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $wrappedCommand
    ) | Out-Null
}

function Ensure-AiProviderStarted {
    param(
        [bool]$ShouldEnableStt
    )

    if (Test-HttpEndpointHealthy -Url $aiHealthUrl) {
        return
    }

    $enableSttValue = if ($ShouldEnableStt) { "true" } else { "false" }
    $command = @"
if (-not (Test-Path '.\venv\Scripts\python.exe')) {
    throw 'Missing ai-provider virtual environment at .\venv\Scripts\python.exe'
}
`$env:ENABLE_STT = '$enableSttValue'
if (-not `$env:HF_TOKEN -and (Test-Path '.\.env')) {
    Get-Content '.\.env' | ForEach-Object {
        if (`$_ -match '^(.*?)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2])
        }
    }
    `$env:ENABLE_STT = '$enableSttValue'
}
.\venv\Scripts\python.exe app.py
"@

    Start-DetachedPowerShell -WorkingDirectory $aiProviderDir -Title "EatFitAI AI Provider" -Command $command

    $timeout = if ($ShouldEnableStt) { 180 } else { 45 }
    Wait-ForHttpEndpoint `
        -Url $aiHealthUrl `
        -TimeoutSeconds $timeout `
        -FailureMessage "AI provider did not become healthy at $aiHealthUrl within $timeout seconds."
}

function Ensure-BackendStarted {
    if (Test-HttpEndpointHealthy -Url $backendHealthUrl) {
        return
    }

    Start-DetachedPowerShell `
        -WorkingDirectory $backendDir `
        -Title "EatFitAI Backend" `
        -Command "dotnet run --project '$backendProject'"

    Wait-ForHttpEndpoint `
        -Url $backendHealthUrl `
        -TimeoutSeconds 60 `
        -FailureMessage "Backend did not become healthy at $backendHealthUrl within 60 seconds."
}

function Stop-ExistingMetroProcesses {
    $processIds = Get-ListeningProcessIds -Ports @(8081, 8082, 8083, 8084, 8085, 19000, 19001, 19002)
    foreach ($processId in $processIds) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
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

    throw "No free Metro port found in candidates: $($Candidates -join ', ')."
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

    throw "Metro did not start on port $Port within $TimeoutSeconds seconds."
}

Assert-PathExists -PathValue $aiProviderDir -Label "AI provider directory"
Assert-PathExists -PathValue $backendDir -Label "Backend directory"
Assert-PathExists -PathValue $backendProject -Label "Backend project"
Assert-PathExists -PathValue $mobileDir -Label "Mobile directory"

Assert-CommandExists -CommandName "powershell.exe" -InstallHint "Windows PowerShell is required."
Assert-CommandExists -CommandName "dotnet.exe" -InstallHint "Install .NET SDK 9 and ensure dotnet is on PATH."
Assert-CommandExists -CommandName "npm.cmd" -InstallHint "Install Node 20.x and ensure npm is on PATH."
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

$localIp = Get-PreferredLocalIpAddress
$apiBaseUrl = "http://$localIp`:5247"
Set-MobileApiBaseUrl -EnvFile $mobileEnvFile -ApiBaseUrl $apiBaseUrl

Ensure-AiProviderStarted -ShouldEnableStt:$EnableStt
Ensure-BackendStarted

if (-not $SkipExpoInstall -and -not (Test-Path (Join-Path $mobileDir "node_modules"))) {
    Write-Host "Installing mobile dependencies because node_modules is missing..."
    Push-Location $mobileDir
    try {
        & npm.cmd install
    } finally {
        Pop-Location
    }
}

Stop-ExistingMetroProcesses
$metroPort = Get-AvailablePort
Start-DetachedPowerShell `
    -WorkingDirectory $mobileDir `
    -Title "EatFitAI Mobile (Physical Device)" `
    -Command "cmd /c `"npm run dev:device -- --clear --port $metroPort 2>&1`""

Wait-ForMetroPort -Port $metroPort -TimeoutSeconds 45

Write-Host "EatFitAI physical device lane started."
Write-Host "LAN IP: $localIp"
Write-Host "Mobile API base URL: $apiBaseUrl"
Write-Host "Backend health: http://$localIp`:5247/health"
Write-Host "AI provider health: http://$localIp`:5050/healthz"
Write-Host "Expo Metro port: $metroPort"
Write-Host "STT enabled: $EnableStt"
