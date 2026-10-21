$ErrorActionPreference = "Stop"
$root = "Q:\programing\RealEstatePlatfor"
Set-Location $root

$patch = Join-Path $root "Khanehyar-Messaging-V1.patch"
if (!(Test-Path -LiteralPath $patch -PathType Leaf)) {
    throw "Patch پیدا نشد. فایل Khanehyar-Messaging-V1.patch را در ریشه پروژه قرار بده."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "backups\messaging-v1-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$files = @(
    "apps\web\prisma\schema.prisma",
    "apps\web\app\api\listings\[id]\inquiries\route.ts",
    "apps\web\app\api\inquiries\[id]\reply\route.ts",
    "apps\web\app\api\my\messages\read\route.ts",
    "apps\web\app\api\my\messages\unread\route.ts",
    "apps\web\app\dashboard\messages\page.tsx",
    "apps\web\app\dashboard\messages\messages.css",
    "apps\web\app\listings\[id]\InquiryForm.tsx"
)
foreach ($relative in $files) {
    $source = Join-Path $root $relative
    if (Test-Path -LiteralPath $source -PathType Leaf) {
        $destination = Join-Path $backupDir $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination
    }
}
Write-Host "Backup: $backupDir" -ForegroundColor Cyan

# Safety: do not apply if local edits make the patch ambiguous.
git apply --check $patch
if ($LASTEXITCODE -ne 0) {
    throw "Patch با وضعیت فعلی فایل‌ها سازگار نیست؛ هیچ تغییری اعمال نشد. خروجی git apply --check را بررسی کن."
}

git apply $patch
if ($LASTEXITCODE -ne 0) {
    throw "اعمال Patch ناموفق بود. از نسخه پشتیبان در مسیر $backupDir استفاده کن."
}

git diff --check
if ($LASTEXITCODE -ne 0) {
    throw "git diff --check خطا داد؛ قبل از ادامه تغییرات را بررسی کن."
}

Write-Host "تغییرات پیام‌رسان اعمال شدند. دیتابیس هنوز تغییر نکرده است." -ForegroundColor Green
Write-Host "مرحله بعد: اعتبارسنجی Schema و بازبینی Migration، سپس اجرای migrate deploy." -ForegroundColor Yellow
