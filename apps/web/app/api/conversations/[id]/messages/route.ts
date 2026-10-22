import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { sendNewMessageEmail } from "@/src/lib/messenger-email";

type Context = { params: Promise<{ id: string }> };

type ReactionSummary = { emoji: string; count: number; reacted: boolean };

function summarizeReactions(items: { emoji: string; userId: string }[], userId: string): ReactionSummary[] {
  const grouped: Record<string, ReactionSummary> = {};
  for (const item of items) {
    const entry = grouped[item.emoji] ?? (grouped[item.emoji] = { emoji: item.emoji, count: 0, reacted: false });
    entry.count += 1;
    if (item.userId === userId) entry.reacted = true;
  }
  return Object.values(grouped);
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function GET(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("read-conversation-messages", getRequestIdentity(request), { windowMs: 60 * 1000, maxAttempts: 120 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const user = await getCurrentUser();
  if (!user) return privateJson({ error: "ابتدا وارد حساب شوید." }, 401);

  const { id } = await context.params;
  if (!id || id.length > 100) return privateJson({ error: "شناسه مکالمه نامعتبر است." }, 400);

  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: { id: true },
  });
  if (!conversation) return privateJson({ error: "مکالمه پیدا نشد یا دسترسی مجاز نیست." }, 404);

  const before = request.nextUrl.searchParams.get("before");
  let cursor: { id: string } | undefined;
  if (before) {
    if (before.length > 100) return privateJson({ error: "نشانگر پیام نامعتبر است." }, 400);
    const cursorMessage = await prisma.message.findFirst({
      where: { id: before, conversationId: id },
      select: { id: true },
    });
    if (!cursorMessage) return privateJson({ error: "نشانگر پیام پیدا نشد." }, 400);
    cursor = { id: cursorMessage.id };
  }

  const rows = await prisma.message.findMany({
    where: { conversationId: id },
    ...(cursor ? { cursor, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 101,
    select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, editedAt: true, deletedAt: true, replyToId: true, attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true, reactions: { select: { emoji: true, userId: true } }, replyTo: { select: { id: true, body: true, senderId: true, deletedAt: true } } },
  });

  const hasMore = rows.length > 100;
  const messages = rows.slice(0, 100).reverse().map((item) => ({
    ...item,
    body: item.deletedAt ? "این پیام حذف شده است." : item.body,
    createdAt: item.createdAt.toISOString(),
    readAt: item.readAt?.toISOString() ?? null,
    editedAt: item.editedAt?.toISOString() ?? null,
    deletedAt: item.deletedAt?.toISOString() ?? null,
    replyTo: item.replyTo ? { ...item.replyTo, body: item.replyTo.deletedAt ? "این پیام حذف شده است." : item.replyTo.body } : null,
    reactions: summarizeReactions(item.reactions, user.id),
  }));

  return privateJson({ messages, hasMore });
}

export async function POST(request: NextRequest, context: Context) {
  const limit = await checkRateLimit("send-conversation-message", getRequestIdentity(request), { windowMs: 60 * 1000, maxAttempts: 60 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return privateJson({ error: "مبدأ درخواست نامعتبر است." }, 403);
  }
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
    return privateJson({ error: "نوع درخواست نامعتبر است." }, 415);
  }

  const size = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(size) || size > 22 * 1024 * 1024) {
    return privateJson({ error: "حجم درخواست بیشتر از ۲۲ مگابایت است." }, 413);
  }

  const user = await getCurrentUser();
  if (!user) return privateJson({ error: "برای ارسال پیام وارد حساب شوید." }, 401);

  const { id } = await context.params;
  if (!id || id.length > 100) return privateJson({ error: "شناسه مکالمه نامعتبر است." }, 400);

  let body: Record<string, unknown>;
  let attachmentFile: File | null = null;
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const fileValue = form.get("attachment");
      attachmentFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
      body = { message: form.get("message"), clientMessageId: form.get("clientMessageId"), replyToId: form.get("replyToId") };
    } else {
      const rawBody = await request.text();
      if (Buffer.byteLength(rawBody, "utf8") > 22 * 1024 * 1024) return privateJson({ error: "حجم درخواست بیش از ۲۲ مگابایت است." }, 413);
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return privateJson({ error: "ساختار درخواست نامعتبر است." }, 400);
      body = parsed as Record<string, unknown>;
    }
  } catch {
    return privateJson({ error: "متن درخواست معتبر نیست." }, 400);
  }

  if (!("message" in body) || (body.message !== null && typeof body.message !== "string")) {
    return privateJson({ error: "متن پیام نامعتبر است." }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if ((!message && !attachmentFile) || message.length > 2000) {
    return privateJson({ error: "پیام باید متن یا یک پیوست معتبر داشته باشد و حداکثر ۲۰۰۰ کاراکتر باشد." }, 400);
  }
  if (attachmentFile && attachmentFile.size > 20 * 1024 * 1024) return privateJson({ error: "حداکثر حجم فایل صوتی/تصویری ۲۰ مگابایت است." }, 413);
  const allowedMime = new Set([
    "image/jpeg", "image/png", "image/webp", "application/pdf",
    "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
    "video/webm", "video/mp4",
  ]);
  if (attachmentFile && !allowedMime.has(attachmentFile.type)) return privateJson({ error: "نوع فایل پشتیبانی نمی‌شود. تصویر، PDF، صوت WebM/OGG/MP4/MP3/WAV و ویدیوی WebM/MP4 مجاز است." }, 415);
  let attachmentExtension = "";
  if (attachmentFile) {
    const bytes = Buffer.from(await attachmentFile.arrayBuffer());
    const ascii = (start: number, end: number) => bytes.toString("ascii", start, end);
    const isWebm = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    const isOgg = ascii(0, 4) === "OggS";
    const isMp4 = ascii(4, 8) === "ftyp";
    const isMp3 = ascii(0, 3) === "ID3" || (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    const isWav = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
    const valid = attachmentFile.type === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : attachmentFile.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : attachmentFile.type === "image/webp" ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
      : attachmentFile.type === "application/pdf" ? ascii(0, 5) === "%PDF-"
      : attachmentFile.type === "audio/ogg" ? isOgg
      : attachmentFile.type === "audio/mpeg" ? isMp3
      : attachmentFile.type === "audio/wav" ? isWav
      : attachmentFile.type === "audio/mp4" || attachmentFile.type === "video/mp4" ? isMp4
      : attachmentFile.type === "audio/webm" || attachmentFile.type === "video/webm" ? isWebm
      : false;
    if (!valid) return privateJson({ error: "محتوای فایل با نوع اعلام‌شده مطابقت ندارد." }, 415);
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
      "audio/webm": ".webm", "video/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a",
      "audio/mpeg": ".mp3", "audio/wav": ".wav", "video/mp4": ".mp4",
    };
    attachmentExtension = extensions[attachmentFile.type];
  }

  // A client-generated UUID makes retries safe when the server saves a message
  // but the response is lost. The same ID can never create a second message.
  const clientMessageId = "clientMessageId" in body && typeof body.clientMessageId === "string"
    ? body.clientMessageId
    : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
    return privateJson({ error: "شناسه یکتای پیام نامعتبر است؛ ارسال را دوباره انجام دهید." }, 400);
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: { id: true, listingId: true, buyerId: true, sellerId: true },
  });
  if (!conversation) {
    return privateJson({ error: "مکالمه پیدا نشد یا دسترسی مجاز نیست." }, 404);
  }

  const counterpartId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  const blocked = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: user.id, blockedId: counterpartId }, { blockerId: counterpartId, blockedId: user.id }] },
    select: { blockerId: true },
  });
  if (blocked) return privateJson({ error: "ارسال پیام در این مکالمه به دلیل محدودیت مسدودسازی امکان‌پذیر نیست." }, 403);

  const replyToId = "replyToId" in body && typeof body.replyToId === "string" ? body.replyToId : null;
  if (replyToId) {
    const replyTarget = await prisma.message.findFirst({ where: { id: replyToId, conversationId: id, deletedAt: null }, select: { id: true } });
    if (!replyTarget) return privateJson({ error: "پیام موردنظر برای پاسخ پیدا نشد." }, 400);
  }

  const existing = await prisma.message.findUnique({
    where: { id: clientMessageId },
    select: { id: true, conversationId: true, senderId: true, body: true, createdAt: true, readAt: true },
  });
  if (existing) {
    if (existing.conversationId !== conversation.id || existing.senderId !== user.id) {
      return privateJson({ error: "شناسه پیام قبلاً استفاده شده است." }, 409);
    }
    return privateJson({
      success: true,
      duplicate: true,
      message: { id: existing.id, body: existing.body, senderId: existing.senderId, createdAt: existing.createdAt.toISOString(), readAt: existing.readAt?.toISOString() ?? null },
    });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.message.count({
    where: { senderId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= 30) {
    return privateJson({ error: "سقف ارسال پیام در این ساعت تکمیل شده است." }, 429);
  }

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let attachmentDiskPath: string | null = null;
  if (attachmentFile) {
    if (process.env.NODE_ENV === "production" && !process.env.MESSAGE_UPLOAD_DIR) {
      return privateJson({ error: "فضای ذخیره‌سازی پایدار پیوست‌ها پیکربندی نشده است." }, 503);
    }
    const uploadDir = process.env.MESSAGE_UPLOAD_DIR || path.join(process.cwd(), ".data", "message-uploads");
    await mkdir(uploadDir, { recursive: true });
    const uploadName = `${randomUUID()}${attachmentExtension}`;
    attachmentDiskPath = path.join(uploadDir, uploadName);
    await writeFile(attachmentDiskPath, Buffer.from(await attachmentFile.arrayBuffer()), { flag: "wx" });
    attachmentUrl = `/api/conversations/${encodeURIComponent(id)}/messages/${encodeURIComponent(clientMessageId)}/attachment`;
    attachmentName = attachmentFile.name.replace(/[\\/\r\n\0]/g, "_").slice(0, 255) || `attachment${attachmentExtension}`;
    // Store the generated disk key in the attachment URL query, not user input.
    attachmentUrl += `?key=${uploadName}`;
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const messageRecord = await tx.message.create({
        data: { id: clientMessageId, conversationId: conversation.id, senderId: user.id, body: message, ...(replyToId ? { replyToId } : {}), ...(attachmentFile ? { attachmentUrl, attachmentName, attachmentMime: attachmentFile.type, attachmentSize: attachmentFile.size } : {}) },
        select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, editedAt: true, deletedAt: true, replyToId: true, attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true, reactions: { select: { emoji: true, userId: true } }, replyTo: { select: { id: true, body: true, senderId: true, deletedAt: true } } },
      });
      await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      await tx.notification.create({ data: {
        userId: counterpartId,
        type: "NEW_MESSAGE",
        title: "پیام جدید درباره یک ملک",
        body: (message || `پیوست: ${attachmentName || "فایل"}`).slice(0, 450),
        href: `/dashboard/messages/${conversation.id}`,
      } });
      return messageRecord;
    });

    await sendNewMessageEmail({ recipientId: counterpartId, conversationId: conversation.id, listingId: conversation.listingId, preview: message || `پیوست: ${attachmentName || "فایل"}` });
    return privateJson({
      success: true,
      duplicate: false,
      message: { ...created, body: created.deletedAt ? "این پیام حذف شده است." : created.body, createdAt: created.createdAt.toISOString(), readAt: created.readAt?.toISOString() ?? null, editedAt: created.editedAt?.toISOString() ?? null, deletedAt: created.deletedAt?.toISOString() ?? null, reactions: summarizeReactions(created.reactions, user.id), replyTo: created.replyTo ? { ...created.replyTo, body: created.replyTo.deletedAt ? "این پیام حذف شده است." : created.replyTo.body } : null },
    }, 201);
  } catch (error) {
    if (attachmentDiskPath) { try { await unlink(attachmentDiskPath); } catch { /* Best-effort cleanup for failed uploads. */ } }
    // Resolve the narrow race where two retries arrive at the same time.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existingAfterRace = await prisma.message.findUnique({
        where: { id: clientMessageId },
        select: { id: true, conversationId: true, senderId: true, body: true, createdAt: true, readAt: true },
      });
      if (existingAfterRace?.conversationId === conversation.id && existingAfterRace.senderId === user.id) {
        return privateJson({
          success: true,
          duplicate: true,
          message: { id: existingAfterRace.id, body: existingAfterRace.body, senderId: existingAfterRace.senderId, createdAt: existingAfterRace.createdAt.toISOString(), readAt: existingAfterRace.readAt?.toISOString() ?? null },
        });
      }
    }
    throw error;
  }
}
