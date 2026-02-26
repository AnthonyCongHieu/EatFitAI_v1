param(
    [string]$Repo = "openai/skills",
    [string]$ManifestPath = "$PSScriptRoot/skills-manifest.txt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
$installerScriptsDir = Join-Path $codexHome "skills\.system\skill-installer\scripts"
$listScript = Join-Path $installerScriptsDir "list-skills.py"
$installScript = Join-Path $installerScriptsDir "install-skill-from-github.py"

if (!(Test-Path $listScript) -or !(Test-Path $installScript)) {
    Write-Error "Skill installer scripts not found at: $installerScriptsDir. Open Codex once to initialize system skills."
    exit 1
}

if (!(Test-Path $ManifestPath)) {
    Write-Error "Manifest not found: $ManifestPath"
    exit 1
}

$manifestEntries = Get-Content -Path $ManifestPath |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith("#") }

if ($manifestEntries.Count -eq 0) {
    Write-Host "No skill entries in manifest."
    exit 0
}

$installedNames = @()
try {
    $installedJson = & python $listScript --format json
    if ($LASTEXITCODE -eq 0 -and $installedJson) {
        $installedNames = $installedJson |
            ConvertFrom-Json |
            Where-Object { $_.installed -eq $true } |
            ForEach-Object { $_.name }
    }
} catch {
    Write-Warning "Could not pre-read installed skills. Script will attempt install from manifest."
}

$toInstall = @()
foreach ($entry in $manifestEntries) {
    $name = Split-Path $entry -Leaf
    if ($installedNames -contains $name) {
        Write-Host "[skip] $name already installed"
    } else {
        $toInstall += $entry
    }
}

if ($toInstall.Count -eq 0) {
    Write-Host "All manifest skills are already installed."
    Write-Host "Restart Codex to pick up new skills if needed."
    exit 0
}

Write-Host "Installing $($toInstall.Count) skill(s) from $Repo ..."
& python $installScript --repo $Repo --path $toInstall

if ($LASTEXITCODE -ne 0) {
    Write-Error "Skill installation failed."
    exit $LASTEXITCODE
}

Write-Host "Done. Restart Codex to pick up new skills."
