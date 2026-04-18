[CmdletBinding()]
param(
    [string]$BackendProjectPath,
    [string]$ReportPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BackendProjectPath)) {
    $BackendProjectPath = Join-Path $PSScriptRoot "..\..\eatfitai-backend\EatFitAI.API.csproj"
}

if ([string]::IsNullOrWhiteSpace($env:EATFITAI_GEMINI_REENCRYPT_OLD_KEY)) {
    throw "Set EATFITAI_GEMINI_REENCRYPT_OLD_KEY in the current shell before running this script."
}

if ([string]::IsNullOrWhiteSpace($env:EATFITAI_GEMINI_REENCRYPT_NEW_KEY)) {
    throw "Set EATFITAI_GEMINI_REENCRYPT_NEW_KEY in the current shell before running this script."
}

$resolvedProjectPath = (Resolve-Path -LiteralPath $BackendProjectPath).Path

if ($env:EATFITAI_GEMINI_REENCRYPT_OLD_KEY -eq $env:EATFITAI_GEMINI_REENCRYPT_NEW_KEY) {
    throw "Old and new Gemini encryption keys must be different."
}

$previousReportPath = $env:EATFITAI_GEMINI_REENCRYPT_REPORT
if (-not [string]::IsNullOrWhiteSpace($ReportPath)) {
    $env:EATFITAI_GEMINI_REENCRYPT_REPORT = [System.IO.Path]::GetFullPath($ReportPath)
}

try {
    & dotnet run --project $resolvedProjectPath -- --reencrypt-gemini-keys
    if ($LASTEXITCODE -ne 0) {
        throw "Gemini key re-encryption failed with exit code $LASTEXITCODE."
    }
}
finally {
    if (-not [string]::IsNullOrWhiteSpace($ReportPath)) {
        if ([string]::IsNullOrWhiteSpace($previousReportPath)) {
            Remove-Item Env:\EATFITAI_GEMINI_REENCRYPT_REPORT -ErrorAction SilentlyContinue
        }
        else {
            $env:EATFITAI_GEMINI_REENCRYPT_REPORT = $previousReportPath
        }
    }
}
