$ErrorActionPreference = "Stop"
$root = "Q:\programing\RealEstatePlatfor"
Set-Location $root

$patch = Join-Path $root "Khanehyar-Messenger-UX-V3.patch"
if (!(Test-Path -LiteralPath $patch -PathType Leaf)) {
    throw "Patch پیدا نشد: $patch"
}

$files = @(
    "apps\web\app\dashboard\messages\[conversationId]\page.tsx",
    "apps\web\app\dashboard\messages\page.tsx",
    "apps\web\app\dashboard\messages\messages.css"
)

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "backups\messenger-ux-v3-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

foreach ($relative in $files) {
    $source = Join-Path $root $relative
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "فایل موردنیاز پیدا نشد؛ هیچ تغییری اعمال نشده: $relative"
    }
    $destination = Join-Path $backupDir $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}
Write-Host "Backup: $backupDir" -ForegroundColor Cyan

# Verify patch compatibility before changing any source file.
git apply --check $patch
if ($LASTEXITCODE -ne 0) {
    throw "Patch با فایل‌های فعلی سازگار نیست؛ هیچ تغییری اعمال نشد. فایل‌ها و تغییرات محلی را بررسی کن."
}

git apply $patch
if ($LASTEXITCODE -ne 0) {
    throw "اعمال Patch ناموفق بود؛ نسخه‌های پشتیبان در $backupDir قرار دارند."
}

git diff --check
if ($LASTEXITCODE -ne 0) {
    throw "git diff --check خطا داد؛ قبل از Build فایل‌ها را بررسی کن."
}

Write-Host "Messenger UX V3 اعمال شد: هویت گفت‌وگو بر اساس ملک است و تنظیم رندر صفحه چت اصلاح شد." -ForegroundColor Green
Write-Host "دیتابیس و Migration تغییر نکردند." -ForegroundColor Green
Write-Host "مرحله بعد: pnpm --filter web build" -ForegroundColor Yellow
