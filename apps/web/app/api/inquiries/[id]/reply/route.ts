import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("reply-inquiry", getRequestIdentity(request));
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "مبدأ درخواست نامعتبر است." },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "برای پاسخ وارد حساب شوید." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه پیام نامعتبر است." },
      { status: 400 }
    );
  }

  const target = await prisma.inquiry.findUnique({
    where: { id },
    select: {
      id: true,
      listingId: true,
      senderId: true,
      recipientId: true,
    },
  });

  // Only the recipient of a message can reply to it.
  if (!target || target.recipientId !== user.id) {
    return NextResponse.json(
      { error: "پیام یافت نشد یا دسترسی مجاز نیست." },
      { status: 404 }
    );
  }

  if (target.senderId === user.id) {
    return NextResponse.json(
      { error: "امکان ارسال پاسخ به خودتان وجود ندارد." },
      { status: 400 }
    );
  }

  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "نوع درخواست نامعتبر است." },
      { status: 415 }
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") || "0"
  );

  if (contentLength > 4096) {
    return NextResponse.json(
      { error: "درخواست بیش از حد بزرگ است." },
      { status: 413 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "متن درخواست معتبر نیست." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("message" in body) ||
    typeof body.message !== "string"
  ) {
    return NextResponse.json(
      { error: "متن پیام الزامی است." },
      { status: 400 }
    );
  }

  const message = body.message.trim();

  if (message.length < 2 || message.length > 2000) {
    return NextResponse.json(
      { error: "پاسخ باید بین ۲ تا ۲۰۰۰ کاراکتر باشد." },
      { status: 400 }
    );
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentCount = await prisma.inquiry.count({
    where: {
      senderId: user.id,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount >= 5) {
    return NextResponse.json(
      { error: "سقف ارسال پیام در این ساعت تکمیل شده است." },
      { status: 429 }
    );
  }

  // Preserve the original listing and reverse sender/recipient.
  const reply = await prisma.inquiry.create({
    data: {
      listingId: target.listingId,
      senderId: user.id,
      recipientId: target.senderId,
      message,
    },
    select: { id: true },
  });

  return NextResponse.json(
    { success: true, id: reply.id },
    { status: 201 }
  );
}