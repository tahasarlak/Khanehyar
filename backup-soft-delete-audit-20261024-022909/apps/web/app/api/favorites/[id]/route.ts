import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

type Context = {
  params: Promise<{ id: string }>;
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) return false;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function GET(
  _request: NextRequest,
  context: Context
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ isFavorite: false });
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه آگهی نامعتبر است." },
      { status: 400 }
    );
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_listingId: {
        userId: user.id,
        listingId: id,
      },
    },
    select: { id: true },
  });

  return NextResponse.json({
    isFavorite: Boolean(favorite),
  });
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  const limit = await checkRateLimit(
    "favorite-add",
    getRequestIdentity(request),
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "مبدأ درخواست نامعتبر است." },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "برای ذخیره آگهی وارد حساب شوید." },
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

  const listing = await prisma.listing.findFirst({
    where: {
      id,
      status: "PUBLISHED",
    },
    select: { id: true },
  });

  if (!listing) {
    return NextResponse.json(
      { error: "آگهی در دسترس نیست." },
      { status: 404 }
    );
  }

  await prisma.favorite.upsert({
    where: {
      userId_listingId: {
        userId: user.id,
        listingId: id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      listingId: id,
    },
  });

  return NextResponse.json({ isFavorite: true });
}

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  const limit = await checkRateLimit(
    "favorite-remove",
    getRequestIdentity(request),
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "مبدأ درخواست نامعتبر است." },
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

  await prisma.favorite.deleteMany({
    where: {
      userId: user.id,
      listingId: id,
    },
  });

  return NextResponse.json({ isFavorite: false });
}