import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/src/lib/auth";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";

type Context = { params: Promise<{ id: string; messageId: string }> };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
export async function PATCH(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("edit-chat-message", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 20 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  const { id, messageId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  const text = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message.trim() : "";
  if (!text || text.length > 2000) return json({ error: "پیام باید بین ۱ تا ۲۰۰۰ کاراکتر باشد." }, 400);
  const message = await prisma.message.findFirst({ where: { id: messageId, conversationId: id, senderId: user.id, deletedAt: null }, select: { id: true, createdAt: true } });
  if (!message) return json({ error: "پیام پیدا نشد یا امکان ویرایش آن وجود ندارد." }, 404);
  if (Date.now() - message.createdAt.getTime() > 15 * 60 * 1000) return json({ error: "ویرایش پیام فقط تا ۱۵ دقیقه پس از ارسال امکان‌پذیر است." }, 400);
  const updated = await prisma.message.update({ where: { id: messageId }, data: { body: text, editedAt: new Date() }, select: { id: true, body: true, editedAt: true } });
  return json({ success: true, message: { ...updated, editedAt: updated.editedAt?.toISOString() ?? null } });
}
export async function DELETE(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("delete-chat-message", getRequestIdentity(request), { windowMs: 60_000, maxAttempts: 20 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "مبدأ درخواست نامعتبر است." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);
  const { id, messageId } = await context.params;
  const message = await prisma.message.findFirst({ where: { id: messageId, conversationId: id, senderId: user.id, deletedAt: null }, select: { id: true, createdAt: true, attachmentUrl: true } });
  if (!message) return json({ error: "پیام پیدا نشد یا قبلاً حذف شده است." }, 404);
  if (Date.now() - message.createdAt.getTime() > 60 * 60 * 1000) return json({ error: "حذف پیام فقط تا یک ساعت پس از ارسال امکان‌پذیر است." }, 400);
  await prisma.message.update({ where: { id: messageId }, data: { body: "", deletedAt: new Date(), attachmentUrl: null, attachmentName: null, attachmentMime: null, attachmentSize: null } });
  if (message.attachmentUrl) {
    try {
      const key = new URL(message.attachmentUrl, request.nextUrl.origin).searchParams.get("key");
      if (key && /^[0-9a-f-]{36}\.(?:jpg|png|webp|pdf|webm|ogg|m4a|mp3|wav|mp4)$/i.test(key)) {
        const uploadDir = process.env.MESSAGE_UPLOAD_DIR || path.join(process.cwd(), ".data", "message-uploads");
        await unlink(path.join(uploadDir, path.basename(key)));
      }
    } catch { /* Message is already deleted; inaccessible orphan cleanup can be handled operationally. */ }
  }
  return json({ success: true });
}
