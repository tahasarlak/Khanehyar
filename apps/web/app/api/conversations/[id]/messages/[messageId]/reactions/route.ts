import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";

type Context = { params: Promise<{ id: string; messageId: string }> };
const ALLOWED_EMOJI = new Set(["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🙏", "😍", "🏡"]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("toggle-message-reaction", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 90 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);

  const user = await getCurrentUser();
  if (!user) return json({ error: "برای واکنش به پیام وارد حساب شوید." }, 401);

  const { id, messageId } = await context.params;
  if (!id || id.length > 100 || !messageId || messageId.length > 100) return json({ error: "شناسه پیام نامعتبر است." }, 400);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  const emoji = body && typeof body === "object" && "emoji" in body && typeof body.emoji === "string" ? body.emoji : "";
  if (!ALLOWED_EMOJI.has(emoji)) return json({ error: "این واکنش پشتیبانی نمی‌شود." }, 400);

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: id, deletedAt: null, conversation: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } },
    select: { id: true },
  });
  if (!message) return json({ error: "پیام پیدا نشد یا دسترسی مجاز نیست." }, 404);

  // Enforce one active reaction per user per message. Selecting the same emoji
  // toggles it off; selecting a different emoji replaces the user's previous one.
  try {
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId: user.id } },
      select: { id: true, emoji: true },
    });

    if (existing?.emoji === emoji) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.messageReaction.update({
        where: { id: existing.id },
        data: { emoji, createdAt: new Date() },
      });
    } else {
      await prisma.messageReaction.create({ data: { messageId, userId: user.id, emoji } });
    }
  } catch (error) {
    // Concurrent taps are rare; recover from the unique index instead of
    // ever allowing a second reaction row for this user/message pair.
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
    const current = await prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId: user.id } },
      select: { id: true, emoji: true },
    });
    if (current && current.emoji !== emoji) {
      await prisma.messageReaction.update({ where: { id: current.id }, data: { emoji, createdAt: new Date() } });
    } else if (!current) {
      await prisma.messageReaction.create({ data: { messageId, userId: user.id, emoji } });
    }
  }

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });
  const summary = Object.values(reactions.reduce<Record<string, { emoji: string; count: number; reacted: boolean }>>((acc, item) => {
    const row = acc[item.emoji] ?? (acc[item.emoji] = { emoji: item.emoji, count: 0, reacted: false });
    row.count += 1;
    if (item.userId === user.id) row.reacted = true;
    return acc;
  }, {}));
  return json({ success: true, reactions: summary });
}
