$baseUrl = "http://localhost:5247"
$randomId = Get-Random -Minimum 1000 -Maximum 9999
$email = "test_refresh_$randomId@example.com"
$password = "Password123!"

function Test-Step {
    param ($Name, $ScriptBlock)
    Write-Host "Testing: $Name..." -NoNewline
    try {
        & $ScriptBlock
        Write-Host " [OK]" -ForegroundColor Green
    } catch {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

# 1. Register
Test-Step "Register" {
    $body = @{
        email = $email
        password = $password
        displayName = "Test User"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    if (-not $response.token) { throw "No token returned from Register" }
    if (-not $response.refreshToken) { throw "No refreshToken returned from Register" }
    
    $global:accessToken = $response.token
    $global:refreshToken = $response.refreshToken
    Write-Host "`n   -> Got AccessToken: $($global:accessToken.Substring(0, 10))..."
    Write-Host "   -> Got RefreshToken: $($global:refreshToken)"
}

# 2. Refresh Token
Test-Step "Refresh Token" {
    Start-Sleep -Seconds 2
    $body = @{
        accessToken = $global:accessToken
        refreshToken = $global:refreshToken
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/refresh" -Method Post -Body $body -ContentType "application/json"
    
    if ($response.token -eq $global:accessToken) { throw "AccessToken did not change" }
    if ($response.refreshToken -eq $global:refreshToken) { throw "RefreshToken did not change" }

    $global:newAccessToken = $response.token
    $global:newRefreshToken = $response.refreshToken
    Write-Host "`n   -> Rotated AccessToken: $($global:newAccessToken.Substring(0, 10))..."
    Write-Host "   -> Rotated RefreshToken: $($global:newRefreshToken)"
}

# 3. Logout
Test-Step "Logout" {
    $headers = @{ Authorization = "Bearer $global:newAccessToken" }
    $body = @{ maRefreshToken = $global:newRefreshToken } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" -Method Post -Headers $headers -Body $body -ContentType "application/json"
}

# 4. Refresh Token After Logout (Should Fail)
Write-Host "Testing: Refresh Token After Logout (Should Fail)..." -NoNewline
try {
    $body = @{
        accessToken = $global:newAccessToken
        refreshToken = $global:newRefreshToken
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/api/auth/refresh" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host " [FAILED] - Should have thrown an error" -ForegroundColor Red
} catch {
    Write-Host " [OK] - Request failed as expected: $($_.Exception.Message)" -ForegroundColor Green
}
