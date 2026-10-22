import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Context = { params: Promise<{ id: string; messageId: string }> };
export async function GET(request: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "برای مشاهده پیوست وارد حساب شوید." }, { status: 401 });
  const { id, messageId } = await context.params;
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: id, deletedAt: null, conversation: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } },
    select: { attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true },
  });
  if (!message?.attachmentUrl || !message.attachmentMime) return NextResponse.json({ error: "پیوست پیدا نشد." }, { status: 404 });
  const stored = new URL(message.attachmentUrl, request.nextUrl.origin);
  const key = stored.searchParams.get("key");
  const requestedKey = request.nextUrl.searchParams.get("key");
  if (!key || key !== requestedKey || !/^[0-9a-f-]{36}\.(?:jpg|png|webp|pdf|webm|ogg|m4a|mp3|wav|mp4)$/i.test(key)) return NextResponse.json({ error: "شناسه پیوست نامعتبر است." }, { status: 404 });
  const uploadDir = process.env.MESSAGE_UPLOAD_DIR || path.join(process.cwd(), ".data", "message-uploads");
  try {
    const data = await readFile(path.join(uploadDir, path.basename(key)));
    const safeName = (message.attachmentName || "attachment").replace(/[\r\n"\\]/g, "_");
    return new NextResponse(data, { status: 200, headers: {
      "Content-Type": message.attachmentMime,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch {
    return NextResponse.json({ error: "فایل پیوست در دسترس نیست. فضای ذخیره‌سازی را بررسی کنید." }, { status: 404 });
  }
}
