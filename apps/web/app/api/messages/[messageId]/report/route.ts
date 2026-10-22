import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";

type Context = { params: Promise<{ messageId: string }> };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("report-chat-message", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 8 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  const { messageId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  const reason = body && typeof body === "object" && "reason" in body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 5 || reason.length > 1000) return json({ error: "دلیل گزارش باید بین ۵ تا ۱۰۰۰ کاراکتر باشد." }, 400);
  const message = await prisma.message.findFirst({ where: { id: messageId, conversation: { is: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } } }, select: { id: true, senderId: true } });
  if (!message || message.senderId === user.id) return json({ error: "پیام برای گزارش معتبر نیست." }, 404);
  try {
    await prisma.messageReport.create({ data: { reporterId: user.id, messageId, reason } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return json({ error: "این پیام را قبلاً گزارش کرده‌اید." }, 409);
    throw error;
  }
  return json({ success: true }, 201);
}
