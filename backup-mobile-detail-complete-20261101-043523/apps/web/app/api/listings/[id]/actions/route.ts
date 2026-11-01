import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
const reasons = new Set(["اطلاعات یا قیمت گمراه‌کننده است", "آگهی تکراری است", "تصاویر با ملک مطابقت ندارد", "ملک وجود ندارد یا فروخته شده است", "محتوای نامناسب یا مشکوک", "سایر موارد"]);

export async function GET(_request: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "برای استفاده از این امکانات وارد حساب شوید." }, 401);
  const { id } = await context.params;
  const listing = await prisma.listing.findFirst({ where: { id, status: "PUBLISHED", deletedAt: null }, select: { id: true } });
  if (!listing) return json({ error: "آگهی پیدا نشد." }, 404);
  const [note, saved, hidden] = await Promise.all([
    prisma.listingNote.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } }, select: { content: true } }),
    prisma.savedListingItem.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } }, select: { collectionName: true } }),
    prisma.hiddenListing.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } }, select: { id: true } }),
  ]);
  return json({ note: note?.content ?? "", saved: Boolean(saved), collectionName: saved?.collectionName ?? null, hidden: Boolean(hidden) });
}

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("listing-personal-actions", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 20 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "برای استفاده از این امکانات وارد حساب شوید." }, 401);
  const { id } = await context.params;
  const listing = await prisma.listing.findFirst({ where: { id, status: "PUBLISHED", deletedAt: null }, select: { id: true, ownerId: true } });
  if (!listing) return json({ error: "آگهی پیدا نشد." }, 404);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  if (!body || typeof body !== "object" || !("action" in body) || typeof body.action !== "string") return json({ error: "عملیات نامعتبر است." }, 400);
  const action = body.action;
  if (action === "note") {
    const content = "content" in body && typeof body.content === "string" ? body.content.trim() : "";
    if (content.length > 2000) return json({ error: "یادداشت حداکثر ۲۰۰۰ نویسه است." }, 400);
    if (!content) await prisma.listingNote.deleteMany({ where: { userId: user.id, listingId: id } });
    else await prisma.listingNote.upsert({ where: { userId_listingId: { userId: user.id, listingId: id } }, create: { userId: user.id, listingId: id, content }, update: { content } });
    return json({ success: true, note: content });
  }
  if (action === "save") {
    const enabled = "enabled" in body && body.enabled === true;
    const collectionName = "collectionName" in body && typeof body.collectionName === "string" ? body.collectionName.trim().slice(0,80) : "ذخیره‌شده‌ها";
    if (enabled) await prisma.savedListingItem.upsert({ where: { userId_listingId: { userId: user.id, listingId: id } }, create: { userId: user.id, listingId: id, collectionName: collectionName || "ذخیره‌شده‌ها" }, update: { collectionName: collectionName || "ذخیره‌شده‌ها" } });
    else await prisma.savedListingItem.deleteMany({ where: { userId: user.id, listingId: id } });
    return json({ success: true, saved: enabled, collectionName: enabled ? (collectionName || "ذخیره‌شده‌ها") : null });
  }
  if (action === "hide") {
    const enabled = "enabled" in body && body.enabled === true;
    if (enabled) await prisma.hiddenListing.upsert({ where: { userId_listingId: { userId: user.id, listingId: id } }, create: { userId: user.id, listingId: id }, update: {} });
    else await prisma.hiddenListing.deleteMany({ where: { userId: user.id, listingId: id } });
    return json({ success: true, hidden: enabled });
  }
  if (action === "report") {
    const reason = "reason" in body && typeof body.reason === "string" ? body.reason.trim() : "";
    const details = "details" in body && typeof body.details === "string" ? body.details.trim() : "";
    if (!reasons.has(reason) || details.length > 1000) return json({ error: "دلیل یا توضیحات گزارش معتبر نیست." }, 400);
    if (listing.ownerId === user.id) return json({ error: "نمی‌توانید آگهی خودتان را گزارش کنید." }, 400);
    try { await prisma.listingReport.create({ data: { reporterId: user.id, listingId: id, reason, details: details || null } }); }
    catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return json({ error: "این آگهی را قبلاً گزارش کرده‌اید." }, 409); throw error; }
    return json({ success: true }, 201);
  }
  return json({ error: "عملیات پشتیبانی نمی‌شود." }, 400);
}
