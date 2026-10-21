import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(
    "mark-messages-read",
    getRequestIdentity(request),
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  const origin = request.headers.get("origin");

  if (origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "مبدأ درخواست نامعتبر است." },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "برای انجام این عملیات وارد شوید." },
      { status: 401 }
    );
  }

  if (
    !(request.headers.get("content-type") || "").includes(
      "application/json"
    )
  ) {
    return NextResponse.json(
      { error: "فرمت درخواست معتبر نیست." },
      { status: 415 }
    );
  }

  const size = Number(
    request.headers.get("content-length") || "0"
  );

  if (!Number.isFinite(size) || size > 2048) {
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
      { error: "درخواست قابل خواندن نیست." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("listingId" in body) ||
    !("counterpartId" in body) ||
    typeof body.listingId !== "string" ||
    typeof body.counterpartId !== "string"
  ) {
    return NextResponse.json(
      { error: "اطلاعات مکالمه نامعتبر است." },
      { status: 400 }
    );
  }

  const listingId = body.listingId;
  const counterpartId = body.counterpartId;

  if (
    !listingId ||
    !counterpartId ||
    listingId.length > 100 ||
    counterpartId.length > 100 ||
    counterpartId === user.id
  ) {
    return NextResponse.json(
      { error: "شناسه‌های مکالمه نامعتبرند." },
      { status: 400 }
    );
  }

  // Never trust a recipientId supplied by the browser.
  // The authenticated user must be the recipient.
  const result = await prisma.inquiry.updateMany({
    where: {
      listingId,
      senderId: counterpartId,
      recipientId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  const conversation = await prisma.conversation.findFirst({
    where: {
      listingId,
      OR: [
        { buyerId: user.id, sellerId: counterpartId },
        { sellerId: user.id, buyerId: counterpartId },
      ],
    },
    select: { id: true },
  });
  const nativeResult = conversation ? await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: counterpartId, readAt: null },
    data: { readAt: new Date() },
  }) : { count: 0 };

  return NextResponse.json(
    { success: true, updated: result.count + nativeResult.count },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}