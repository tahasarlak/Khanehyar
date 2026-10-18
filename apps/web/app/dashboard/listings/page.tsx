"use client";

import { useCallback, useEffect, useState } from "react";
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
  reviews: {
    decision: "PUBLISHED" | "REJECTED";
    reason: string | null;
    createdAt: string;
  }[];
};

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

            <div className="grid min-w-0 grid-cols-1 gap-4">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="min-w-0 rounded-2xl border border-[#e2e9f0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="break-words text-lg font-extrabold text-[#173b60] sm:text-xl">
                        {listing.title}
                      </h2>

                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {listing.city} |{" "}
                        {listing.listingType === "SALE" ? "فروش" : "اجاره"}
                      </p>

                      <p className="mt-3 text-base font-extrabold text-[#147d69]">
                        {Number(listing.price).toLocaleString("fa-IR")}{" "}
                        {listing.currency}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[listing.status]}`}
                    >
                      {statusLabels[listing.status]}
                    </span>
                  </div>

                  {listing.status === "REJECTED" &&
                    listing.reviews[0]?.decision === "REJECTED" &&
                    listing.reviews[0]?.reason && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="font-bold text-red-800">
                          دلیل رد آگهی
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">
                          {listing.reviews[0].reason}
                        </p>
                      </div>
                    )}

                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    {listing.status === "PUBLISHED" && (
                      <Link
                        href={`/listings/${listing.id}`}
                        className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-800 hover:bg-emerald-50"
                      >
                        مشاهده آگهی
                      </Link>
                    )}

                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      ویرایش آگهی
                    </Link>

                    <button
                      type="button"
                      onClick={() => void deleteListing(listing)}
                      disabled={deletingId !== null}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === listing.id
                        ? "در حال حذف..."
                        : "حذف آگهی"}
                    </button>
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