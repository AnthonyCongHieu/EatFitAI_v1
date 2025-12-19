# build-android.ps1 - Script tu dong download JDK 17 va build Android
# Giai phap triet de: giu Java 25 cua he thong, dung JDK 17 portable cho Android build

$ErrorActionPreference = "Stop"

# Duong dan JDK 17 portable
$JDK17_DIR = "$PSScriptRoot\.jdk17"
$JDK17_PATH = "$JDK17_DIR\jdk-17.0.13+11"

# Kiem tra neu JDK 17 chua duoc download
if (-Not (Test-Path "$JDK17_PATH\bin\java.exe")) {
    Write-Host "[DOWNLOAD] Dang download JDK 17 (Adoptium Temurin)..." -ForegroundColor Cyan
    
    # URL JDK 17 Windows x64 tu Adoptium
    $JDK17_URL = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.zip"
    $ZipFile = "$env:TEMP\jdk17.zip"
    
    # Download
    Invoke-WebRequest -Uri $JDK17_URL -OutFile $ZipFile -UseBasicParsing
    
    # Extract
    Write-Host "[EXTRACT] Dang giai nen JDK 17..." -ForegroundColor Cyan
    if (Test-Path $JDK17_DIR) {
        Remove-Item -Recurse -Force $JDK17_DIR
    }
    Expand-Archive -Path $ZipFile -DestinationPath $JDK17_DIR -Force
    Remove-Item $ZipFile
    
    Write-Host "[OK] JDK 17 da duoc cai dat tai: $JDK17_PATH" -ForegroundColor Green
}

# Set JAVA_HOME cho build
Write-Host "[CONFIG] Dat JAVA_HOME = $JDK17_PATH" -ForegroundColor Yellow
$env:JAVA_HOME = $JDK17_PATH

# Verify Java version
Write-Host "[JAVA] Java version:" -ForegroundColor Yellow
& "$JDK17_PATH\bin\java.exe" -version

# Chay build
Write-Host ""
Write-Host "[BUILD] Bat dau build Android..." -ForegroundColor Cyan
npx expo run:android

Write-Host ""
Write-Host "[OK] Build hoan tat!" -ForegroundColor Green
