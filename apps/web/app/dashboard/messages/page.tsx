import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import ConversationSearchList, { type MessengerConversationItem } from "./ConversationSearchList";
import NotificationCenter from "./NotificationCenter";
import "./messages.css";

export const instant = false;

type PageProps = { searchParams?: Promise<{ view?: string }> };

export default async function MessagesPage({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  const showArchived = params?.view === "archived";
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/dashboard/messages")}`);

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
      preferences: showArchived
        ? { some: { userId: user.id, archivedAt: { not: null } } }
        : { none: { userId: user.id, archivedAt: { not: null } } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true, buyerId: true, sellerId: true, updatedAt: true,
      preferences: { where: { userId: user.id }, select: { archivedAt: true, mutedUntil: true, pinnedAt: true } },
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

  const items: MessengerConversationItem[] = conversations.map((item) => {
    const isBuyer = item.buyerId === user.id;
    return {
      id: item.id,
      buyerId: item.buyerId,
      sellerId: item.sellerId,
      updatedAt: item.updatedAt.toISOString(),
      counterpartName: (isBuyer ? item.seller.name : item.buyer.name) || "کاربر خانه‌یار",
      listing: {
        title: item.listing.title,
        city: item.listing.city,
        listingType: item.listing.listingType,
        imageUrl: item.listing.images[0]?.url ?? null,
      },
      latest: item.messages[0] ? {
        body: item.messages[0].body,
        createdAt: item.messages[0].createdAt.toISOString(),
        senderId: item.messages[0].senderId,
      } : null,
      unread: unreadByConversation.get(item.id) || 0,
      pinned: Boolean(item.preferences[0]?.pinnedAt),
      muted: Boolean(item.preferences[0]?.mutedUntil && item.preferences[0].mutedUntil > new Date()),
      archived: Boolean(item.preferences[0]?.archivedAt),
    };
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

  return <main className="hm-page" dir="rtl"><div className="hm-container hm-content">
    <header className="hm-inbox-heading">
      <div><span className="hm-inbox-eyebrow">خانه‌یار · ارتباط امن</span><h1>{showArchived ? "گفت‌وگوهای بایگانی‌شده" : "پیام‌های من"}</h1><p>گفت‌وگوهای مربوط به آگهی‌های شما، مرتب‌شده بر اساس آخرین فعالیت.</p><nav className="hm-message-view-tabs"><Link href="/dashboard/messages" aria-current={!showArchived ? "page" : undefined}>صندوق ورودی</Link><Link href="/dashboard/messages?view=archived" aria-current={showArchived ? "page" : undefined}>بایگانی</Link></nav></div>
      <div className="hm-inbox-actions"><NotificationCenter /><div className="hm-inbox-total"><strong>{conversations.length.toLocaleString("fa-IR")}</strong><span>گفت‌وگو</span>{totalUnread > 0 && <small>{totalUnread.toLocaleString("fa-IR")} پیام خوانده‌نشده</small>}</div></div>
    </header>
    {conversations.length === 0 ? <section className="hm-empty hm-inbox-empty"><div className="hm-inbox-empty-icon" aria-hidden="true">✉</div><h2>{showArchived ? "گفت‌وگوی بایگانی‌شده‌ای ندارید" : "هنوز گفت‌وگویی ندارید"}</h2><p>{showArchived ? "مکالمه‌هایی که بایگانی می‌کنید اینجا قرار می‌گیرند." : "از صفحه هر آگهی می‌توانید مستقیماً به آگهی‌دهنده پیام بدهید. پاسخ‌ها هم در همین صندوق نمایش داده می‌شوند."}</p>{!showArchived && <Link href="/search" className="hm-button">جست‌وجوی ملک</Link>}</section> : <ConversationSearchList items={items} currentUserId={user.id} />}
    <p className="hm-limit-note">حداکثر ۲۰۰ گفت‌وگوی اخیر نمایش داده می‌شود.</p>
  </div></main>;
}
