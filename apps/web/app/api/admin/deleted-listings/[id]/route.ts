import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getCurrentUser } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["RESTORE", "PERMANENT_DELETE"]), reason: z.string().trim().min(5).max(1000) }).strict();
export async function POST(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "دسترسی مدیر لازم است." }, { status: 403 });
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "شناسه آگهی معتبر نیست." }, { status: 400 });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return NextResponse.json({ error: "درخواست باید JSON باشد." }, { status: 415 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON نامعتبر است." }, { status: 400 }); }
  const parsed = schema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "عملیات و دلیل معتبر لازم است." }, { status: 400 });
  const { action, reason } = parsed.data;
  if (action === "RESTORE") {
    const restored = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findFirst({ where: { id, deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true, deleteExpiresAt: true, status: true } });
      if (!listing) return false;
      const changed = await tx.listing.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null, deleteExpiresAt: null, deletedById: null } });
      if (changed.count !== 1) return false;
      await tx.listingAuditLog.create({ data: { listingId: id, listingTitle: listing.title, actorId: user.id, actorRole: user.role, action: "RESTORED", reason, before: { deletedAt: listing.deletedAt?.toISOString() ?? null, deleteExpiresAt: listing.deleteExpiresAt?.toISOString() ?? null }, after: { status: listing.status } } });
      return true;
    });
    if (!restored) return NextResponse.json({ error: "آگهی حذف‌شده پیدا نشد." }, { status: 404 });
    return NextResponse.json({ message: "آگهی توسط مدیر بازیابی شد." });
  }
  const deletionCandidate = await prisma.listing.findFirst({ where: { id, deletedAt: { not: null } }, select: { deleteExpiresAt: true } });
  if (!deletionCandidate) return NextResponse.json({ error: "آگهی حذف‌شده پیدا نشد." }, { status: 404 });
  if (deletionCandidate.deleteExpiresAt && deletionCandidate.deleteExpiresAt > new Date()) {
    return NextResponse.json({ error: "حذف دائمی فقط پس از پایان مهلت ۷ روزه مجاز است." }, { status: 409 });
  }
  const uploadDir = process.env.LISTING_UPLOAD_DIR || path.join(process.cwd(), ".data", "listing-uploads");
  const deleted = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({ where: { id, deletedAt: { not: null } }, select: { id: true, title: true, status: true, deletedAt: true, deleteExpiresAt: true, images: { select: { url: true } } } });
    if (!listing) return null;
    await tx.listingAuditLog.create({ data: { listingId: id, listingTitle: listing.title, actorId: user.id, actorRole: user.role, action: "PERMANENTLY_DELETED", reason, before: { status: listing.status, deletedAt: listing.deletedAt?.toISOString() ?? null, deleteExpiresAt: listing.deleteExpiresAt?.toISOString() ?? null }, after: { permanentlyDeleted: true } } });
    await tx.listing.delete({ where: { id } });
    return listing.images.map((image) => image.url);
  });
  if (!deleted) return NextResponse.json({ error: "آگهی حذف‌شده پیدا نشد." }, { status: 404 });
  await Promise.all(deleted.map(async (url) => { const match = /^\/api\/listing-images\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i.exec(url); if (match) await unlink(path.join(uploadDir, path.basename(match[1]))).catch(() => undefined); }));
  return NextResponse.json({ message: "آگهی و اطلاعات وابسته حذف دائمی شدند؛ سابقهٔ حسابرسی نگهداری شد." });
}
