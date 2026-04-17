. (Join-Path $PSScriptRoot '_config\dev-env.ps1')

function Start-WorkspaceScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptName
    )

    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    $command = "& '$scriptPath'"

    Start-Process powershell.exe -WorkingDirectory $PSScriptRoot -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-Command', $command
    )
}

Start-WorkspaceScript 'start-emulator.ps1'
Start-Sleep -Seconds 2
Start-WorkspaceScript 'start-ai-provider.ps1'
Start-Sleep -Seconds 2
Start-WorkspaceScript 'start-backend.ps1'
Start-Sleep -Seconds 2
Start-WorkspaceScript 'start-mobile-local.ps1'

Write-Host 'Launched emulator, AI provider, backend, and local mobile dev server in separate terminals.'
