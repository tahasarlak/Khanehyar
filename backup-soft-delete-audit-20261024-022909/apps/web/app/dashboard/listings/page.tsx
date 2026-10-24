"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Listing = {
  id: string;
  title: string;
  city: string;
  status: "PENDING" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  listingType: "SALE" | "RENT";
  propertyType: string;
  price: string;
  currency: string;
  createdAt: string;
  imageUrl: string | null;
  reviews: {
    decision: "PUBLISHED" | "REJECTED";
    reason: string | null;
    createdAt: string;
  }[];
};


function ListingIcon({ name, className = "h-4 w-4" }: { name: "map" | "calendar" | "eye" | "edit" | "trash" | "home" | "clock"; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "map": return <svg {...common}><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>;
    case "eye": return <svg {...common}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "edit": return <svg {...common}><path d="M12 20h9"/><path d="m16.5 3.5 4 4L9 19l-5 1 1-5Z"/></svg>;
    case "trash": return <svg {...common}><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    default: return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>;
  }
}

const statusLabels: Record<Listing["status"], string> = {
  PENDING: "در انتظار تأیید",
  PUBLISHED: "منتشرشده",
  REJECTED: "ردشده",
  ARCHIVED: "بایگانی‌شده",
};

const statusStyles: Record<Listing["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-slate-100 text-slate-700",
};

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Listing["status"]>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | Listing["listingType"]>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price-high" | "price-low">("newest");
  const [refreshing, setRefreshing] = useState(false);

  const loadListings = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/my/listings", {
        cache: "no-store",
        signal,
      });

      if (response.status === 401) {
        setNeedsLogin(true);
        setListings([]);
        return;
      }

      if (!response.ok) {
        throw new Error("دریافت آگهی‌ها ناموفق بود.");
      }

      const data: { listings: Listing[] } = await response.json();
      setListings(data.listings);
    } catch (err) {
      if (signal?.aborted) return;
      setError(
        err instanceof Error ? err.message : "خطایی رخ داد.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void loadListings(controller.signal);
    }, 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadListings]);

  const visibleListings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    return listings.filter((listing) => {
      const matchesQuery = !normalized || `${listing.title} ${listing.city} ${listing.propertyType}`.toLocaleLowerCase("fa").includes(normalized);
      const matchesStatus = statusFilter === "ALL" || listing.status === statusFilter;
      const matchesType = typeFilter === "ALL" || listing.listingType === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    }).sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "price-high") return Number(b.price) - Number(a.price);
      if (sortBy === "price-low") return Number(a.price) - Number(b.price);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [listings, query, statusFilter, typeFilter, sortBy]);
  const statusCounts = useMemo(() => ({ ALL: listings.length, PUBLISHED: listings.filter((item) => item.status === "PUBLISHED").length, PENDING: listings.filter((item) => item.status === "PENDING").length, REJECTED: listings.filter((item) => item.status === "REJECTED").length, ARCHIVED: listings.filter((item) => item.status === "ARCHIVED").length }), [listings]);
  async function refreshListings() { setRefreshing(true); try { await loadListings(); } finally { setRefreshing(false); } }

  async function deleteListing(listing: Listing) {
    const confirmed = window.confirm(
      `آگهی «${listing.title}» برای همیشه حذف شود؟`,
    );

    if (!confirmed) return;

    setDeletingId(listing.id);
    setError("");

    try {
      const response = await fetch(
        `/api/my/listings/${encodeURIComponent(listing.id)}`,
        { method: "DELETE" },
      );

      if (response.status === 401) {
        setNeedsLogin(true);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "حذف آگهی ناموفق بود.");
      }

      setListings((current) =>
        current.filter((item) => item.id !== listing.id),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "خطایی رخ داد.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div dir="rtl" className="w-full min-w-0 text-[#18304e]">
      <div className="w-full min-w-0 space-y-6">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e2e9f0] bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-2xl font-black text-[#173b60] sm:text-3xl">
              آگهی‌های من
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              مدیریت آگهی‌های ثبت‌شده در خانه‌یار
            </p>
          </div>

          <Link
            href="/listings/new"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#147d69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#116653]"
          >
            + ثبت آگهی جدید
          </Link>
        </div>

        <section className="kh-listing-overview" aria-label="خلاصه وضعیت آگهی‌ها">
          {([ ["ALL", "همه آگهی‌ها", statusCounts.ALL], ["PUBLISHED", "منتشرشده", statusCounts.PUBLISHED], ["PENDING", "در انتظار بررسی", statusCounts.PENDING], ["REJECTED", "ردشده", statusCounts.REJECTED], ["ARCHIVED", "بایگانی‌شده", statusCounts.ARCHIVED] ] as const).map(([key, label, count]) => <button key={key} type="button" className={`kh-listing-stat ${statusFilter === key ? "is-active" : ""}`} onClick={() => setStatusFilter(key)}><span>{label}</span><strong>{count.toLocaleString("fa-IR")}</strong></button>)}
        </section>
        <section className="kh-listing-toolbar" aria-label="جست‌وجو و فیلتر آگهی‌ها">
          <label className="kh-listing-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی عنوان، شهر یا نوع ملک..." aria-label="جست‌وجوی آگهی‌ها" />{query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>}</label>
          <label className="kh-listing-filter"><span>نوع معامله</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "ALL" | Listing["listingType"])}><option value="ALL">همه</option><option value="SALE">فروش</option><option value="RENT">اجاره</option></select></label>
          <label className="kh-listing-filter"><span>مرتب‌سازی</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="price-high">بالاترین قیمت</option><option value="price-low">پایین‌ترین قیمت</option></select></label>
          <button type="button" className="kh-listing-refresh" onClick={() => void refreshListings()} disabled={refreshing || loading}>{refreshing ? "در حال تازه‌سازی…" : "↻ تازه‌سازی"}</button>
        </section>
        <div className="kh-listing-results-count" aria-live="polite">نمایش {visibleListings.length.toLocaleString("fa-IR")} از {listings.length.toLocaleString("fa-IR")} آگهی</div>

        {needsLogin ? (
          <div className="rounded-2xl border border-[#e2e9f0] bg-white p-8 text-center shadow-sm">
            <p className="mb-5">برای مشاهده آگهی‌های خود وارد شوید.</p>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#147d69] px-5 py-3 text-white"
            >
              ورود به حساب
            </Link>
          </div>
        ) : loading ? (
          <p className="rounded-2xl border border-[#e2e9f0] bg-white p-6 text-sm text-slate-600">
            در حال دریافت آگهی‌ها...
          </p>
        ) : (
          <>
            {error && (
              <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
                {error}
              </p>
            )}

            {!error && listings.length === 0 && (
              <div className="rounded-2xl border border-[#e2e9f0] bg-white p-8 text-center shadow-sm">
                <p>هنوز آگهی‌ای با این حساب ثبت نکرده‌اید.</p>
              </div>
            )}

            {listings.length > 0 && visibleListings.length === 0 && <div className="kh-listing-no-results"><strong>آگهی‌ای با این فیلترها پیدا نشد</strong><p>عبارت جست‌وجو یا فیلترها را تغییر بده.</p><button type="button" onClick={() => { setQuery(""); setStatusFilter("ALL"); setTypeFilter("ALL"); setSortBy("newest"); }}>پاک کردن فیلترها</button></div>}
            <div className="kh-my-listings-grid">
              {visibleListings.map((listing) => (
                <article key={listing.id} className="kh-my-listing-card">
                  <Link href={listing.status === "PUBLISHED" ? `/listings/${encodeURIComponent(listing.id)}` : `/dashboard/listings/${encodeURIComponent(listing.id)}/edit`} className="kh-my-listing-image" aria-label={`مشاهده ${listing.title}`}>
                    {listing.imageUrl ? <img src={listing.imageUrl} alt={`تصویر ${listing.title}`} loading="lazy" /> : <div className="kh-my-listing-placeholder"><ListingIcon name="home" className="h-10 w-10"/><span>خانه‌یار</span></div>}
                    <span className={`kh-my-listing-status ${listing.status.toLowerCase()}`}><span className="kh-status-dot" />{statusLabels[listing.status]}</span>
                    <span className="kh-my-listing-deal">{listing.listingType === "SALE" ? "فروش" : "اجاره"}</span>
                  </Link>
                  <div className="kh-my-listing-content">
                    <div className="kh-my-listing-topline">
                      <span className="kh-my-listing-property">{listing.propertyType === "APARTMENT" ? "آپارتمان" : listing.propertyType === "HOUSE" ? "خانه" : listing.propertyType === "VILLA" ? "ویلا" : listing.propertyType === "LAND" ? "زمین" : listing.propertyType === "COMMERCIAL" ? "ملک تجاری" : "ملک"}</span>
                      <span className="kh-my-listing-id">شناسه: {listing.id.slice(-6).toLocaleUpperCase("fa-IR")}</span>
                    </div>
                    <h2 className="kh-my-listing-title"><Link href={listing.status === "PUBLISHED" ? `/listings/${encodeURIComponent(listing.id)}` : `/dashboard/listings/${encodeURIComponent(listing.id)}/edit`}>{listing.title}</Link></h2>
                    <p className="kh-my-listing-location"><ListingIcon name="map" />{listing.city}</p>
                    <div className="kh-my-listing-price">
                      <span>قیمت درج‌شده</span>
                      <strong>{Number(listing.price).toLocaleString("fa-IR")} <small>{listing.currency}</small></strong>
                    </div>
                    <div className="kh-my-listing-meta"><span><ListingIcon name="calendar" />{new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(listing.createdAt))}</span><span><ListingIcon name="clock" />آخرین بروزرسانی: {new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(listing.reviews[0]?.createdAt ?? listing.createdAt))}</span></div>
                    {listing.status === "REJECTED" && listing.reviews[0]?.decision === "REJECTED" && listing.reviews[0]?.reason && (
                      <div className="kh-my-listing-rejection"><strong>دلیل رد آگهی</strong><p>{listing.reviews[0].reason}</p></div>
                    )}
                    <div className="kh-my-listing-actions">
                      {listing.status === "PUBLISHED" && <Link href={`/listings/${encodeURIComponent(listing.id)}`} className="kh-my-listing-action primary"><ListingIcon name="eye" />مشاهده آگهی</Link>}
                      <Link href={`/dashboard/listings/${encodeURIComponent(listing.id)}/edit`} className="kh-my-listing-action secondary"><ListingIcon name="edit" />ویرایش</Link>
                      <button type="button" onClick={() => void deleteListing(listing)} disabled={deletingId !== null} className="kh-my-listing-action danger"><ListingIcon name="trash" />{deletingId === listing.id ? "در حال حذف…" : "حذف"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-sm text-slate-600 hover:text-emerald-700"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}