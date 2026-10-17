import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
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

  if (message.length < 20 || message.length > 2000) {
    return NextResponse.json(
      { error: "متن پیام باید بین ۲۰ تا ۲۰۰۰ کاراکتر باشد." },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id, status: "PUBLISHED" },
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

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentMessages = await prisma.inquiry.count({
    where: {
      senderId: user.id,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentMessages >= 5) {
    return NextResponse.json(
      { error: "سقف ارسال پیام در این ساعت تکمیل شده است." },
      { status: 429 }
    );
  }

  await prisma.inquiry.create({
    data: {
      listingId: listing.id,
      senderId: user.id,
      recipientId: listing.ownerId,
      message,
    },
  });

  return NextResponse.json(
    { success: true, message: "پیام با موفقیت ارسال شد." },
    { status: 201 }
  );
}