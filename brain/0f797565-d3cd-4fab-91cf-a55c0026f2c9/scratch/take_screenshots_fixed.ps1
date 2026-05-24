$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$baseUrl = "http://localhost:3000"
$artifactDir = "C:\Users\PC\.gemini\antigravity\brain\0f797565-d3cd-4fab-91cf-a55c0026f2c9"
$tempDir = "d:\EatFitAI_v1\_tmp_ui_screens"

if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

# Định nghĩa các trang và kích thước viewport động chuyên biệt cho từng trang
$pageConfigs = @(
    @{ Name = "top";       PcWidth = 1440; PcHeight = 900;  MbWidth = 375; MbHeight = 900 },
    @{ Name = "features";  PcWidth = 1440; PcHeight = 2600; MbWidth = 375; MbHeight = 4200 },
    @{ Name = "simulator"; PcWidth = 1440; PcHeight = 1600; MbWidth = 375; MbHeight = 2400 },
    @{ Name = "tdee";      PcWidth = 1440; PcHeight = 1600; MbWidth = 375; MbHeight = 2200 },
    @{ Name = "showcase";  PcWidth = 1440; PcHeight = 1200; MbWidth = 375; MbHeight = 2000 },
    @{ Name = "faq";       PcWidth = 1440; PcHeight = 1400; MbWidth = 375; MbHeight = 2000 },
    @{ Name = "download";  PcWidth = 1440; PcHeight = 1000; MbWidth = 375; MbHeight = 1500 }
)

# 1. Chup PC với chiều cao động
foreach ($config in $pageConfigs) {
    $page = $config.Name
    $width = $config.PcWidth
    $height = $config.PcHeight
    $url = "$baseUrl/?instant=true#$page"
    $outPath = Join-Path $tempDir "fixed_pc_$page.png"
    Write-Host "Chup PC cho trang $page với viewport ${width}x${height}..."
    Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outPath`"", "--window-size=$width,$height", "--hide-scrollbars", "`"$url`"" -Wait -NoNewWindow
    Start-Sleep -Milliseconds 800
}

# 2. Chup Mobile với chiều cao động và User Agent giả lập
$ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
foreach ($config in $pageConfigs) {
    $page = $config.Name
    $width = $config.MbWidth
    $height = $config.MbHeight
    $url = "$baseUrl/?instant=true#$page"
    $outPath = Join-Path $tempDir "fixed_mobile_$page.png"
    Write-Host "Chup Mobile cho trang $page với viewport ${width}x${height}..."
    Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outPath`"", "--window-size=$width,$height", "--hide-scrollbars", "--user-agent=`"$ua`"", "`"$url`"" -Wait -NoNewWindow
    Start-Sleep -Milliseconds 800
}

# 3. Copy sang thu mục artifact
foreach ($config in $pageConfigs) {
    $page = $config.Name
    Copy-Item (Join-Path $tempDir "fixed_pc_$page.png") (Join-Path $artifactDir "fixed_pc_$page.png") -Force
    Copy-Item (Join-Path $tempDir "fixed_mobile_$page.png") (Join-Path $artifactDir "fixed_mobile_$page.png") -Force
}

Write-Host "Chup anh kiem chung Fixed (chieu cao dong + instant) thanh cong va da dong bo vao thu muc artifact!"
