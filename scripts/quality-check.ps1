param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

$passed = 0
$failed = 0

function Check-Endpoint {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Method = "GET",
        [int]$Expected = 200,
        [string]$Origin = "",
        [string]$Body = ""
    )

    $arguments = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        SkipHttpErrorCheck = $true
        TimeoutSec = 25
        MaximumRedirection = 0
    }

    if ($Origin) {
        $arguments.Headers = @{ Origin = $Origin }
    }

    if ($Body) {
        $arguments.Body = $Body
        $arguments.ContentType = "application/json; charset=utf-8"
    }

    try {
        $result = Invoke-WebRequest @arguments
        $actual = [int]$result.StatusCode

        if ($actual -eq $Expected) {
            Write-Host "[PASS] $Name ($actual)" -ForegroundColor Green
            $script:passed++
        }
        else {
            Write-Host (
                "[FAIL] $Name - Expected $Expected, got $actual"
            ) -ForegroundColor Red
            $script:failed++
        }
    }
    catch {
        Write-Host "[FAIL] $Name - Connection/request error" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor DarkGray
        $script:failed++
    }
}

Write-Host ""
Write-Host "KHANEHYAR QUALITY CHECK" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl"
Write-Host "No database records will be modified."
Write-Host ""

# Public pages.
Check-Endpoint -Name "Homepage" -Path "/"
Check-Endpoint -Name "Search" -Path "/search"
Check-Endpoint -Name "Advanced search" `
    -Path "/search?deal=SALE&minPrice=1000&sort=price_asc"
Check-Endpoint -Name "Login" -Path "/login"
Check-Endpoint -Name "Register" -Path "/register"

# Private pages must not crash when the visitor is not logged in.
# Their current implementation displays a login screen or redirects.
Check-Endpoint -Name "Favorites guest page" -Path "/favorites"
Check-Endpoint -Name "Messages guest page" -Path "/my/messages"

# Authenticated APIs must reject anonymous requests.
Check-Endpoint -Name "Current user guest" `
    -Path "/api/auth/me" -Expected 401

Check-Endpoint -Name "My listings guest" `
    -Path "/api/my/listings" -Expected 401

Check-Endpoint -Name "Admin listings guest" `
    -Path "/api/admin/listings" -Expected 401

Check-Endpoint -Name "Admin reviews guest" `
    -Path "/api/admin/reviews" -Expected 401

Check-Endpoint -Name "Unread messages guest" `
    -Path "/api/my/messages/unread" -Expected 401

# Unauthorized / cross-origin message creation.
$sampleMessage = '{"message":"This is a test inquiry message of sufficient length."}'

Check-Endpoint -Name "Inquiry wrong origin" `
    -Path "/api/listings/invalid-test-listing/inquiries" `
    -Method "POST" `
    -Origin "https://invalid.example" `
    -Body $sampleMessage `
    -Expected 403

Check-Endpoint -Name "Inquiry anonymous sender" `
    -Path "/api/listings/invalid-test-listing/inquiries" `
    -Method "POST" `
    -Origin $BaseUrl `
    -Body $sampleMessage `
    -Expected 401

# Reply API must enforce the same protections.
Check-Endpoint -Name "Reply wrong origin" `
    -Path "/api/inquiries/invalid-test-message/reply" `
    -Method "POST" `
    -Origin "https://invalid.example" `
    -Body '{"message":"Test reply"}' `
    -Expected 403

Check-Endpoint -Name "Reply anonymous sender" `
    -Path "/api/inquiries/invalid-test-message/reply" `
    -Method "POST" `
    -Origin $BaseUrl `
    -Body '{"message":"Test reply"}' `
    -Expected 401

# Read-status update must reject an anonymous sender.
$readBody = '{"listingId":"test","counterpartId":"test"}'

Check-Endpoint -Name "Read status wrong origin" `
    -Path "/api/my/messages/read" `
    -Method "POST" `
    -Origin "https://invalid.example" `
    -Body $readBody `
    -Expected 403

Check-Endpoint -Name "Read status anonymous sender" `
    -Path "/api/my/messages/read" `
    -Method "POST" `
    -Origin $BaseUrl `
    -Body $readBody `
    -Expected 401

# A non-existent public listing must not produce a server error.
Check-Endpoint -Name "Missing public listing" `
    -Path "/listings/invalid-test-listing" `
    -Expected 404

Write-Host ""
Write-Host "===================================="
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed) { "Red" } else { "Green" })
Write-Host "===================================="

if ($failed -gt 0) {
    exit 1
}

exit 0