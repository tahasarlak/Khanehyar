import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../../src/lib/auth";
import { prisma } from "../../../../../../src/lib/prisma";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "../../../../../../src/lib/rate-limit";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  const limit = await checkRateLimit("restore-own-listing", getRequestIdentity(request));
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "شناسه آگهی معتبر نیست." }, { status: 400 });
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({ where: { id, ownerId: user.id, deletedAt: { not: null }, deleteExpiresAt: { gt: now } }, select: { id: true, title: true, status: true, deletedAt: true, deleteExpiresAt: true } });
    if (!listing) return false;
    const changed = await tx.listing.updateMany({ where: { id, ownerId: user.id, deletedAt: { not: null }, deleteExpiresAt: { gt: now } }, data: { deletedAt: null, deleteExpiresAt: null, deletedById: null } });
    if (changed.count !== 1) return false;
    await tx.listingAuditLog.create({ data: { listingId: id, listingTitle: listing.title, actorId: user.id, actorRole: user.role, action: "RESTORED", reason: "بازیابی توسط مالک در مهلت ۷ روزه", before: { deletedAt: listing.deletedAt?.toISOString() ?? null, deleteExpiresAt: listing.deleteExpiresAt?.toISOString() ?? null }, after: { status: listing.status } } });
    return true;
  });
  if (!result) return NextResponse.json({ error: "آگهی پیدا نشد یا مهلت بازیابی مالک به پایان رسیده است. برای بررسی با پشتیبانی تماس بگیرید." }, { status: 404 });
  return NextResponse.json({ message: "آگهی بازیابی شد. در صورت نیاز به تأیید مدیر، وضعیت فعلی آگهی حفظ می‌شود." });
}
