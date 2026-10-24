import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "../../../../../src/lib/rate-limit";
import { getCurrentUser } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: Context) {
  const limit = await checkRateLimit(
    "delete-own-listing",
    getRequestIdentity(request),
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;

  if (!origin || origin !== requestOrigin) {
    return NextResponse.json(
      { error: "مبدأ درخواست معتبر نیست." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه آگهی معتبر نیست." },
      { status: 400 },
    );
  }

  const imageRows = await prisma.listingImage.findMany({
    where: { listingId: id, listing: { ownerId: user.id } },
    select: { url: true },
  });
  const result = await prisma.listing.deleteMany({
    where: { id, ownerId: user.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "آگهی پیدا نشد یا اجازه حذف آن را ندارید." },
      { status: 404 },
    );
  }

  const uploadDir = process.env.LISTING_UPLOAD_DIR || path.join(process.cwd(), ".data", "listing-uploads");
  await Promise.all(imageRows.map(async (image) => {
    const match = /^\/api\/listing-images\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i.exec(image.url);
    if (match) await unlink(path.join(uploadDir, path.basename(match[1]))).catch(() => undefined);
  }));

  return NextResponse.json({ message: "آگهی با موفقیت حذف شد." });
}

import { listingSchema } from "@real-estate/shared";

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه نامعتبر است." },
      { status: 400 },
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      listingType: true,
      propertyType: true,
      price: true,
      currency: true,
      area: true,
      rooms: true,
      floor: true,
      totalFloors: true,
      yearBuilt: true, bathrooms: true, parkingSpaces: true, hasElevator: true, hasStorage: true,
      heatingType: true, coolingType: true, documentType: true, orientation: true, naturalLight: true,
      furnished: true, readyToMove: true, balcony: true, terrace: true, garden: true, amenities: true,
      monthlyRent: true, deposit: true, allowDepositConversion: true, advertiserType: true, showExactLocation: true,
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, sortOrder: true, altText: true } },
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      status: true,
    },
  });

  if (!listing) {
    return NextResponse.json(
      { error: "آگهی پیدا نشد." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      listing: {
        ...listing,
        price: listing.price.toString(),
        area: listing.area.toString(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request, context: Context) {
  const limit = await checkRateLimit(
    "update-own-listing",
    getRequestIdentity(request),
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;

  if (!origin || origin !== requestOrigin) {
    return NextResponse.json(
      { error: "مبدأ درخواست معتبر نیست." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه نامعتبر است." },
      { status: 400 },
    );
  }

  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json(
      { error: "فرمت درخواست معتبر نیست." },
      { status: 415 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON معتبر نیست." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "اطلاعات درخواست معتبر نیست." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const allowedKeys = new Set([
    "title", "description", "listingType", "propertyType",
    "price", "currency", "area", "rooms", "city", "address",
    "latitude", "longitude", "floor", "totalFloors", "yearBuilt", "bathrooms", "parkingSpaces",
    "hasElevator", "hasStorage", "heatingType", "coolingType", "documentType", "orientation", "naturalLight",
    "furnished", "readyToMove", "balcony", "terrace", "garden", "amenities", "monthlyRent", "deposit",
    "allowDepositConversion", "advertiserType", "showExactLocation",
  ]);

  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return NextResponse.json(
      { error: "فیلد غیرمجاز در درخواست وجود دارد." },
      { status: 400 },
    );
  }

  const validation = listingSchema.safeParse({
    ...input,
    imageUrls: [],
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "اطلاعات فرم معتبر نیست.",
        details: validation.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { floor, totalFloors } = input;

  const validFloor =
    floor === null ||
    (typeof floor === "number" && Number.isInteger(floor) && floor >= 0);

  const validTotalFloors =
    totalFloors === null ||
    (typeof totalFloors === "number" &&
      Number.isInteger(totalFloors) && totalFloors >= 1);

  if (
    !validFloor ||
    !validTotalFloors ||
    floor === undefined ||
    totalFloors === undefined ||
    (typeof floor === "number" &&
      typeof totalFloors === "number" &&
      floor > totalFloors)
  ) {
    return NextResponse.json(
      { error: "اطلاعات طبقه معتبر نیست." },
      { status: 400 },
    );
  }

  const data = validation.data;

  const result = await prisma.listing.updateMany({
    where: { id, ownerId: user.id },
    data: {
      title: data.title,
      description: data.description,
      listingType: data.listingType,
      propertyType: data.propertyType,
      price: data.price,
      currency: data.currency,
      area: data.area,
      rooms: data.rooms,
      city: data.city,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      floor: floor as number | null,
      totalFloors: totalFloors as number | null,
      yearBuilt: data.yearBuilt ?? null, bathrooms: data.bathrooms ?? null, parkingSpaces: data.parkingSpaces ?? null,
      hasElevator: data.hasElevator ?? null, hasStorage: data.hasStorage ?? null,
      heatingType: data.heatingType ?? null, coolingType: data.coolingType ?? null, documentType: data.documentType ?? null,
      orientation: data.orientation ?? null, naturalLight: data.naturalLight ?? null,
      furnished: data.furnished ?? null, readyToMove: data.readyToMove ?? null, balcony: data.balcony ?? null,
      terrace: data.terrace ?? null, garden: data.garden ?? null, amenities: data.amenities,
      monthlyRent: data.monthlyRent ?? null, deposit: data.deposit ?? null,
      allowDepositConversion: data.allowDepositConversion, advertiserType: data.advertiserType, showExactLocation: data.showExactLocation,
      status: "PENDING",
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "آگهی پیدا نشد یا متعلق به شما نیست." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "تغییرات ذخیره شد و آگهی منتظر تأیید مجدد است.",
    id,
    status: "PENDING",
  });
}