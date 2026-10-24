import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const now = new Date();
  const listings = await prisma.listing.findMany({
    where: { ownerId: user.id, deletedAt: { not: null }, deleteExpiresAt: { gt: now } },
    orderBy: { deletedAt: "desc" }, take: 100,
    select: { id: true, title: true, city: true, status: true, price: true, currency: true, deletedAt: true, deleteExpiresAt: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
  });
  return NextResponse.json({ listings: listings.map((x) => ({ ...x, price: x.price.toString(), imageUrl: x.images[0]?.url ?? null })) }, { headers: { "Cache-Control": "no-store" } });
}
