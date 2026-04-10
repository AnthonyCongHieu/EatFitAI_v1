param(
    [string]$OutputDir = $(Join-Path $PSScriptRoot 'scan-demo'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$userAgent = 'Mozilla/5.0 EatFitAI-QA/1.0'

$fixtures = @(
    @{
        Key = 'egg'
        FileName = 'ai-primary-egg-01.jpg'
        Url = 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Two_fried_eggs.jpg'
        Source = 'https://commons.wikimedia.org/wiki/File:Two_fried_eggs.jpg'
    },
    @{
        Key = 'rice'
        FileName = 'ai-primary-rice-01.jpg'
        Url = 'https://upload.wikimedia.org/wikipedia/commons/6/69/Bowl_of_white_rice_01.jpg'
        Source = 'https://commons.wikimedia.org/wiki/File:Bowl_of_white_rice_01.jpg'
    },
    @{
        Key = 'spinach'
        FileName = 'ai-primary-spinach-01.jpg'
        Url = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Spinach_leaves.jpg'
        Source = 'https://commons.wikimedia.org/wiki/File:Spinach_leaves.jpg'
    },
    @{
        Key = 'chicken'
        FileName = 'ai-benchmark-chicken-01.jpg'
        Url = 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Golden_Chicken_Milanesa_with_Crisp_Breadcrumb_Coating.jpg'
        Source = 'https://commons.wikimedia.org/wiki/File:Golden_Chicken_Milanesa_with_Crisp_Breadcrumb_Coating.jpg'
    },
    @{
        Key = 'beef'
        FileName = 'ai-benchmark-beef-01.jpg'
        Url = 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Roast_beef_dish.jpg'
        Source = 'https://commons.wikimedia.org/wiki/File:Roast_beef_dish.jpg'
    },
    @{
        Key = 'pork'
        FileName = 'ai-benchmark-pork-01.jpg'
        Url = 'https://upload.wikimedia.org/wikipedia/commons/8/87/Pork_Barbecue_2023.jpg'
        Source = 'https://commons.wikimedia.org/wiki/File:Pork_Barbecue_2023.jpg'
    }
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$downloaded = @()

function Download-Fixture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    $attempts = 3
    for ($attempt = 1; $attempt -le $attempts; $attempt++) {
        if (Test-Path $Destination) {
            Remove-Item $Destination -Force
        }

        & curl.exe -L -A $userAgent --fail --silent --show-error $Url --output $Destination
        if ($LASTEXITCODE -eq 0 -and (Test-Path $Destination) -and ((Get-Item $Destination).Length -gt 0)) {
            return
        }

        if ($attempt -lt $attempts) {
            Start-Sleep -Seconds (2 * $attempt)
        }
    }

    throw "Failed to download fixture from $Url"
}

foreach ($fixture in $fixtures) {
    $destination = Join-Path $OutputDir $fixture.FileName
    if ((-not $Force) -and (Test-Path $destination) -and ((Get-Item $destination).Length -gt 0)) {
        $downloaded += [pscustomobject]@{
            key = $fixture.Key
            fileName = $fixture.FileName
            status = 'kept'
            bytes = (Get-Item $destination).Length
            source = $fixture.Source
            path = $destination
        }
        continue
    }

    Download-Fixture -Url $fixture.Url -Destination $destination
    $bytes = (Get-Item $destination).Length
    if ($bytes -le 0) {
        throw "Downloaded fixture is empty: $($fixture.FileName)"
    }

    $downloaded += [pscustomobject]@{
        key = $fixture.Key
        fileName = $fixture.FileName
        status = 'downloaded'
        bytes = $bytes
        source = $fixture.Source
        path = $destination
    }
}

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToString('o')
    outputDir = $OutputDir
    fixtureCount = $fixtures.Count
    items = $downloaded
}

$reportPath = Join-Path $OutputDir 'fixture-sources.json'
$report | ConvertTo-Json -Depth 5 | Set-Content -Path $reportPath -Encoding UTF8

Write-Output ($report | ConvertTo-Json -Depth 5)
