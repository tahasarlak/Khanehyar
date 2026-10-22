import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  if (user.role !== "ADMIN") return json({ error: "دسترسی مدیر لازم است." }, 403);
  const reports = await prisma.messageReport.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    select: {
      id: true, reason: true, status: true, createdAt: true,
      reporter: { select: { id: true, name: true, email: true } },
      message: { select: { id: true, body: true, createdAt: true, deletedAt: true, sender: { select: { id: true, name: true, email: true } }, conversation: { select: { id: true, listing: { select: { id: true, title: true } } } } } },
    },
  });
  return json({ reports });
}
export async function PATCH(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  if (user.role !== "ADMIN") return json({ error: "دسترسی مدیر لازم است." }, 403);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string" || !("status" in body) || !["RESOLVED", "DISMISSED", "OPEN"].includes(String(body.status))) return json({ error: "اطلاعات گزارش نامعتبر است." }, 400);
  const updated = await prisma.messageReport.updateMany({ where: { id: body.id }, data: { status: String(body.status) } });
  if (!updated.count) return json({ error: "گزارش پیدا نشد." }, 404);
  return json({ success: true });
}
