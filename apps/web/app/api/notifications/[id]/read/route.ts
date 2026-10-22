import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "مبدأ درخواست نامعتبر است." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const { id } = await context.params;
  const result = await prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ success: true, updated: result.count }, { headers: { "Cache-Control": "private, no-store" } });
}
