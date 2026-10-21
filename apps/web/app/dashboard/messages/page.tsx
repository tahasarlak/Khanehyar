import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import "./messages.css";


function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export const instant = false;

export default async function MessagesPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/dashboard/messages")}`);

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true, listingId: true, buyerId: true, sellerId: true, updatedAt: true,
      listing: { select: { title: true, city: true, listingType: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
      buyer: { select: { name: true } }, seller: { select: { name: true } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { body: true, createdAt: true, senderId: true } },
    },
  });

  const unreadGroups = conversations.length ? await prisma.message.groupBy({
    by: ["conversationId"],
    where: { conversationId: { in: conversations.map((item) => item.id) }, senderId: { not: user.id }, readAt: null },
    _count: { _all: true },
  }) : [];
  const unreadByConversation = new Map(unreadGroups.map((item) => [item.conversationId, item._count._all]));
  const totalUnread = unreadGroups.reduce((sum, item) => sum + item._count._all, 0);

  return <main className="hm-page" dir="rtl"><div className="hm-container hm-content">
    <header className="hm-inbox-heading"><div><span className="hm-inbox-eyebrow">خانه‌یار · ارتباط امن</span><h1>پیام‌های من</h1><p>تمام گفت‌وگوهای خریداران و فروشندگان، مرتب‌شده بر اساس آخرین پیام.</p></div><div className="hm-inbox-total"><strong>{conversations.length.toLocaleString("fa-IR")}</strong><span>گفت‌وگو</span>{totalUnread > 0 && <small>{totalUnread.toLocaleString("fa-IR")} پیام خوانده‌نشده</small>}</div></header>
    {conversations.length === 0 ? <section className="hm-empty hm-inbox-empty"><div className="hm-inbox-empty-icon" aria-hidden="true">✉</div><h2>هنوز گفت‌وگویی ندارید</h2><p>از صفحه هر آگهی می‌توانید مستقیماً به آگهی‌دهنده پیام بدهید. پاسخ‌ها هم در همین صندوق نمایش داده می‌شوند.</p><Link href="/search" className="hm-button">جست‌وجوی ملک</Link></section> : <section className="hm-conversation-list" aria-label="فهرست گفت‌وگوها">{conversations.map((conversation) => {
      const isBuyer = conversation.buyerId === user.id;
      const counterpartName = isBuyer ? conversation.seller.name : conversation.buyer.name;
      const latest = conversation.messages[0];
      const unread = unreadByConversation.get(conversation.id) || 0;
      return <Link key={conversation.id} href={`/dashboard/messages/${encodeURIComponent(conversation.id)}`} className="hm-conversation-card">
        <div className="hm-conversation-avatar" aria-hidden="true">{(counterpartName || "ک").trim().slice(0, 1)}</div>
        <div className="hm-conversation-main"><div className="hm-conversation-top"><strong>{counterpartName || "کاربر خانه‌یار"}</strong><time>{latest ? dateLabel(latest.createdAt) : dateLabel(conversation.updatedAt)}</time></div><div className="hm-conversation-listing">{conversation.listing.title}<span>{conversation.listing.listingType === "RENT" ? "اجاره" : "فروش"} · {conversation.listing.city}</span></div><p className="hm-conversation-preview">{latest ? `${latest.senderId === user.id ? "شما: " : ""}${latest.body}` : "هنوز پیامی ارسال نشده است."}</p></div>
        <div className="hm-conversation-side">{unread > 0 && <span className="hm-conversation-unread" aria-label={`${unread} پیام خوانده‌نشده`}>{unread > 99 ? "۹۹+" : unread.toLocaleString("fa-IR")}</span>}<span className="hm-conversation-arrow" aria-hidden="true">←</span></div>
      </Link>;
    })}</section>}
    <p className="hm-limit-note">در حال حاضر حداکثر ۲۰۰ گفت‌وگوی اخیر نمایش داده می‌شود.</p>
  </div></main>;
}
