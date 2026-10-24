import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "دسترسی مدیر لازم است." }, { status: 403 });
  const listings = await prisma.listing.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 200, select: { id: true, title: true, city: true, status: true, deletedAt: true, deleteExpiresAt: true, owner: { select: { name: true, email: true } } } });
  return NextResponse.json({ listings }, { headers: { "Cache-Control": "no-store" } });
}
