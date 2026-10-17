import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "../../../src/lib/rate-limit";
import { prisma } from "../../../src/lib/prisma";
import { getCurrentUser } from "../../../src/lib/auth";
import { listingSchema } from "@real-estate/shared";

export async function POST(request: Request) {
  const limit = await checkRateLimit("create-listing", getRequestIdentity(request));
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  try {
    // Prevent cross-origin browser submissions.
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return NextResponse.json(
        { error: "مبدأ درخواست معتبر نیست." },
        { status: 403 },
      );
    }

    // Ownership must come from the verified session.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "برای ثبت آگهی ابتدا وارد حساب شوید." },
        { status: 401 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json(
        { error: "فرمت درخواست باید FormData باشد." },
        { status: 415 },
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "اطلاعات ارسال‌شده قابل خواندن نیست." },
        { status: 400 },
      );
    }

    const rawInput = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      listingType: String(formData.get("listingType") ?? ""),
      propertyType: String(formData.get("propertyType") ?? ""),
      price: Number(formData.get("price")),
      currency: String(formData.get("currency") ?? "RUB"),
      area: Number(formData.get("area")),
      rooms:
        formData.get("rooms") === null || formData.get("rooms") === ""
          ? null
          : Number(formData.get("rooms")),
      city: String(formData.get("city") ?? ""),
      address: String(formData.get("address") ?? "").trim() || null,
      latitude: null,
      longitude: null,
      imageUrls: [],
    };

    const validation = listingSchema.safeParse(rawInput);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "اطلاعات فرم معتبر نیست.",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const floorValue = formData.get("floor");
    const totalFloorsValue = formData.get("totalFloors");

    const floor =
      floorValue === null || floorValue === ""
        ? null
        : Number(floorValue);

    const totalFloors =
      totalFloorsValue === null || totalFloorsValue === ""
        ? null
        : Number(totalFloorsValue);

    if (
      (floor !== null && (!Number.isInteger(floor) || floor < 0)) ||
      (totalFloors !== null &&
        (!Number.isInteger(totalFloors) || totalFloors < 1)) ||
      (floor !== null &&
        totalFloors !== null &&
        floor > totalFloors)
    ) {
      return NextResponse.json(
        { error: "اطلاعات طبقه معتبر نیست." },
        { status: 400 },
      );
    }

    const listing = await prisma.listing.create({
      data: {
        title: validation.data.title,
        description: validation.data.description,
        listingType: validation.data.listingType,
        propertyType: validation.data.propertyType,
        price: validation.data.price,
        currency: validation.data.currency,
        area: validation.data.area,
        rooms: validation.data.rooms,
        city: validation.data.city,
        address: validation.data.address,
        latitude: validation.data.latitude,
        longitude: validation.data.longitude,
        floor,
        totalFloors,
        ownerId: user.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        ownerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "آگهی ثبت شد و منتظر تأیید مدیر است.",
        listing,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create listing failed:", error);

    return NextResponse.json(
      { error: "خطای داخلی هنگام ثبت آگهی." },
      { status: 500 },
    );
  }
}