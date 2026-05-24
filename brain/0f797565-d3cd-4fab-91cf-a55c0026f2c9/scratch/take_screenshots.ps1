$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$baseUrl = "http://localhost:3000"
$artifactDir = "C:\Users\PC\.gemini\antigravity\brain\0f797565-d3cd-4fab-91cf-a55c0026f2c9"
$tempDir = "d:\EatFitAI_v1\_tmp_ui_screens"

if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

$pages = @("top", "features", "simulator", "tdee", "showcase", "faq", "download")

# 1. Chup PC (1440x900)
foreach ($page in $pages) {
    $url = "$baseUrl/#$page"
    $outPath = Join-Path $tempDir "current_pc_$page.png"
    Write-Host "Chup PC cho trang $page..."
    Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outPath`"", "--window-size=1440,900", "`"$url`"" -Wait -NoNewWindow
    Start-Sleep -Milliseconds 600
}

# 2. Chup Mobile (375x812)
$ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
foreach ($page in $pages) {
    $url = "$baseUrl/#$page"
    $outPath = Join-Path $tempDir "current_mobile_$page.png"
    Write-Host "Chup Mobile cho trang $page..."
    Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outPath`"", "--window-size=375,812", "--user-agent=`"$ua`"", "`"$url`"" -Wait -NoNewWindow
    Start-Sleep -Milliseconds 600
}

# 3. Copy sang thu muc artifact
foreach ($page in $pages) {
    Copy-Item (Join-Path $tempDir "current_pc_$page.png") (Join-Path $artifactDir "current_pc_$page.png") -Force
    Copy-Item (Join-Path $tempDir "current_mobile_$page.png") (Join-Path $artifactDir "current_mobile_$page.png") -Force
}

Write-Host "Chup anh thanh cong va da dong bo vao thu muc artifact!"
