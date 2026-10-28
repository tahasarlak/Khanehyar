import { NextResponse } from "next/server";
import { PropertyType, type Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 6;
const MAX_OFFSET = 5000;
const propertyTypes = new Set(["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL"]);
const sortOptions = new Set(["newest", "price_asc", "price_desc", "area_desc"]);

function numericParam(value: string | null, maxDigits: number): string | null {
  if (!value || !new RegExp(`^\\d{1,${maxDigits}}$`).test(value)) return null;
  return String(Number(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawOffset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,4}$/.test(rawOffset)) {
    return NextResponse.json({ error: "محدودهٔ درخواست معتبر نیست." }, { status: 400 });
  }
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return NextResponse.json({ error: "محدودهٔ درخواست معتبر نیست." }, { status: 400 });
  }
  if (offset > MAX_OFFSET) {
    return NextResponse.json({ listings: [], hasMore: false, nextOffset: MAX_OFFSET }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const city = (url.searchParams.get("city") ?? "").trim().slice(0, 100);
  const dealValue = url.searchParams.get("deal") ?? "";
  const propertyValue = url.searchParams.get("property") ?? "";
  const sortValue = url.searchParams.get("sort") ?? "newest";
  const minPrice = numericParam(url.searchParams.get("minPrice"), 12);
  const maxPrice = numericParam(url.searchParams.get("maxPrice"), 12);
  const minArea = numericParam(url.searchParams.get("minArea"), 8);
  const maxArea = numericParam(url.searchParams.get("maxArea"), 8);
  const roomsRaw = numericParam(url.searchParams.get("rooms"), 2);
  const rooms = roomsRaw && Number(roomsRaw) <= 30 ? Number(roomsRaw) : null;

  const where: Prisma.ListingWhereInput = { status: "PUBLISHED", deletedAt: null };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (dealValue === "SALE" || dealValue === "RENT") where.listingType = dealValue;
  if (propertyTypes.has(propertyValue)) where.propertyType = propertyValue as PropertyType;
  if (minPrice || maxPrice) where.price = { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) };
  if (minArea || maxArea) where.area = { ...(minArea ? { gte: minArea } : {}), ...(maxArea ? { lte: maxArea } : {}) };
  if (rooms !== null) where.rooms = { gte: rooms };

  let orderBy: Prisma.ListingOrderByWithRelationInput[];
  switch (sortOptions.has(sortValue) ? sortValue : "newest") {
    case "price_asc": orderBy = [{ price: "asc" }, { id: "desc" }]; break;
    case "price_desc": orderBy = [{ price: "desc" }, { id: "desc" }]; break;
    case "area_desc": orderBy = [{ area: "desc" }, { id: "desc" }]; break;
    default: orderBy = [{ createdAt: "desc" }, { id: "desc" }];
  }

  try {
    const rows = await prisma.listing.findMany({
      where,
      orderBy,
      skip: offset,
      take: PAGE_SIZE + 1,
      select: {
        id: true, title: true, city: true, area: true, price: true, currency: true,
        rooms: true, propertyType: true, listingType: true, urgentSale: true,
        rentalPeriod: true, viewCount: true,
        images: { take: 1, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { url: true } },
      },
    });
    const hasMore = rows.length > PAGE_SIZE;
    const listings = rows.slice(0, PAGE_SIZE).map((item) => ({
      ...item,
      area: item.area.toString(),
      price: item.price.toString(),
    }));
    return NextResponse.json({ listings, hasMore, nextOffset: offset + listings.length }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Public search feed failed:", error);
    return NextResponse.json({ error: "بارگذاری آگهی‌های بیشتر موقتاً ممکن نیست. دوباره تلاش کن." }, { status: 500 });
  }
}
