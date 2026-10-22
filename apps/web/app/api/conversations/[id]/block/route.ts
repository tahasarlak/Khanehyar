import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";

type Context = { params: Promise<{ id: string }> };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("block-conversation-user", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 10 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  const { id } = await context.params;
  const conversation = await prisma.conversation.findFirst({ where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] }, select: { buyerId: true, sellerId: true } });
  if (!conversation) return json({ error: "مکالمه پیدا نشد." }, 404);
  const blockedId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  if (blockedId === user.id) return json({ error: "امکان مسدودسازی خودتان وجود ندارد." }, 400);
  await prisma.blockedUser.upsert({ where: { blockerId_blockedId: { blockerId: user.id, blockedId } }, create: { blockerId: user.id, blockedId, reason: "مسدودسازی از داخل پیام‌رسان" }, update: {} });
  return json({ success: true });
}
export async function DELETE(request: NextRequest, context: Context) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  const { id } = await context.params;
  const conversation = await prisma.conversation.findFirst({ where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] }, select: { buyerId: true, sellerId: true } });
  if (!conversation) return json({ error: "مکالمه پیدا نشد." }, 404);
  const blockedId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  await prisma.blockedUser.deleteMany({ where: { blockerId: user.id, blockedId } });
  return json({ success: true });
}
