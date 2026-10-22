"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type MessengerThread = {
  id: string;
  buyerId: string;
  updatedAt: string;
  counterpartName: string;
  listing: {
    id: string;
    title: string;
    city: string;
    listingType: string;
    currency: string;
    price: string;
    monthlyRent: string | null;
    image: string | null;
  };
  latest: { body: string; createdAt: string; senderId: string } | null;
  unread: number;
};

type Props = {
  conversations: MessengerThread[];
  currentUserId: string;
  activeId?: string;
  variant: "inbox" | "sidebar";
};

function dateLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(date);
}

function money(value: string, currency: string) {
  const names: Record<string, string> = { IRT: "تومان", IRR: "ریال", RUB: "روبل", USD: "دلار", EUR: "یورو" };
  const number = Number(value);
  if (!Number.isFinite(number)) return "قیمت توافقی";
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(number)} ${names[currency] || currency}`;
}

export default function MessengerConversationList({ conversations, currentUserId, activeId, variant }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    if (!normalized) return conversations;
    return conversations.filter((item) =>
      [item.counterpartName, item.listing.title, item.listing.city, item.latest?.body || ""]
        .some((value) => value.toLocaleLowerCase("fa").includes(normalized)),
    );
  }, [conversations, query]);

  return (
    <>
      <label className={`hm-messenger-search ${variant === "sidebar" ? "is-sidebar" : ""}`}>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجوی ملک، شهر یا پیام..."
          aria-label="جست‌وجوی گفت‌وگوها"
        />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>}
      </label>
      <div className={variant === "sidebar" ? "hm-messenger-sidebar-list" : "hm-conversation-list"} aria-label="فهرست گفت‌وگوها">
        {filtered.map((item) => {
          const latest = item.latest;
          const image = item.listing.image;
          const priceValue = item.listing.listingType === "RENT" ? item.listing.monthlyRent : item.listing.price;
          const priceLabel = priceValue ? money(priceValue, item.listing.currency) : "قیمت در آگهی";
          const href = `/dashboard/messages/${encodeURIComponent(item.id)}`;
          if (variant === "sidebar") {
            return (
              <Link key={item.id} href={href} className={`hm-messenger-thread${item.id === activeId ? " is-active" : ""}`} aria-current={item.id === activeId ? "page" : undefined}>
                {image ? <img className="hm-messenger-thread-avatar hm-property-avatar" src={image} alt="" /> : <span className="hm-messenger-thread-avatar" aria-hidden="true">⌂</span>}
                <span className="hm-messenger-thread-copy">
                  <strong>{item.listing.title}</strong>
                  <small>{item.counterpartName} · {item.listing.city}</small>
                  <em>{latest ? `${latest.senderId === currentUserId ? "شما: " : ""}${latest.body}` : "برای شروع گفت‌وگو پیام بدهید"}</em>
                </span>
                <span className="hm-messenger-thread-meta">
                  {latest && <time>{dateLabel(latest.createdAt)}</time>}
                  {item.unread > 0 && <b aria-label={`${item.unread} پیام خوانده‌نشده`}>{item.unread > 99 ? "۹۹+" : item.unread.toLocaleString("fa-IR")}</b>}
                </span>
              </Link>
            );
          }
          return (
            <Link key={item.id} href={href} className="hm-conversation-card">
              {image
                ? <img className="hm-conversation-avatar hm-property-avatar" src={image} alt="" />
                : <div className="hm-conversation-avatar" aria-hidden="true">⌂</div>}
              <div className="hm-conversation-main">
                <div className="hm-conversation-top"><strong>{item.listing.title}</strong><time>{dateLabel(latest?.createdAt || item.updatedAt)}</time></div>
                <div className="hm-conversation-listing">{item.counterpartName}<span>{item.listing.city} · {item.listing.listingType === "RENT" ? "اجاره" : "فروش"}</span></div>
                <p className="hm-conversation-preview">{latest ? `${latest.senderId === currentUserId ? "شما: " : ""}${latest.body}` : "هنوز پیامی ارسال نشده است."}</p>
                <small className="hm-conversation-price">{priceLabel}</small>
              </div>
              <div className="hm-conversation-side">{item.unread > 0 && <span className="hm-conversation-unread" aria-label={`${item.unread} پیام خوانده‌نشده`}>{item.unread > 99 ? "۹۹+" : item.unread.toLocaleString("fa-IR")}</span>}<span className="hm-conversation-arrow" aria-hidden="true">←</span></div>
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="hm-messenger-no-threads">{query ? "گفت‌وگویی با این عبارت پیدا نشد." : "هنوز گفت‌وگویی ندارید."}</p>}
      </div>
    </>
  );
}
