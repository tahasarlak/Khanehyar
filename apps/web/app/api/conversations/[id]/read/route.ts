import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("read-conversation", getRequestIdentity(request));
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "مبدأ درخواست نامعتبر است." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const { id } = await context.params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: "مکالمه پیدا نشد." }, { status: 404 });

  const result = await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ success: true, updated: result.count }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
