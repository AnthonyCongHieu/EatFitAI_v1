[CmdletBinding()]
param(
    [string]$AvdName = "EatFitAI_API_34",
    [switch]$SkipEmulator
)

$laneScript = Join-Path $PSScriptRoot 'tools\dev\Start-EatFitAI-EmulatorLane.ps1'

if (-not (Test-Path -LiteralPath $laneScript)) {
    throw "Missing emulator lane script: $laneScript"
}

& $laneScript -AvdName $AvdName -SkipEmulator:$SkipEmulator
