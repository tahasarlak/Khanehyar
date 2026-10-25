import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const limit = await checkRateLimit("listing-view", getRequestIdentity(request), { windowMs: 15 * 60 * 1000, maxAttempts: 60 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "شناسه آگهی معتبر نیست." }, { status: 400 });
  const result = await prisma.listing.updateMany({ where: { id, status: "PUBLISHED", deletedAt: null }, data: { viewCount: { increment: 1 } } });
  if (!result.count) return NextResponse.json({ error: "آگهی در دسترس نیست." }, { status: 404 });
  const listing = await prisma.listing.findUnique({ where: { id }, select: { viewCount: true } });
  return NextResponse.json({ viewCount: listing?.viewCount ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
