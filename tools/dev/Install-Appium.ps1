[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Installing Appium globally with npm..."
npm install -g appium
if ($LASTEXITCODE -ne 0) {
    throw "npm install -g appium failed."
}

Write-Host "Installing UiAutomator2 driver..."
appium driver install uiautomator2
if ($LASTEXITCODE -ne 0) {
    throw "appium driver install uiautomator2 failed."
}

Write-Host "Installing Appium Inspector with winget..."
winget install --id AppiumDevelopers.AppiumInspector -e --accept-source-agreements --accept-package-agreements
if ($LASTEXITCODE -ne 0) {
    throw "winget install AppiumDevelopers.AppiumInspector failed."
}

Write-Host "Appium tooling installed."
