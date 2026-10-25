import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { sendNewMessageEmail } from "@/src/lib/messenger-email";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit(
    "create-inquiry",
    getRequestIdentity(request),
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  const origin = request.headers.get("origin");

  if (origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "مبدأ درخواست معتبر نیست." },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه آگهی نامعتبر است." },
      { status: 400 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > 4096) {
    return NextResponse.json(
      { error: "درخواست بیش‌ازحد بزرگ است." },
      { status: 413 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ساختار پیام نامعتبر است." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  // `action: open` creates or reuses the listing-specific chat without
  // sending a message. The first message is then written in the messenger.
  const openOnly = "action" in body && body.action === "open";
  let message = "";

  if (!openOnly) {
    if (!("message" in body) || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "متن پیام الزامی است." },
        { status: 400 }
      );
    }

    message = body.message.trim();
    if (message.length < 20 || message.length > 2000) {
      return NextResponse.json(
        { error: "متن پیام باید بین ۲۰ تا ۲۰۰۰ کاراکتر باشد." },
        { status: 400 }
      );
    }
  }

  const listing = await prisma.listing.findFirst({
    where: { id, status: "PUBLISHED", deletedAt: null },
    select: { id: true, ownerId: true },
  });

  if (!listing) {
    return NextResponse.json(
      { error: "آگهی در دسترس نیست." },
      { status: 404 }
    );
  }

  if (listing.ownerId === user.id) {
    return NextResponse.json(
      { error: "نمی‌توانید برای آگهی خودتان پیام بفرستید." },
      { status: 400 }
    );
  }

  const block = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: user.id, blockedId: listing.ownerId }, { blockerId: listing.ownerId, blockedId: user.id }] },
    select: { blockerId: true },
  });
  if (block) return NextResponse.json({ error: "ارسال پیام به این کاربر امکان‌پذیر نیست." }, { status: 403 });

  if (!openOnly) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMessages = await prisma.message.count({
      where: { senderId: user.id, createdAt: { gte: oneHourAgo } },
    });

    if (recentMessages >= 5) {
      return NextResponse.json(
        { error: "سقف ارسال پیام در این ساعت تکمیل شده است." },
        { status: 429 }
      );
    }
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      listingId_buyerId_sellerId: {
        listingId: listing.id,
        buyerId: user.id,
        sellerId: listing.ownerId,
      },
    },
    create: {
      listingId: listing.id,
      buyerId: user.id,
      sellerId: listing.ownerId,
    },
    update: { updatedAt: new Date() },
    select: { id: true },
  });

  if (!openOnly) {
    await prisma.$transaction(async (tx) => {
      await tx.message.create({ data: { conversationId: conversation.id, senderId: user.id, body: message } });
      await tx.notification.create({ data: { userId: listing.ownerId, type: "NEW_MESSAGE", title: "پیام جدید درباره یک ملک", body: message.slice(0, 450), href: `/dashboard/messages/${conversation.id}` } });
      await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    });
    await sendNewMessageEmail({ recipientId: listing.ownerId, conversationId: conversation.id, listingId: listing.id, preview: message });
  }

  return NextResponse.json(
    {
      success: true,
      conversationId: conversation.id,
      message: openOnly ? "گفت‌وگو آماده است." : "پیام با موفقیت ارسال شد.",
    },
    { status: openOnly ? 200 : 201, headers: { "Cache-Control": "private, no-store" } }
  );
}