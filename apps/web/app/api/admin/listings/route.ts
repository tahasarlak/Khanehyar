import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      { status: 401 },
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "دسترسی مدیر لازم است." },
      { status: 403 },
    );
  }

  const listings = await prisma.listing.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      listingType: true,
      propertyType: true,
      city: true,
      address: true,
      price: true,
      currency: true,
      area: true,
      rooms: true,
      floor: true,
      totalFloors: true,
      createdAt: true,
      owner: {
        select: {
          name: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      listings: listings.map((listing) => ({
        ...listing,
        price: listing.price.toString(),
        area: listing.area.toString(),
      })),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}