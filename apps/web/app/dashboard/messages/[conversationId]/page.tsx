import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import ConversationView from "../ConversationView";
import ConversationSearchList, { type MessengerConversationItem } from "../ConversationSearchList";
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
      preferences: { where: { userId: user.id }, select: { mutedUntil: true, pinnedAt: true } },
      listing: { select: { id: true, title: true, city: true, listingType: true, propertyType: true, price: true, currency: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101, select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, editedAt: true, deletedAt: true, replyToId: true, attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true, replyTo: { select: { id: true, body: true, senderId: true, deletedAt: true } } } },
    },
  });
  if (!conversation) notFound();

  const counterpart = user.id === conversation.buyerId ? conversation.seller : conversation.buyer;
  const hasOlderMessages = conversation.messages.length > 100;
  const messages = [...conversation.messages.slice(0, 100)].reverse();

  const unread = await prisma.message.count({
    where: { conversationId: conversation.id, senderId: { not: user.id }, readAt: null },
  });

  const inbox = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }], preferences: { none: { userId: user.id, archivedAt: { not: null } } } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true, buyerId: true, sellerId: true, updatedAt: true,
      preferences: { where: { userId: user.id }, select: { archivedAt: true, mutedUntil: true, pinnedAt: true } },
      listing: { select: { title: true, city: true, listingType: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
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

  const inboxItems: MessengerConversationItem[] = inbox.map((item) => {
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
      unread: inboxUnread.get(item.id) || 0,
      pinned: Boolean(item.preferences[0]?.pinnedAt),
      muted: Boolean(item.preferences[0]?.mutedUntil && item.preferences[0].mutedUntil > new Date()),
      archived: Boolean(item.preferences[0]?.archivedAt),
    };
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

  return <main className="hm-page hm-messenger-ltr-page" dir="ltr"><div className="hm-container hm-content hm-messenger-page">
    <nav className="hm-chat-breadcrumb" aria-label="مسیر صفحه"><Link href="/dashboard/messages">← همه گفت‌وگوها</Link><span>/</span><span>{conversation.listing.title}</span></nav>
    <section className="hm-messenger-layout hm-messenger-ltr-layout" dir="ltr">
      <aside className="hm-messenger-sidebar" aria-label="فهرست گفت‌وگوها">
        <header className="hm-messenger-sidebar-head"><div><span>خانه‌یار</span><h2>پیام‌ها</h2></div><span>{inbox.length.toLocaleString("fa-IR")}</span></header>
        <ConversationSearchList items={inboxItems} currentUserId={user.id} activeConversationId={conversation.id} variant="sidebar" />
      </aside>
      <div className="hm-messenger-active-chat">

        <ConversationView
          conversationId={conversation.id}
          currentUserId={user.id}
          counterpartName={counterpart.name || "طرف گفت‌وگو"}
          listingTitle={conversation.listing.title}
          listingUrl={`/listings/${encodeURIComponent(conversation.listing.id)}`}
          listingImageUrl={conversation.listing.images[0]?.url ?? null}
          listingCity={conversation.listing.city}
          listingPriceLabel={`${conversation.listing.price.toString()} ${conversation.listing.currency}`}
          sellerName={conversation.seller.name || "فروشنده"}
          sellerProfileUrl={`/sellers/${encodeURIComponent(conversation.seller.id)}`}
          initialUnread={unread}
          initialHasOlderMessages={hasOlderMessages}
          initialMuted={Boolean(conversation.preferences[0]?.mutedUntil && conversation.preferences[0].mutedUntil > new Date())}
          initialPinned={Boolean(conversation.preferences[0]?.pinnedAt)}
          initialMessages={messages.map((message) => ({ ...message, body: message.deletedAt ? "این پیام حذف شده است." : message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, editedAt: message.editedAt?.toISOString() ?? null, deletedAt: message.deletedAt?.toISOString() ?? null, replyTo: message.replyTo ? { ...message.replyTo, deletedAt: message.replyTo.deletedAt?.toISOString() ?? null, body: message.replyTo.deletedAt ? "این پیام حذف شده است." : message.replyTo.body } : null }))}
        />
      </div>
    </section>
  </div></main>;
}
