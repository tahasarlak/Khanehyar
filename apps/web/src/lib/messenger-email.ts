import "server-only";
import { prisma } from "@/src/lib/prisma";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

/** Optional transactional email. Configure RESEND_API_KEY and MAIL_FROM to enable it. */
export async function sendNewMessageEmail(input: { recipientId: string; conversationId: string; listingId: string; preview: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !from || !baseUrl) return;
  try {
    const [recipient, listing, preference] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.recipientId }, select: { email: true, name: true, emailNotificationsEnabled: true } }),
      prisma.listing.findUnique({ where: { id: input.listingId }, select: { title: true } }),
      prisma.conversationPreference.findUnique({ where: { userId_conversationId: { userId: input.recipientId, conversationId: input.conversationId } }, select: { mutedUntil: true } }),
    ]);
    if (!recipient?.email || !recipient.emailNotificationsEnabled || preference?.mutedUntil && preference.mutedUntil > new Date()) return;
    const title = listing?.title || "ملک موردنظر";
    const href = `${baseUrl.replace(/\/$/, "")}/dashboard/messages/${encodeURIComponent(input.conversationId)}`;
    const preview = escapeHtml(input.preview.slice(0, 450));
    const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;color:#234"><h2>پیام جدید در خانه‌یار</h2><p>برای آگهی <strong>${escapeHtml(title)}</strong> پیام جدیدی دریافت کرده‌اید.</p><blockquote style="padding:12px;border-right:3px solid #258779;background:#f4f8f8">${preview}</blockquote><p><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 16px;background:#176b5d;color:#fff;border-radius:8px;text-decoration:none">مشاهده و پاسخ</a></p><small>اگر تمایلی به دریافت اعلان ایمیلی ندارید، تنظیمات اعلان را در خانه‌یار بررسی کنید.</small></div>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient.email], subject: `پیام جدید درباره ${title}`, html }),
      signal: AbortSignal.timeout(1800),
    });
  } catch {
    // Email delivery is best-effort and must never prevent message delivery.
  }
}
