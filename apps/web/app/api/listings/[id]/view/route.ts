import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };

function tehranDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function POST(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const limit = await checkRateLimit("listing-view", getRequestIdentity(request), { windowMs: 15 * 60 * 1000, maxAttempts: 60 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "شناسه آگهی معتبر نیست." }, { status: 400 });

  const result = await prisma.listing.updateMany({ where: { id, status: "PUBLISHED", deletedAt: null }, data: { viewCount: { increment: 1 } } });
  if (!result.count) return NextResponse.json({ error: "آگهی در دسترس نیست." }, { status: 404 });

  const date = tehranDateKey();
  await prisma.listingDailyView.upsert({
    where: { listingId_date: { listingId: id, date } },
    create: { listingId: id, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  const listing = await prisma.listing.findUnique({ where: { id }, select: { viewCount: true } });
  const today = await prisma.listingDailyView.findUnique({ where: { listingId_date: { listingId: id, date } }, select: { count: true } });
  return NextResponse.json({ viewCount: listing?.viewCount ?? 0, todayViewCount: today?.count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
