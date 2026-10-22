"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type MessengerConversationItem = {
  id: string;
  buyerId: string;
  sellerId: string;
  updatedAt: string;
  counterpartName: string;
  listing: {
    title: string;
    city: string;
    listingType: string;
    imageUrl: string | null;
  };
  latest: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
};

type Props = {
  items: MessengerConversationItem[];
  currentUserId: string;
  activeConversationId?: string;
  variant?: "inbox" | "sidebar";
  archiveCount?: number;
  archivePreview?: { title: string; imageUrl: string | null; latestText: string } | null;
  showArchived?: boolean;
};

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return <>{text}</>;

  const parts = text.split(new RegExp(
    `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "ig"
  ));

  return (
    <>
      {parts.map((part, index) =>
        part.toLocaleLowerCase("fa") === term.toLocaleLowerCase("fa")
          ? <mark key={index} className="hm-search-highlight">{part}</mark>
          : <span key={index}>{part}</span>
      )}
    </>
  );
}
function dateLabel(value: string, timeOnly = false) {
  return new Intl.DateTimeFormat("fa-IR", timeOnly
    ? { hour: "2-digit", minute: "2-digit" }
    : { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ConversationSearchList({
  items,
  currentUserId,
  activeConversationId,
  variant = "inbox",
  archiveCount = 0,
  archivePreview = null,
  showArchived = false,
}: Props) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  async function restoreConversation(id: string) {
    setRestoringId(id);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(id)}/preferences`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: false }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "بازیابی مکالمه انجام نشد.");
      router.refresh();
    } catch (error) { window.alert(error instanceof Error ? error.message : "بازیابی مکالمه انجام نشد."); }
    finally { setRestoringId(null); }
  }
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    if (!normalized) return items;
    return items.filter((item) => [
      item.counterpartName,
      item.listing.title,
      item.listing.city,
      item.latest?.body ?? "",
    ].join(" ").toLocaleLowerCase("fa").includes(normalized));
  }, [items, query]);

  return (
    <div className={variant === "sidebar" ? "hm-messenger-list-wrap" : "hm-inbox-list-wrap"}>
      {variant === "inbox" && !showArchived && archiveCount > 0 && (
        <Link href="/dashboard/messages?view=archived" className="hm-archive-row" aria-label={`بایگانی، ${archiveCount.toLocaleString("fa-IR")} گفت‌وگو`}>
          <span className="hm-archive-row-icon" aria-hidden="true">▣</span>
          <span className="hm-archive-row-thumb" aria-hidden="true">{archivePreview?.imageUrl ? <img src={archivePreview.imageUrl} alt="" loading="lazy" /> : "⌂"}</span>
          <span className="hm-archive-row-copy"><strong>بایگانی</strong><small>{archivePreview?.latestText || "گفت‌وگوهای بایگانی‌شده"}</small></span>
          <span className="hm-archive-row-count">{archiveCount.toLocaleString("fa-IR")}</span>
          <span className="hm-archive-row-arrow" aria-hidden="true">‹</span>
        </Link>
      )}
      <label className="hm-conversation-search">
        <span className="hm-sr-only">جست‌وجوی گفت‌وگوها</span>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجوی ملک، شهر یا پیام..."
          autoComplete="off"
          maxLength={120}
        />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>}
      </label>{variant === "sidebar" ? (
        <div className="hm-messenger-sidebar-list">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/messages/${encodeURIComponent(item.id)}`} scroll={false}
              className={`hm-messenger-thread${item.id === activeConversationId ? " is-active" : ""}`}
              aria-current={item.id === activeConversationId ? "page" : undefined}
            >
              <span className="hm-messenger-thread-avatar" aria-hidden="true">
                {item.listing.imageUrl
                  ? <img src={item.listing.imageUrl} alt="" loading="lazy" />
                  : <span>⌂</span>}
              </span>
              <span className="hm-messenger-thread-copy">
                <strong>{item.pinned ? "📌 " : ""}<HighlightMatch text={item.listing.title} query={query} />{item.muted ? " · 🔕" : ""}{item.archived ? " · بایگانی" : ""}</strong>
                <small>{item.counterpartName} · {item.listing.city}</small>
                <em>{item.latest ? <><span>{item.latest.senderId === currentUserId ? "شما: " : ""}</span><HighlightMatch text={item.latest.body} query={query} /></> : "برای شروع گفت‌وگو پیام بدهید"}</em>
              </span>
              <span className="hm-messenger-thread-meta">
                {item.latest && <time dateTime={item.latest.createdAt}>{dateLabel(item.latest.createdAt, true)}</time>}
                {item.unread > 0 && <b aria-label={`${item.unread} پیام خوانده‌نشده`}>{item.unread > 99 ? "۹۹+" : item.unread.toLocaleString("fa-IR")}</b>}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && <p className="hm-messenger-no-threads">{query ? "گفت‌وگویی با این عبارت پیدا نشد." : "هنوز گفت‌وگویی ندارید."}</p>}
        </div>
      ) : (
        <section className="hm-conversation-list" aria-label="فهرست گفت‌وگوها">
          {items.map((item) => (
            <div key={item.id} className="hm-conversation-card-wrap">
              <Link href={`/dashboard/messages/${encodeURIComponent(item.id)}`} className="hm-conversation-card" scroll={false}>
                <div className="hm-conversation-avatar" aria-hidden="true">
                  {item.listing.imageUrl ? <img src={item.listing.imageUrl} alt="" loading="lazy" /> : <span>⌂</span>}
                </div>
                <div className="hm-conversation-main">
                  <div className="hm-conversation-top">
                    <strong>{item.pinned ? "📌 " : ""}<HighlightMatch text={item.listing.title} query={query} />{item.muted ? " · 🔕" : ""}</strong>
                    <time dateTime={item.latest?.createdAt ?? item.updatedAt}>{dateLabel(item.latest?.createdAt ?? item.updatedAt)}</time>
                  </div>
                  <div className="hm-conversation-listing">
                    {item.counterpartName}
                    <span>{item.listing.listingType === "RENT" ? "اجاره" : "فروش"} · {item.listing.city}</span>
                  </div>
                  <p className="hm-conversation-preview">{item.latest ? <><span>{item.latest.senderId === currentUserId ? "شما: " : ""}</span><HighlightMatch text={item.latest.body} query={query} /></> : "هنوز پیامی ارسال نشده است."}</p>
                </div>
                <div className="hm-conversation-side">
                  {item.unread > 0 && <span className="hm-conversation-unread" aria-label={`${item.unread} پیام خوانده‌نشده`}>{item.unread > 99 ? "۹۹+" : item.unread.toLocaleString("fa-IR")}</span>}
                  <span className="hm-conversation-arrow" aria-hidden="true">←</span>
                </div>
              </Link>
              {item.archived && <button type="button" className="hm-conversation-restore" onClick={() => void restoreConversation(item.id)} disabled={restoringId === item.id}>{restoringId === item.id ? "در حال بازیابی…" : "بازگردانی به صندوق ورودی"}</button>}
            </div>
          ))}
          {filtered.length === 0 && <p className="hm-empty">{query ? "گفت‌وگویی با این عبارت پیدا نشد." : "هنوز گفت‌وگویی ندارید."}</p>}
        </section>
      )}
      {variant === "inbox" && query && <p className="hm-search-result-count">{filtered.length.toLocaleString("fa-IR")} گفت‌وگو</p>}
    </div>
  );
}

/* KHANEHYAR_MESSENGER_SMOOTH_ARCHIVE_V1 */
