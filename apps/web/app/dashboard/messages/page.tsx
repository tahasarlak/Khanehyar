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

  const archiveSummary = !showArchived ? await prisma.conversation.findFirst({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
      preferences: { some: { userId: user.id, archivedAt: { not: null } } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { body: true } },
    },
  }) : null;
  const archivedCount = !showArchived ? await prisma.conversation.count({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
      preferences: { some: { userId: user.id, archivedAt: { not: null } } },
    },
  }) : 0;

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
    where: { conversationId: { in: conversations.map((item) => item.id) }, senderId: { not: user.id }, readAt: null, deletedAt: null },
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

  return <main className="hm-page hm-telegram-inbox-page" dir="ltr"><div className="hm-container hm-content hm-telegram-inbox-shell"><section className="hm-telegram-inbox-sidebar" dir="rtl">
    <div className="hm-inbox-compact-toolbar"><NotificationCenter /><span className="hm-inbox-compact-count">{conversations.length.toLocaleString("fa-IR")} گفت‌وگو{totalUnread > 0 ? ` · ${totalUnread.toLocaleString("fa-IR")} خوانده‌نشده` : ""}</span></div>
{conversations.length === 0 ? <section className="hm-empty hm-inbox-empty"><div className="hm-inbox-empty-icon" aria-hidden="true">✉</div><h2>{showArchived ? "گفت‌وگوی بایگانی‌شده‌ای ندارید" : "هنوز گفت‌وگویی ندارید"}</h2><p>{showArchived ? "مکالمه‌هایی که بایگانی می‌کنید اینجا قرار می‌گیرند." : "از صفحه هر آگهی می‌توانید مستقیماً به آگهی‌دهنده پیام بدهید. پاسخ‌ها هم در همین صندوق نمایش داده می‌شوند."}</p>{!showArchived && <Link href="/search" className="hm-button">جست‌وجوی ملک</Link>}</section> : <ConversationSearchList items={items} currentUserId={user.id} archiveCount={archivedCount} archivePreview={archiveSummary ? { title: archiveSummary.listing.title, imageUrl: archiveSummary.listing.images[0]?.url ?? null, latestText: archiveSummary.messages[0]?.body ?? archiveSummary.listing.title } : null} showArchived={showArchived} />}
    <p className="hm-limit-note">حداکثر ۲۰۰ گفت‌وگوی اخیر نمایش داده می‌شود.</p>
  </section><section className="hm-telegram-inbox-stage" aria-label="پنجره گفت‌وگو" dir="ltr"><div className="hm-telegram-stage-content"><div className="hm-telegram-stage-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M54 10 8 28c-3 1-3 4 0 5l12 4 5 15c1 3 3 3 5 1l7-9 12 9c2 1 4 0 5-3l7-36c1-4-2-6-7-4ZM24 35l24-17-19 21-1 9-4-13Z"/></svg></div><h2>خانه‌یار</h2><p>برای شروع یا ادامهٔ گفت‌وگو، یکی از گفتگوها را از فهرست سمت چپ انتخاب کنید.</p><span>پیام‌رسان خانه‌یار</span></div></section></div></main>;
}

/* KHANEHYAR_MESSENGER_SMOOTH_ARCHIVE_V1 */
