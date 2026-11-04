import { NextResponse } from "next/server";
import { ListingStatus, Prisma } from "@prisma/client";
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

  const deletedAt = new Date();
  const deleteExpiresAt = new Date(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({
      where: { id, ownerId: user.id, deletedAt: null },
      select: { id: true, title: true, status: true, price: true, city: true, updatedAt: true },
    });
    if (!listing) return false;

    const changed = await tx.listing.updateMany({
      where: { id, ownerId: user.id, deletedAt: null },
      data: { deletedAt, deleteExpiresAt, deletedById: user.id },
    });
    if (changed.count !== 1) return false;

    await tx.listingAuditLog.create({
      data: {
        listingId: id,
        listingTitle: listing.title,
        actorId: user.id,
        actorRole: user.role,
        action: "DELETED",
        reason: "حذف توسط مالک؛ امکان بازیابی مالک تا ۷ روز",
        before: { status: listing.status, price: listing.price.toString(), city: listing.city, updatedAt: listing.updatedAt.toISOString() },
        after: { deletedAt: deletedAt.toISOString(), deleteExpiresAt: deleteExpiresAt.toISOString() },
      },
    });
    return true;
  });

  if (!result) {
    return NextResponse.json(
      { error: "آگهی پیدا نشد یا اجازه حذف آن را ندارید." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "آگهی حذف شد. تا ۷ روز می‌توانید آن را بازیابی کنید.",
    deletedAt: deletedAt.toISOString(),
    deleteExpiresAt: deleteExpiresAt.toISOString(),
  });
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
    where: { id, ownerId: user.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      listingType: true,
      propertyType: true,
      urgentSale: true, rentalPeriod: true,
      price: true,
      currency: true,
      area: true,
      rooms: true,
      floor: true,
      totalFloors: true,
      yearBuilt: true, bathrooms: true, parkingSpaces: true, hasElevator: true, hasStorage: true,
      heatingType: true, coolingType: true, documentType: true, orientation: true, naturalLight: true,
      furnished: true, ceilingHeight: true, architecturalStyle: true, windowView: true, furnishedItems: true, accessibilitySuitable: true, accessibilityFeatures: true, buildingType: true, constructionStatus: true, structureType: true, facadeType: true, elevatorCount: true, unitCount: true, parkingType: true, serviceCharge: true, commission: true, advancePayment: true, minimumContractMonths: true, petsAllowed: true, familyOnly: true, smokingAllowed: true, priceNegotiable: true, readyToMove: true, balcony: true, terrace: true, garden: true, amenities: true,
      monthlyRent: true, deposit: true, allowDepositConversion: true, advertiserType: true, showExactLocation: true, showOnMap: true,
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, sortOrder: true, label: true, altText: true } },
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
    "title", "description", "listingType", "propertyType", "urgentSale", "rentalPeriod",
    "price", "currency", "area", "rooms", "city", "address",
    "latitude", "longitude", "floor", "totalFloors", "yearBuilt", "bathrooms", "parkingSpaces",
    "hasElevator", "hasStorage", "heatingType", "coolingType", "documentType", "orientation", "naturalLight",
    "furnished", "ceilingHeight", "architecturalStyle", "windowView", "furnishedItems", "accessibilitySuitable", "accessibilityFeatures", "buildingType", "constructionStatus", "structureType", "facadeType", "elevatorCount", "unitCount", "parkingType", "serviceCharge", "commission", "advancePayment", "minimumContractMonths", "petsAllowed", "familyOnly", "smokingAllowed", "priceNegotiable", "readyToMove", "balcony", "terrace", "garden", "amenities", "monthlyRent", "deposit",
    "allowDepositConversion", "advertiserType", "showExactLocation", "showOnMap",
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

  const updateData = {

      title: data.title,
      description: data.description,
      listingType: data.listingType,
      propertyType: data.propertyType,
      urgentSale: data.listingType === "SALE" && data.urgentSale,
      rentalPeriod: data.listingType === "RENT" ? (data.rentalPeriod ?? "LONG_TERM") : null,
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
      furnished: data.furnished ?? null, ceilingHeight: data.ceilingHeight ?? null, architecturalStyle: data.architecturalStyle ?? null, windowView: data.windowView ?? null, furnishedItems: data.furnishedItems, accessibilitySuitable: data.accessibilitySuitable ?? null, accessibilityFeatures: data.accessibilityFeatures, buildingType: data.buildingType ?? null, constructionStatus: data.constructionStatus ?? null, structureType: data.structureType ?? null, facadeType: data.facadeType ?? null, elevatorCount: data.elevatorCount ?? null, unitCount: data.unitCount ?? null, parkingType: data.parkingType ?? null, serviceCharge: data.serviceCharge ?? null, commission: data.commission ?? null, advancePayment: data.advancePayment ?? null, minimumContractMonths: data.minimumContractMonths ?? null, petsAllowed: data.petsAllowed ?? null, familyOnly: data.familyOnly ?? null, smokingAllowed: data.smokingAllowed ?? null, priceNegotiable: data.priceNegotiable, readyToMove: data.readyToMove ?? null, balcony: data.balcony ?? null,
      terrace: data.terrace ?? null, garden: data.garden ?? null, amenities: data.amenities,
      monthlyRent: data.monthlyRent ?? null, deposit: data.deposit ?? null,
      allowDepositConversion: data.allowDepositConversion, advertiserType: data.advertiserType, showExactLocation: data.showExactLocation, showOnMap: data.showOnMap,
      status: ListingStatus.PENDING,
    };

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.listing.findFirst({
      where: { id, ownerId: user.id, deletedAt: null },
    });
    if (!before) return false;
    const updated = await tx.listing.updateMany({
      where: { id, ownerId: user.id, deletedAt: null },
      data: updateData,
    });
    if (updated.count !== 1) return false;
    const beforeValues = JSON.parse(JSON.stringify(Object.fromEntries(
      Object.keys(updateData).map((key) => [key, (before as unknown as Record<string, unknown>)[key]]),
    ))) as Record<string, unknown>;
    const afterValues = JSON.parse(JSON.stringify(updateData)) as Record<string, unknown>;
    const changedFields = Object.keys(afterValues).filter(
      (key) => JSON.stringify(beforeValues[key]) !== JSON.stringify(afterValues[key]),
    );
    const beforeChanged = Object.fromEntries(changedFields.map((key) => [key, beforeValues[key]]));
    const afterChanged = Object.fromEntries(changedFields.map((key) => [key, afterValues[key]]));

    if (Number(before.price.toString()) !== Number(updateData.price) || before.currency !== updateData.currency) {
      await tx.listingPriceHistory.create({ data: { listingId: id, oldPrice: before.price, newPrice: new Prisma.Decimal(String(updateData.price)), oldCurrency: before.currency, newCurrency: String(updateData.currency) } });
    }

    await tx.listingAuditLog.create({
      data: {
        listingId: id,
        listingTitle: data.title,
        actorId: user.id,
        actorRole: user.role,
        action: "UPDATED",
        reason: "ویرایش آگهی توسط مالک؛ برای بررسی مجدد به صف بررسی بازگشت",
        before: JSON.parse(JSON.stringify({ changedFields, values: beforeChanged })) as Prisma.InputJsonValue,
        after: JSON.parse(JSON.stringify({ changedFields, values: afterChanged })) as Prisma.InputJsonValue,
      },
    });
    return true;
  });

  if (!result) {
    return NextResponse.json(
      { error: "آگهی پیدا نشد یا متعلق به شما نیست." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "تغییرات ذخیره شد و آگهی منتظر تأیید مجدد است.",
    id,
    status: ListingStatus.PENDING,
  });
}