[CmdletBinding()]
param(
    [string]$AndroidSdkSource = "C:\Users\PC\AppData\Local\Android\Sdk",
    [string]$AndroidSdkTarget = "D:\DevTools\Android\Sdk",
    [string]$AndroidAvdSource = "C:\Users\PC\.android\avd",
    [string]$AndroidAvdTarget = "D:\DevTools\Android\avd",
    [string]$OllamaModelsSource = "C:\Users\PC\.ollama\models",
    [string]$OllamaModelsTarget = "D:\DevTools\Ollama\models",
    [switch]$CleanupBackups
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ("== {0} ==" -f $Message)
}

function New-ParentDirectory {
    param([string]$PathValue)
    $parent = Split-Path -Parent $PathValue
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
}

function Get-DirectorySnapshot {
    param([string]$PathValue)

    if (-not (Test-Path $PathValue)) {
        return [pscustomobject]@{
            Path = $PathValue
            Files = 0
            Bytes = 0L
        }
    }

    $items = Get-ChildItem -Path $PathValue -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { -not $_.PSIsContainer }

    $bytes = ($items | Measure-Object -Property Length -Sum).Sum
    if (-not $bytes) {
        $bytes = 0L
    }

    return [pscustomobject]@{
        Path = $PathValue
        Files = @($items).Count
        Bytes = [int64]$bytes
    }
}

function Invoke-RobocopyMirror {
    param(
        [string]$Source,
        [string]$Target
    )

    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    $arguments = @(
        "`"$Source`"",
        "`"$Target`"",
        "/MIR",
        "/COPY:DAT",
        "/DCOPY:DAT",
        "/R:1",
        "/W:1",
        "/XJ",
        "/NFL",
        "/NDL",
        "/NP"
    )

    & robocopy @arguments | Out-Host
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed while copying '$Source' to '$Target' (exit code $LASTEXITCODE)."
    }
}

function Remove-PathIfExists {
    param([string]$PathValue)
    if (Test-Path $PathValue) {
        Remove-Item -Path $PathValue -Recurse -Force
    }
}

function Set-UserEnvironmentVariable {
    param(
        [string]$Name,
        [string]$Value
    )

    [Environment]::SetEnvironmentVariable($Name, $Value, "User")
    Set-Item -Path ("Env:{0}" -f $Name) -Value $Value
}

function Add-UserPathEntry {
    param([string]$PathValue)

    if (-not (Test-Path $PathValue)) {
        return
    }

    $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $segments = @()
    if (-not [string]::IsNullOrWhiteSpace($currentUserPath)) {
        $segments = ($currentUserPath -split ';') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    }

    if ($segments -notcontains $PathValue) {
        [Environment]::SetEnvironmentVariable("Path", (($segments + $PathValue) -join ';'), "User")
    }

    $processSegments = ($env:PATH -split ';') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    if ($processSegments -notcontains $PathValue) {
        $env:PATH = ($processSegments + $PathValue) -join ';'
    }
}

function Stop-ToolingProcesses {
    Write-Step "Stopping Android/Ollama tooling"

    $adbPath = Join-Path $AndroidSdkSource "platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        try {
            & $adbPath kill-server *> $null
        } catch {
            Write-Host "adb server was not running."
        }
    }

    Get-Process emulator -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force

    $appiumProcessIds = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    if ($appiumProcessIds) {
        Stop-Process -Id $appiumProcessIds -Force -ErrorAction SilentlyContinue
    }

    $sdkJavaProcesses = Get-CimInstance Win32_Process |
        Where-Object { $_.CommandLine -match 'sdkmanager|avdmanager|uiautomator2|appium --address 127.0.0.1 --port 4723' } |
        Select-Object -ExpandProperty ProcessId -Unique
    if ($sdkJavaProcesses) {
        Stop-Process -Id $sdkJavaProcesses -Force -ErrorAction SilentlyContinue
    }
}

function Move-StorageWithJunction {
    param(
        [string]$Source,
        [string]$Target
    )

    if (-not (Test-Path $Source)) {
        Write-Host ("Skipping missing path: {0}" -f $Source)
        return $null
    }

    if ((Get-Item $Source -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Host ("Path already points to a junction/symlink: {0}" -f $Source)
        return $null
    }

    New-ParentDirectory -PathValue $Target
    Write-Step ("Copying {0} -> {1}" -f $Source, $Target)
    Invoke-RobocopyMirror -Source $Source -Target $Target

    $sourceSnapshot = Get-DirectorySnapshot -PathValue $Source
    $targetSnapshot = Get-DirectorySnapshot -PathValue $Target
    if ($sourceSnapshot.Files -ne $targetSnapshot.Files -or $sourceSnapshot.Bytes -ne $targetSnapshot.Bytes) {
        throw "Verification failed for '$Source'. Source and target differ after copy."
    }

    $backupPath = "{0}.bak-{1}" -f $Source, (Get-Date -Format "yyyyMMddHHmmss")
    Write-Step ("Creating backup and junction for {0}" -f $Source)
    Rename-Item -Path $Source -NewName (Split-Path -Leaf $backupPath)
    $cmdOutput = & cmd.exe /c "mklink /J `"$Source`" `"$Target`"" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create junction '$Source' -> '$Target'. Output: $cmdOutput"
    }

    if (-not (Test-Path $Source)) {
        throw "Junction validation failed for '$Source'."
    }

    return $backupPath
}

function Move-DirectoryChildrenWithJunction {
    param(
        [string]$SourceRoot,
        [string]$TargetRoot
    )

    if (-not (Test-Path $SourceRoot)) {
        Write-Host ("Skipping missing path: {0}" -f $SourceRoot)
        return @()
    }

    New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
    $childBackups = New-Object System.Collections.Generic.List[string]

    $children = Get-ChildItem -Path $SourceRoot -Force |
        Where-Object { $_.PSIsContainer }

    foreach ($child in $children) {
        if ($child.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            Write-Host ("Skipping existing junction child: {0}" -f $child.FullName)
            continue
        }

        $sourceChild = $child.FullName
        $targetChild = Join-Path $TargetRoot $child.Name

        New-ParentDirectory -PathValue $targetChild
        Write-Step ("Syncing {0} -> {1}" -f $sourceChild, $targetChild)
        Invoke-RobocopyMirror -Source $sourceChild -Target $targetChild

        $sourceSnapshot = Get-DirectorySnapshot -PathValue $sourceChild
        $targetSnapshot = Get-DirectorySnapshot -PathValue $targetChild
        if ($sourceSnapshot.Files -ne $targetSnapshot.Files -or $sourceSnapshot.Bytes -ne $targetSnapshot.Bytes) {
            throw "Verification failed for '$sourceChild'. Source and target differ after copy."
        }

        $backupPath = "{0}.bak-{1}" -f $sourceChild, (Get-Date -Format "yyyyMMddHHmmss")
        Write-Step ("Creating child junction for {0}" -f $sourceChild)
        Rename-Item -Path $sourceChild -NewName (Split-Path -Leaf $backupPath)
        $cmdOutput = & cmd.exe /c "mklink /J `"$sourceChild`" `"$targetChild`"" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create junction '$sourceChild' -> '$targetChild'. Output: $cmdOutput"
        }

        if (-not (Test-Path $sourceChild)) {
            throw "Junction validation failed for '$sourceChild'."
        }

        $childBackups.Add($backupPath)
    }

    $rootFiles = Get-ChildItem -Path $SourceRoot -Force |
        Where-Object { -not $_.PSIsContainer }
    foreach ($file in $rootFiles) {
        $targetFile = Join-Path $TargetRoot $file.Name
        Copy-Item -Path $file.FullName -Destination $targetFile -Force
    }

    return $childBackups.ToArray()
}

$backups = New-Object System.Collections.Generic.List[string]

Stop-ToolingProcesses

try {
    $sdkBackup = Move-StorageWithJunction -Source $AndroidSdkSource -Target $AndroidSdkTarget
    if ($sdkBackup) { $backups.Add($sdkBackup) }
} catch {
    Write-Warning ("Falling back to child junction strategy for Android SDK root because root relocation failed: {0}" -f $_.Exception.Message)
    $sdkChildBackups = Move-DirectoryChildrenWithJunction -SourceRoot $AndroidSdkSource -TargetRoot $AndroidSdkTarget
    foreach ($backup in $sdkChildBackups) {
        $backups.Add($backup)
    }
}

$avdBackup = Move-StorageWithJunction -Source $AndroidAvdSource -Target $AndroidAvdTarget
if ($avdBackup) { $backups.Add($avdBackup) }

$ollamaBackup = Move-StorageWithJunction -Source $OllamaModelsSource -Target $OllamaModelsTarget
if ($ollamaBackup) { $backups.Add($ollamaBackup) }

Write-Step "Persisting user environment"
Set-UserEnvironmentVariable -Name "ANDROID_SDK_ROOT" -Value $AndroidSdkTarget
Set-UserEnvironmentVariable -Name "ANDROID_HOME" -Value $AndroidSdkTarget
Set-UserEnvironmentVariable -Name "ANDROID_AVD_HOME" -Value $AndroidAvdTarget
Set-UserEnvironmentVariable -Name "OLLAMA_MODELS" -Value $OllamaModelsTarget

Add-UserPathEntry -PathValue (Join-Path $AndroidSdkTarget "platform-tools")
Add-UserPathEntry -PathValue (Join-Path $AndroidSdkTarget "emulator")
Add-UserPathEntry -PathValue (Join-Path $AndroidSdkTarget "cmdline-tools\latest\bin")
Add-UserPathEntry -PathValue (Join-Path $env:LOCALAPPDATA "Programs\Ollama")

Write-Step "Relocation summary"
Write-Host ("ANDROID_SDK_ROOT={0}" -f $AndroidSdkTarget)
Write-Host ("ANDROID_AVD_HOME={0}" -f $AndroidAvdTarget)
Write-Host ("OLLAMA_MODELS={0}" -f $OllamaModelsTarget)

if ($CleanupBackups) {
    Write-Step "Removing verified backups"
    foreach ($backup in $backups) {
        Remove-PathIfExists -PathValue $backup
    }
} elseif ($backups.Count -gt 0) {
    Write-Host "Backups retained for safety:"
    foreach ($backup in $backups) {
        Write-Host ("- {0}" -f $backup)
    }
}
