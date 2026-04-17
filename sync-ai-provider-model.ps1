[CmdletBinding()]
param(
    [string]$PrimarySource = '',
    [string]$FallbackSource = '',
    [string]$TargetDirectory = ''
)

$ErrorActionPreference = 'Stop'

function Get-DefaultModelSourcePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    return Join-Path $HOME "Downloads\$FileName"
}

function Copy-ModelIfPresent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        return $false
    }

    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
    Write-Host "[ai-model-sync] Copied $(Split-Path -Leaf $SourcePath) -> $DestinationPath"
    return $true
}

if ([string]::IsNullOrWhiteSpace($TargetDirectory)) {
    $TargetDirectory = Join-Path $PSScriptRoot 'ai-provider'
}

if ([string]::IsNullOrWhiteSpace($PrimarySource)) {
    $PrimarySource = Get-DefaultModelSourcePath -FileName 'best.pt'
}

if ([string]::IsNullOrWhiteSpace($FallbackSource)) {
    $FallbackSource = Get-DefaultModelSourcePath -FileName 'yolov8s.pt'
}

$targetBest = Join-Path $TargetDirectory 'best.pt'
$targetFallback = Join-Path $TargetDirectory 'yolov8s.pt'

if (-not (Test-Path -LiteralPath $TargetDirectory)) {
    throw "Target directory not found: $TargetDirectory"
}

$primaryCopied = Copy-ModelIfPresent -SourcePath $PrimarySource -DestinationPath $targetBest
$fallbackCopied = Copy-ModelIfPresent -SourcePath $FallbackSource -DestinationPath $targetFallback

if (-not $primaryCopied -and -not (Test-Path -LiteralPath $targetBest)) {
    Write-Warning "[ai-model-sync] Missing best.pt at $PrimarySource and ai-provider\\best.pt does not exist."
}

if (-not $fallbackCopied -and -not (Test-Path -LiteralPath $targetFallback)) {
    Write-Warning "[ai-model-sync] Missing yolov8s.pt at $FallbackSource and ai-provider\\yolov8s.pt does not exist."
}

Write-Host "[ai-model-sync] Ready. Local AI provider will prefer $targetBest and fall back to $targetFallback."
