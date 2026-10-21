import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

type Context = { params: Promise<{ id: string }> };


export async function GET(_request: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "شناسه مکالمه نامعتبر است." }, { status: 400 });
  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: "مکالمه پیدا نشد یا دسترسی مجاز نیست." }, { status: 404 });
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: { id: true, body: true, senderId: true, createdAt: true, readAt: true },
  });
  return NextResponse.json({
    messages: messages.reverse().map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("send-conversation-message", getRequestIdentity(request));
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "مبدأ درخواست نامعتبر است." }, { status: 403 });
  }
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return NextResponse.json({ error: "نوع درخواست نامعتبر است." }, { status: 415 });
  }
  const size = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(size) || size > 4096) {
    return NextResponse.json({ error: "درخواست بیش از حد بزرگ است." }, { status: 413 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "برای ارسال پیام وارد حساب شوید." }, { status: 401 });

  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "شناسه مکالمه نامعتبر است." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "متن درخواست معتبر نیست." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("message" in body) || typeof body.message !== "string") {
    return NextResponse.json({ error: "متن پیام الزامی است." }, { status: 400 });
  }
  const message = body.message.trim();
  if (message.length < 1 || message.length > 2000) {
    return NextResponse.json({ error: "پیام باید بین ۱ تا ۲۰۰۰ کاراکتر باشد." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: { id: true, listingId: true, buyerId: true, sellerId: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "مکالمه پیدا نشد یا دسترسی مجاز نیست." }, { status: 404 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.message.count({
    where: { senderId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= 30) {
    return NextResponse.json({ error: "سقف ارسال پیام در این ساعت تکمیل شده است." }, { status: 429 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const messageRecord = await tx.message.create({
      data: { conversationId: conversation.id, senderId: user.id, body: message },
      select: { id: true, body: true, senderId: true, createdAt: true, readAt: true },
    });
    await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return messageRecord;
  });

  return NextResponse.json(
    { success: true, message: { ...created, createdAt: created.createdAt.toISOString(), readAt: created.readAt?.toISOString() ?? null } },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
