[CmdletBinding()]
param(
    [string]$SqlServer = "localhost",
    [switch]$SkipBackendBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backendProject = Join-Path $repoRoot "eatfitai-backend\EatFitAI.API.csproj"
$mobileEnvFile = Join-Path $repoRoot "eatfitai-mobile\.env.development"
$aiHealthUrl = "http://127.0.0.1:5050/healthz"
$backendHealthUrl = "http://127.0.0.1:5247/health"
$androidSdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Write-CheckResult {
    param(
        [string]$Name,
        [bool]$Ok,
        [string]$Details
    )

    $status = if ($Ok) { "[OK]" } else { "[FAIL]" }
    Write-Host ("{0} {1} - {2}" -f $status, $Name, $Details)
}

function Get-CommandPathSafe {
    param(
        [System.Management.Automation.CommandInfo]$CommandInfo,
        [string]$Fallback
    )

    if ($CommandInfo.PSObject.Properties.Match("Source").Count -gt 0 -and $CommandInfo.Source) {
        return $CommandInfo.Source
    }

    if ($CommandInfo.PSObject.Properties.Match("Path").Count -gt 0 -and $CommandInfo.Path) {
        return $CommandInfo.Path
    }

    if ($CommandInfo.PSObject.Properties.Match("Definition").Count -gt 0 -and $CommandInfo.Definition) {
        return $CommandInfo.Definition
    }

    return $Fallback
}

function Resolve-ExternalCommandPath {
    param(
        [string]$CommandPath
    )

    if ($CommandPath -like "*.ps1") {
        $cmdVariant = [System.IO.Path]::ChangeExtension($CommandPath, ".cmd")
        if (Test-Path $cmdVariant) {
            return $cmdVariant
        }

        $exeVariant = [System.IO.Path]::ChangeExtension($CommandPath, ".exe")
        if (Test-Path $exeVariant) {
            return $exeVariant
        }
    }

    return $CommandPath
}

function Get-PreferredCommandInfo {
    param(
        [string]$Command
    )

    $resolved = Get-Command $Command -ErrorAction SilentlyContinue
    if ($resolved) {
        return $resolved
    }

    $fallbackCandidates = switch ($Command) {
        "adb" { @((Join-Path $androidSdkRoot "platform-tools\adb.exe")) }
        "emulator" { @((Join-Path $androidSdkRoot "emulator\emulator.exe")) }
        "ollama" { @((Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe")) }
        "appium" { @((Join-Path $env:APPDATA "npm\appium.cmd"), (Join-Path $env:APPDATA "npm\appium.ps1")) }
        default { @() }
    }

    foreach ($candidate in $fallbackCandidates) {
        if (Test-Path $candidate) {
            return Get-Command $candidate -ErrorAction SilentlyContinue
        }
    }

    return $null
}

function Test-CommandVersion {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$Arguments,
        [string]$ExpectedContains = ""
    )

    $cmd = Get-PreferredCommandInfo -Command $Command
    if (-not $cmd) {
        $failures.Add("$Name is missing.")
        Write-CheckResult -Name $Name -Ok $false -Details "command not found"
        return
    }

    $commandPath = Get-CommandPathSafe -CommandInfo $cmd -Fallback $Command
    $commandPath = Resolve-ExternalCommandPath -CommandPath $commandPath
    $escapedCommand = @($commandPath) + $Arguments | ForEach-Object {
        if ($_ -match '\s') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }

    $output = & cmd.exe /c (($escapedCommand -join ' ') + " 2>&1") | Out-String
    $normalized = $output.Trim()
    $ok = $true

    if ($ExpectedContains -and ($normalized -notmatch [Regex]::Escape($ExpectedContains))) {
        $ok = $false
        $warnings.Add("$Name version differs from the recommended baseline. Output: $normalized")
    }

    Write-CheckResult -Name $Name -Ok $ok -Details $normalized

    if (-not $ok) {
        Write-Host ("[WARN] {0} - expected to contain '{1}'" -f $Name, $ExpectedContains)
    }
}

Write-Host "== Toolchain =="
Test-CommandVersion -Name "node" -Command "node" -Arguments @("--version") -ExpectedContains "v20."
Test-CommandVersion -Name "npm" -Command "npm" -Arguments @("--version")
Test-CommandVersion -Name ".NET SDK" -Command "dotnet" -Arguments @("--version") -ExpectedContains "9.0."
Test-CommandVersion -Name "python" -Command "python" -Arguments @("--version") -ExpectedContains "3.11"
Test-CommandVersion -Name "java" -Command "java" -Arguments @("-version") -ExpectedContains "17"
Test-CommandVersion -Name "sqlcmd" -Command "sqlcmd" -Arguments @("-?")
Test-CommandVersion -Name "ollama" -Command "ollama" -Arguments @("--version")

foreach ($tool in @("adb", "emulator", "appium")) {
    $cmd = Get-PreferredCommandInfo -Command $tool
    if ($cmd) {
        Write-CheckResult -Name $tool -Ok $true -Details (Get-CommandPathSafe -CommandInfo $cmd -Fallback $tool)
    } else {
        $failures.Add("$tool is missing from PATH.")
        Write-CheckResult -Name $tool -Ok $false -Details "command not found"
    }
}

if (Test-Path $androidSdkRoot) {
    Write-CheckResult -Name "ANDROID_SDK_ROOT" -Ok $true -Details $androidSdkRoot
} else {
    $warnings.Add("ANDROID_SDK_ROOT does not exist yet. Android SDK provisioning has not been completed.")
    Write-CheckResult -Name "ANDROID_SDK_ROOT" -Ok $false -Details $androidSdkRoot
}

$emulatorCmd = Get-PreferredCommandInfo -Command "emulator"
if ($emulatorCmd) {
    $emulatorPath = Resolve-ExternalCommandPath -CommandPath (Get-CommandPathSafe -CommandInfo $emulatorCmd -Fallback "emulator")
    $emulatorList = & cmd.exe /c ('"{0}" -list-avds 2>&1' -f $emulatorPath) | Out-String
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($emulatorList)) {
        Write-CheckResult -Name "Android AVDs" -Ok $true -Details (($emulatorList -split '\r?\n' | Where-Object { $_.Trim() } | Select-Object -First 5) -join ", ")
    } else {
        $warnings.Add("No Android AVD was found. Create the EatFitAI_API_34 profile before running Appium.")
        Write-CheckResult -Name "Android AVDs" -Ok $false -Details "no AVDs listed"
    }
}

Write-Host "`n== Backend secrets =="
$secretOutput = & dotnet user-secrets list --project $backendProject 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    $failures.Add("Could not read backend user-secrets.")
    Write-CheckResult -Name "user-secrets" -Ok $false -Details "dotnet user-secrets list failed"
} else {
    $requiredSecretKeys = @(
        "ConnectionStrings:DefaultConnection",
        "Jwt:Key",
        "Smtp:Host",
        "Smtp:Port",
        "Smtp:User",
        "Smtp:Password",
        "Smtp:FromEmail"
    )

    foreach ($key in $requiredSecretKeys) {
        $present = $secretOutput -match [Regex]::Escape($key)
        if ($present) {
            Write-CheckResult -Name $key -Ok $true -Details "present"
        } else {
            $failures.Add("Missing backend user-secret: $key")
            Write-CheckResult -Name $key -Ok $false -Details "missing"
        }
    }
}

Write-Host "`n== Database =="
try {
    & (Join-Path $PSScriptRoot "Test-EatFitAIDatabase.ps1") -Server $SqlServer
}
catch {
    $failures.Add($_.Exception.Message)
    Write-CheckResult -Name "EatFitAI database" -Ok $false -Details $_.Exception.Message
}

Write-Host "`n== Local files =="
if (Test-Path $mobileEnvFile) {
    Write-CheckResult -Name ".env.development" -Ok $true -Details $mobileEnvFile
} else {
    $failures.Add("Missing eatfitai-mobile\\.env.development")
    Write-CheckResult -Name ".env.development" -Ok $false -Details "copy from .env.development.example"
}

$modelPath = Join-Path $repoRoot "ai-provider\best.pt"
$fallbackModelPath = Join-Path $repoRoot "ai-provider\yolov8s.pt"
if ((Test-Path $modelPath) -or (Test-Path $fallbackModelPath)) {
    Write-CheckResult -Name "AI model file" -Ok $true -Details "best.pt or yolov8s.pt found"
} else {
    $failures.Add("No local vision model found in ai-provider.")
    Write-CheckResult -Name "AI model file" -Ok $false -Details "missing best.pt and yolov8s.pt"
}

Write-Host "`n== Runtime endpoints =="
foreach ($endpoint in @(
        @{ Name = "AI health"; Url = $aiHealthUrl },
        @{ Name = "Backend health"; Url = $backendHealthUrl }
    )) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 3
        Write-CheckResult -Name $endpoint.Name -Ok $true -Details ("HTTP {0}" -f [int]$response.StatusCode)
    }
    catch {
        $warnings.Add("$($endpoint.Name) is not reachable. Start the service before coding.")
        Write-CheckResult -Name $endpoint.Name -Ok $false -Details "not reachable"
    }
}

if (-not $SkipBackendBuild) {
    Write-Host "`n== Backend build =="
    & dotnet build $backendProject -nologo
    if ($LASTEXITCODE -ne 0) {
        $failures.Add("Backend build failed.")
        Write-CheckResult -Name "Backend build" -Ok $false -Details "dotnet build failed"
    } else {
        Write-CheckResult -Name "Backend build" -Ok $true -Details "dotnet build passed"
    }
}

Write-Host "`n== Summary =="
if ($warnings.Count -gt 0) {
    Write-Host "Warnings:"
    foreach ($warning in $warnings) {
        Write-Host ("- {0}" -f $warning)
    }
}

if ($failures.Count -gt 0) {
    Write-Host "Failures:"
    foreach ($failure in $failures) {
        Write-Host ("- {0}" -f $failure)
    }
    exit 1
}

Write-Host "Environment preflight passed."
