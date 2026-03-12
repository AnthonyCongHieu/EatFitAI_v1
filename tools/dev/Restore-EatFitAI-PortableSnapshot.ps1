[CmdletBinding()]
param(
    [string]$Server = "localhost",
    [switch]$SkipDrop
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$snapshotPath = Join-Path $repoRoot "sqdate13thang3t.sql"

if (-not (Test-Path $snapshotPath)) {
    throw "Snapshot not found: $snapshotPath"
}

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    throw "sqlcmd was not found on PATH. Install SQL Server command line tools first."
}

$raw = Get-Content -Path $snapshotPath -Raw -Encoding UTF8

$portableCreate = if ($SkipDrop) {
@"
CREATE DATABASE [EatFitAI]
GO
ALTER DATABASE [EatFitAI] SET RECOVERY SIMPLE
GO
ALTER DATABASE [EatFitAI] SET MULTI_USER
GO
ALTER DATABASE [EatFitAI] SET PAGE_VERIFY CHECKSUM
GO
"@
} else {
@"
IF DB_ID(N'EatFitAI') IS NOT NULL
BEGIN
    ALTER DATABASE [EatFitAI] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [EatFitAI];
END
GO
CREATE DATABASE [EatFitAI]
GO
ALTER DATABASE [EatFitAI] SET RECOVERY SIMPLE
GO
ALTER DATABASE [EatFitAI] SET MULTI_USER
GO
ALTER DATABASE [EatFitAI] SET PAGE_VERIFY CHECKSUM
GO
"@
}

$pattern = "CREATE DATABASE \[EatFitAI\][\s\S]+?GO\s+ALTER DATABASE \[EatFitAI\] SET COMPATIBILITY_LEVEL = 160"
$replacement = $portableCreate + "ALTER DATABASE [EatFitAI] SET COMPATIBILITY_LEVEL = 160"
$portableSql = [System.Text.RegularExpressions.Regex]::Replace(
    $raw,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replacement },
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if ($portableSql -eq $raw) {
    throw "Failed to rewrite the CREATE DATABASE block. The snapshot format may have changed."
}

$tempFile = Join-Path $env:TEMP ("EatFitAI-portable-bootstrap-{0}.sql" -f ([guid]::NewGuid().ToString("N")))
Set-Content -Path $tempFile -Value $portableSql -Encoding UTF8

Write-Host "Restoring EatFitAI snapshot to SQL Server instance '$Server'..."

try {
    & sqlcmd -S $Server -E -b -i $tempFile
    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd exited with code $LASTEXITCODE"
    }
    Write-Host "Portable restore completed successfully."
}
finally {
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}
