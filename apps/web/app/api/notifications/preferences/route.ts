import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { emailNotificationsEnabled: true } });
  return NextResponse.json({ emailNotificationsEnabled: row?.emailNotificationsEnabled ?? true }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function PATCH(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "مبدأ درخواست نامعتبر است." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("emailNotificationsEnabled" in body) || typeof body.emailNotificationsEnabled !== "boolean") return NextResponse.json({ error: "تنظیم اعلان ایمیلی نامعتبر است." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { emailNotificationsEnabled: body.emailNotificationsEnabled } });
  return NextResponse.json({ success: true, emailNotificationsEnabled: body.emailNotificationsEnabled }, { headers: { "Cache-Control": "private, no-store" } });
}
