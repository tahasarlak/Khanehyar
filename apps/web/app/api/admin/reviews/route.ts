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

  const reviews = await prisma.listingReview.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      decision: true,
      reason: true,
      createdAt: true,
      reviewer: {
        select: { name: true, email: true },
      },
      listing: {
        select: { id: true, title: true },
      },
    },
  });

  return NextResponse.json(
    { reviews },
    { headers: { "Cache-Control": "no-store" } },
  );
}