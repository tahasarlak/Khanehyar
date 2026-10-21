$ErrorActionPreference = "Stop"
$root = "Q:\programing\RealEstatePlatfor"
Set-Location $root

$patch = Join-Path $root "Khanehyar-Messenger-UX-V2.patch"
if (!(Test-Path -LiteralPath $patch -PathType Leaf)) {
    throw "Patch پیدا نشد: $patch"
}

$files = @(
    "apps\web\app\api\listings\[id]\inquiries\route.ts",
    "apps\web\app\listings\[id]\InquiryForm.tsx",
    "apps\web\app\dashboard\messages\[conversationId]\page.tsx",
    "apps\web\app\dashboard\messages\messages.css"
)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "backups\messenger-ux-v2-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

foreach ($relative in $files) {
    $source = Join-Path $root $relative
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "فایل لازم پیدا نشد؛ هیچ تغییری اعمال نشده است: $relative"
    }
    $destination = Join-Path $backupDir $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}
Write-Host "Backup: $backupDir" -ForegroundColor Cyan

git apply --check $patch
if ($LASTEXITCODE -ne 0) {
    throw "Patch با فایل‌های فعلی سازگار نیست؛ تغییری اعمال نشد. خروجی git apply --check را بررسی کن."
}

git apply $patch
if ($LASTEXITCODE -ne 0) {
    throw "اعمال Patch ناموفق بود. نسخه‌های پشتیبان در $backupDir هستند."
}

git diff --check
if ($LASTEXITCODE -ne 0) {
    throw "git diff --check خطا داد؛ پیش از Build فایل‌ها را بررسی کن. Backup: $backupDir"
}

Write-Host "تغییرات Messenger UX V2 اعمال شدند." -ForegroundColor Green
Write-Host "Backup: $backupDir" -ForegroundColor Cyan
Write-Host "مرحله بعد: pnpm --filter web build" -ForegroundColor Yellow
