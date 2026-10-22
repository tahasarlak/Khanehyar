"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PendingListing = {
  id: string;
  title: string;
  description: string;
  listingType: "SALE" | "RENT";
  propertyType: string;
  city: string;
  address: string | null;
  price: string;
  currency: string;
  area: string;
  rooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  createdAt: string;
  owner: { name: string | null };
};

export default function AdminListingsPage() {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessStatus, setAccessStatus] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/admin/listings", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          setAccessStatus(response.status);
          return;
        }

        if (!response.ok) {
          throw new Error("دریافت آگهی‌های در انتظار بررسی ناموفق بود.");
        }

        const data: { listings: PendingListing[] } =
          await response.json();

        setListings(data.listings);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "خطای ناشناخته.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  async function decide(
    listing: PendingListing,
    status: "PUBLISHED" | "REJECTED",
  ) {
    const action = status === "PUBLISHED" ? "منتشر" : "رد";

    let reason: string | undefined;

    if (status === "REJECTED") {
      const answer = window.prompt(
        `دلیل رد آگهی «${listing.title}» را بنویسید (حداقل ۱۰ کاراکتر):`,
      );

      if (answer === null) return;

      reason = answer.trim();

      if (reason.length < 10 || reason.length > 1000) {
        setError("دلیل رد باید بین ۱۰ تا ۱۰۰۰ کاراکتر باشد.");
        return;
      }
    } else if (!window.confirm(`آگهی «${listing.title}» ${action} شود؟`)) {
      return;
    }

    setBusyId(listing.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/admin/listings/${encodeURIComponent(listing.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
        },
      );

      const data: { message?: string; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ثبت تصمیم ناموفق بود.");
      }

      setListings((current) =>
        current.filter((item) => item.id !== listing.id),
      );

      setMessage(data.message || "تصمیم ثبت شد.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "خطایی رخ داد.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              مدیریت و تأیید آگهی‌ها
            </h1>
            <p className="mt-2 text-slate-600">
              بررسی آگهی‌های در انتظار انتشار
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="/admin/messages" className="text-emerald-700">گزارش‌های پیام‌رسان</Link>
            <Link href="/" className="text-emerald-700">بازگشت به خانه‌یار</Link>
          </div>
        </div>

        {loading && <p>در حال دریافت اطلاعات...</p>}

        {!loading && accessStatus === 401 && (
          <div className="rounded-xl bg-white p-8">
            <p className="mb-4">برای ادامه ابتدا وارد حساب شوید.</p>
            <Link href="/login" className="font-bold text-emerald-700">
              ورود به حساب
            </Link>
          </div>
        )}

        {!loading && accessStatus === 403 && (
          <p role="alert" className="rounded-xl bg-white p-8 text-red-700">
            این بخش فقط برای مدیران خانه‌یار قابل دسترسی است.
          </p>
        )}

        {error && (
          <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="mb-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">
            {message}
          </p>
        )}

        {!loading && accessStatus === null && !error && listings.length === 0 && (
          <p className="rounded-xl bg-white p-8 text-center">
            آگهی جدیدی در انتظار تأیید نیست.
          </p>
        )}

        {!loading && accessStatus === null && (
          <div className="space-y-5">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {listing.title}
                  </h2>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
                    در انتظار بررسی
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-slate-700">
                  {listing.description}
                </p>

                <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <p>مالک: {listing.owner.name || "بدون نام"}</p>
                  <p>شهر: {listing.city}</p>
                  <p>
                    نوع معامله:{" "}
                    {listing.listingType === "SALE" ? "فروش" : "اجاره"}
                  </p>
                  <p>نوع ملک: {listing.propertyType}</p>
                  <p>متراژ: {listing.area} مترمربع</p>
                  <p>اتاق: {listing.rooms ?? "ثبت نشده"}</p>
                  <p>طبقه: {listing.floor ?? "ثبت نشده"}</p>
                  <p>
                    کل طبقات: {listing.totalFloors ?? "ثبت نشده"}
                  </p>
                  <p>آدرس: {listing.address || "ثبت نشده"}</p>
                  <p className="font-bold text-emerald-800">
                    قیمت: {Number(listing.price).toLocaleString("fa-IR")}{" "}
                    {listing.currency}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void decide(listing, "PUBLISHED")}
                    className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {busyId === listing.id ? "در حال ثبت..." : "تأیید و انتشار"}
                  </button>

                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void decide(listing, "REJECTED")}
                    className="rounded-lg border border-red-300 px-5 py-3 font-semibold text-red-700 disabled:opacity-50"
                  >
                    رد آگهی
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}