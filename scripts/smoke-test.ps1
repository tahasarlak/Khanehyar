param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$failed = 0
$passed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Method = "GET",
        [int[]]$Expected,
        [hashtable]$Headers = @{},
        [string]$Body = ""
    )

    $options = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        SkipHttpErrorCheck = $true
        TimeoutSec = 15
        Headers = $Headers
    }

    if ($Body -ne "") {
        $options.Body = $Body
        $options.ContentType = "application/json"
    }

    try {
        $response = Invoke-WebRequest @options
        $actual = [int]$response.StatusCode

        if ($actual -in $Expected) {
            $script:passed++
            Write-Host "[PASS] $Name : $actual" -ForegroundColor Green
        }
        else {
            $script:failed++
            Write-Host "[FAIL] $Name : $actual (expected $($Expected -join ','))" -ForegroundColor Red
        }
    }
    catch {
        $script:failed++
        Write-Host "[FAIL] $Name : request failed" -ForegroundColor Red
    }
}

Write-Host "Khanehyar API smoke tests"
Write-Host "Target: $BaseUrl"
Write-Host "No authenticated data will be modified."
Write-Host ""

Test-Endpoint `
    -Name "Home page" `
    -Path "/" `
    -Expected @(200)

Test-Endpoint `
    -Name "Login page" `
    -Path "/login" `
    -Expected @(200)

Test-Endpoint `
    -Name "Registration page" `
    -Path "/register" `
    -Expected @(200)

Test-Endpoint `
    -Name "Current user without session" `
    -Path "/api/auth/me" `
    -Expected @(401)

Test-Endpoint `
    -Name "Private listings without session" `
    -Path "/api/my/listings" `
    -Expected @(401)

Test-Endpoint `
    -Name "Admin pending listings without session" `
    -Path "/api/admin/listings" `
    -Expected @(401)

Test-Endpoint `
    -Name "Admin history without session" `
    -Path "/api/admin/reviews" `
    -Expected @(401)

Test-Endpoint `
    -Name "Invalid login credentials" `
    -Path "/api/auth/login" `
    -Method "POST" `
    -Body '{"email":"invalid@example.com","password":"not-the-password"}' `
    -Expected @(401)

Test-Endpoint `
    -Name "Cross-origin logout rejected" `
    -Path "/api/auth/logout" `
    -Method "POST" `
    -Headers @{ Origin = "https://invalid.example" } `
    -Expected @(403)

Write-Host ""
Write-Host "Passed: $passed"
Write-Host "Failed: $failed"

if ($failed -gt 0) {
    exit 1
}

Write-Host "All smoke tests passed." -ForegroundColor Green
exit 0