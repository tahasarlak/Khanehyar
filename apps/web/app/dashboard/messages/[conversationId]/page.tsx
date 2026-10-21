import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import ConversationView from "../ConversationView";
import "../messages.css";


type Props = { params: Promise<{ conversationId: string }> };

export const instant = false;

export default async function ConversationPage({ params }: Props) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/dashboard/messages")}`);
  const { conversationId } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: {
      id: true, listingId: true, buyerId: true, sellerId: true,
      listing: { select: { id: true, title: true, city: true, listingType: true, propertyType: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, select: { id: true, body: true, senderId: true, createdAt: true, readAt: true } },
    },
  });
  if (!conversation) notFound();
  const counterpart = user.id === conversation.buyerId ? conversation.seller : conversation.buyer;
  const messages = [...conversation.messages].reverse();
  const unread = await prisma.message.count({
    where: { conversationId: conversation.id, senderId: { not: user.id }, readAt: null },
  });
  const inbox = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true, buyerId: true, updatedAt: true,
      listing: { select: { title: true } },
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { body: true, createdAt: true, senderId: true } },
    },
  });
  const inboxUnreadGroups = inbox.length ? await prisma.message.groupBy({
    by: ["conversationId"],
    where: { conversationId: { in: inbox.map((item) => item.id) }, senderId: { not: user.id }, readAt: null },
    _count: { _all: true },
  }) : [];
  const inboxUnread = new Map(inboxUnreadGroups.map((item) => [item.conversationId, item._count._all]));

  return <main className="hm-page" dir="rtl"><div className="hm-container hm-content hm-messenger-page">
    <nav className="hm-chat-breadcrumb" aria-label="مسیر صفحه"><Link href="/dashboard/messages">← همه گفت‌وگوها</Link><span>/</span><span>{conversation.listing.title}</span></nav>
    <section className="hm-messenger-layout">
      <aside className="hm-messenger-sidebar" aria-label="فهرست گفت‌وگوها">
        <header className="hm-messenger-sidebar-head"><div><span>خانه‌یار</span><h2>پیام‌ها</h2></div><span>{inbox.length.toLocaleString("fa-IR")}</span></header>
        <div className="hm-messenger-sidebar-list">
          {inbox.map((item) => {
            const buyerSide = item.buyerId === user.id;
            const name = buyerSide ? item.seller.name : item.buyer.name;
            const latest = item.messages[0];
            const unreadCount = inboxUnread.get(item.id) || 0;
            return <Link key={item.id} href={`/dashboard/messages/${encodeURIComponent(item.id)}`} className={`hm-messenger-thread${item.id === conversation.id ? " is-active" : ""}`} aria-current={item.id === conversation.id ? "page" : undefined}>
              <span className="hm-messenger-thread-avatar" aria-hidden="true">{(name || "ک").trim().slice(0, 1)}</span>
              <span className="hm-messenger-thread-copy"><strong>{name || "کاربر خانه‌یار"}</strong><small>{item.listing.title}</small><em>{latest ? `${latest.senderId === user.id ? "شما: " : ""}${latest.body}` : "برای شروع گفت‌وگو پیام بدهید"}</em></span>
              <span className="hm-messenger-thread-meta">{latest && <time>{new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(latest.createdAt)}</time>}{unreadCount > 0 && <b>{unreadCount > 99 ? "۹۹+" : unreadCount.toLocaleString("fa-IR")}</b>}</span>
            </Link>;
          })}
          {inbox.length === 0 && <p className="hm-messenger-no-threads">هنوز گفت‌وگویی ندارید.</p>}
        </div>
      </aside>
      <div className="hm-messenger-active-chat">
    <header className="hm-chat-header hm-chat-header-pro">
      <div className="hm-chat-person">
        <div className="hm-chat-person-avatar" aria-hidden="true">{(counterpart.name || "ک").trim().slice(0, 1)}</div>
        <div><p>گفت‌وگو با</p><h1>{counterpart.name || "کاربر خانه‌یار"}</h1><span>{user.id === conversation.buyerId ? "آگهی‌دهنده" : "متقاضی ملک"}</span></div>
      </div>
      <Link href={`/listings/${encodeURIComponent(conversation.listing.id)}`} className="hm-chat-listing-card">
        {conversation.listing.images[0]?.url ? <img src={conversation.listing.images[0].url} alt="" /> : <span className="hm-chat-listing-placeholder" aria-hidden="true">⌂</span>}
        <span className="hm-chat-listing-copy"><strong>{conversation.listing.title}</strong><small>{conversation.listing.city} · {conversation.listing.listingType === "RENT" ? "اجاره" : "فروش"}</small><em>مشاهده آگهی ↗</em></span>
      </Link>
    </header>
    <ConversationView conversationId={conversation.id} currentUserId={user.id} counterpartName={counterpart.name || "کاربر خانه‌یار"} initialUnread={unread} initialMessages={messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null }))} />
      </div>
    </section>
  </div></main>;
}
