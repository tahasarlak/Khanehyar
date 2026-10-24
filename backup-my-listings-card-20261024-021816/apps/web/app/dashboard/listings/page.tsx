"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PropertyCard from "../../_components/PropertyCard";
import "../../market.css";

type Listing = {
  id: string;
  title: string;
  city: string;
  area: string;
  rooms: number | null;
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
            <div className="hy-property-grid kh-managed-property-grid">
              {visibleListings.map((listing) => (
                <div key={listing.id} className="kh-managed-listing-wrap">
                  <PropertyCard
                    listing={{
                      id: listing.id,
                      title: listing.title,
                      city: listing.city,
                      area: listing.area,
                      rooms: listing.rooms,
                      price: listing.price,
                      currency: listing.currency,
                      propertyType: listing.propertyType,
                      listingType: listing.listingType,
                      images: listing.imageUrl ? [{ url: listing.imageUrl }] : [],
                    }}
                    status={listing.status}
                    showStatus
                    date={new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(listing.createdAt))}
                    actions={
                      <>
                        {listing.status === "PUBLISHED" && <Link href={`/listings/${encodeURIComponent(listing.id)}`} className="hy-card-action hy-card-action-primary">مشاهده آگهی</Link>}
                        <Link href={`/dashboard/listings/${encodeURIComponent(listing.id)}/edit`} className="hy-card-action">ویرایش آگهی</Link>
                        <button type="button" className="hy-card-action hy-card-action-danger" onClick={() => void deleteListing(listing)} disabled={deletingId !== null}>
                          {deletingId === listing.id ? "در حال حذف..." : "حذف آگهی"}
                        </button>
                      </>
                    }
                  />
                  {listing.status === "REJECTED" && listing.reviews[0]?.decision === "REJECTED" && listing.reviews[0]?.reason && (
                    <div className="kh-listing-rejection"><strong>دلیل رد آگهی</strong><p>{listing.reviews[0].reason}</p></div>
                  )}
                </div>
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