import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const latest = await prisma.kycVerification.findFirst({ where: { userId: user.id }, orderBy: { submittedAt: "desc" }, select: { id: true, status: true, fullName: true, nationalIdLast4: true, phone: true, note: true, rejectionReason: true, submittedAt: true, reviewedAt: true } });
  return NextResponse.json({ verification: latest }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "درخواست معتبر نیست." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "اطلاعات نامعتبر است." }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const fullName = typeof input.fullName === "string" ? input.fullName.trim().slice(0, 160) : "";
  const nationalIdLast4 = typeof input.nationalIdLast4 === "string" ? input.nationalIdLast4.replace(/\D/g, "").slice(-4) : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().slice(0, 30) : "";
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 1000) : "";
  if (fullName.length < 3 || (nationalIdLast4 && nationalIdLast4.length !== 4)) return NextResponse.json({ error: "نام کامل و چهار رقم پایانی کد ملی را درست وارد کن." }, { status: 400 });
  const latest = await prisma.kycVerification.findFirst({ where: { userId: user.id }, orderBy: { submittedAt: "desc" }, select: { id: true, status: true } });
  if (latest?.status === "PENDING") return NextResponse.json({ error: "درخواست احراز هویت شما در حال بررسی است." }, { status: 409 });
  if (latest?.status === "APPROVED") return NextResponse.json({ error: "احراز هویت شما قبلاً تأیید شده است." }, { status: 409 });
  const verification = await prisma.kycVerification.create({ data: { userId: user.id, fullName, nationalIdLast4: nationalIdLast4 || null, phone: phone || null, note: note || null, status: "PENDING" }, select: { id: true, status: true, submittedAt: true } });
  return NextResponse.json({ verification }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
