import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const listings = await prisma.listing.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      city: true,
      status: true,
      listingType: true,
      propertyType: true,
      price: true,
      currency: true,
      createdAt: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          decision: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      listings: listings.map((listing) => ({
        ...listing,
        price: listing.price.toString(),
        imageUrl: listing.images[0]?.url ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}