[CmdletBinding()]
param(
    [string]$Server = "localhost"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    throw "sqlcmd was not found on PATH."
}

$dbExists = & sqlcmd -S $Server -E -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = 'EatFitAI';"
if ($LASTEXITCODE -ne 0) {
    throw "Could not connect to SQL Server instance '$Server'."
}

if ([int]$dbExists.Trim() -ne 1) {
    throw "Database 'EatFitAI' does not exist on server '$Server'."
}

$tableCount = & sqlcmd -S $Server -E -d EatFitAI -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';"
if ($LASTEXITCODE -ne 0) {
    throw "Could not query database 'EatFitAI'."
}

$requiredTables = @("FoodItem", "MealDiary", "Recipe", "AiLabelMap")
foreach ($table in $requiredTables) {
    $exists = & sqlcmd -S $Server -E -d EatFitAI -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '$table';"
    if ($LASTEXITCODE -ne 0 -or [int]$exists.Trim() -ne 1) {
        throw "Required table '$table' was not found in EatFitAI."
    }
}

Write-Host ("EatFitAI database OK. Base tables: {0}" -f $tableCount.Trim())
