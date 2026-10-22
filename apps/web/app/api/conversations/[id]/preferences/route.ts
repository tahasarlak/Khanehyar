import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";

type Context = { params: Promise<{ id: string }> };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }

export async function PATCH(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("conversation-preference", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 30 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  const { id } = await context.params;
  const conversation = await prisma.conversation.findFirst({ where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] }, select: { id: true } });
  if (!conversation) return json({ error: "مکالمه پیدا نشد." }, 404);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "درخواست نامعتبر است." }, 400);
  const data = body as Record<string, unknown>;
  const update: { archivedAt?: Date | null; mutedUntil?: Date | null; pinnedAt?: Date | null } = {};
  if ("archived" in data) {
    if (typeof data.archived !== "boolean") return json({ error: "مقدار بایگانی نامعتبر است." }, 400);
    update.archivedAt = data.archived ? new Date() : null;
  }
  if ("muted" in data) {
    if (typeof data.muted !== "boolean") return json({ error: "مقدار بی‌صدا نامعتبر است." }, 400);
    update.mutedUntil = data.muted ? new Date("9999-12-31T23:59:59.000Z") : null;
  }
  if ("pinned" in data) {
    if (typeof data.pinned !== "boolean") return json({ error: "مقدار سنجاق نامعتبر است." }, 400);
    update.pinnedAt = data.pinned ? new Date() : null;
  }
  if (!Object.keys(update).length) return json({ error: "هیچ تغییری ارسال نشده است." }, 400);
  const preference = await prisma.conversationPreference.upsert({
    where: { userId_conversationId: { userId: user.id, conversationId: id } },
    create: { userId: user.id, conversationId: id, ...update },
    update,
    select: { archivedAt: true, mutedUntil: true, pinnedAt: true },
  });
  return json({ success: true, preference });
}
