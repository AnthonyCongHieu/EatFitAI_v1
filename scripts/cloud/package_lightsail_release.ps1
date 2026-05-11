param(
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $repoRoot "_artifacts\eatfitai-lightsail-release-$stamp.tar.gz"
}

$outputFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$outputDir = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "eatfitai-lightsail-release-$stamp"
if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$excludeDirs = @(
    ".git",
    ".pytest_cache",
    ".venv",
    "__pycache__",
    "bin",
    "bin_audit",
    "dataset_v2",
    "kaggle_check",
    "node_modules",
    "obj",
    "runs",
    "uploads",
    "venv"
)

$excludeFiles = @(
    ".env",
    "*.log",
    "*.ipynb",
    "*.pt"
)

foreach ($path in @("eatfitai-backend", "ai-provider", "infra")) {
    $source = Join-Path $repoRoot $path
    $destination = Join-Path $tempRoot $path
    New-Item -ItemType Directory -Force -Path $destination | Out-Null

    robocopy $source $destination /MIR /XD $excludeDirs /XF $excludeFiles /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed for $path with exit code $LASTEXITCODE"
    }
}

$runtimeEnvFiles = Get-ChildItem -LiteralPath $tempRoot -Recurse -Force -File |
    Where-Object { $_.Name -eq ".env" -or ($_.Name.StartsWith(".env.") -and -not $_.Name.EndsWith(".example")) }
if ($runtimeEnvFiles.Count -gt 0) {
    $relative = $runtimeEnvFiles | ForEach-Object { $_.FullName.Substring($tempRoot.Length + 1) }
    throw "Runtime env files would be packaged: $($relative -join ', ')"
}

if (Test-Path $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Force
}

Push-Location $tempRoot
try {
    tar -czf $outputFullPath .
}
finally {
    Pop-Location
}

Remove-Item -LiteralPath $tempRoot -Recurse -Force
Write-Host "Created $outputFullPath"
