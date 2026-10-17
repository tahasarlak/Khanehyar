"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Review = {
  id: string;
  decision: "PUBLISHED" | "REJECTED";
  reason: string | null;
  createdAt: string;
  reviewer: {
    name: string | null;
    email: string;
  } | null;
  listing: {
    id: string;
    title: string;
  };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/admin/reviews", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "دسترسی فقط برای مدیر مجاز است."
              : response.status === 401
                ? "ابتدا وارد حساب شوید."
                : "دریافت تاریخچه ناموفق بود.",
          );
        }

        const data: { reviews: Review[] } = await response.json();
        if (!controller.signal.aborted) setReviews(data.reviews);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "خطایی رخ داد.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">
            تاریخچه بررسی آگهی‌ها
          </h1>
          <Link href="/admin/listings" className="text-emerald-700">
            بازگشت به پنل مدیریت
          </Link>
        </div>

        {loading && <p>در حال دریافت تاریخچه...</p>}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && reviews.length === 0 && (
          <p className="rounded-xl bg-white p-6">
            هنوز تصمیمی در تاریخچه ثبت نشده است.
          </p>
        )}

        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="font-bold">{review.listing.title}</h2>
                <span className={
                  review.decision === "PUBLISHED"
                    ? "text-emerald-700"
                    : "text-red-700"
                }>
                  {review.decision === "PUBLISHED"
                    ? "تأیید و انتشار"
                    : "رد آگهی"}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                مدیر: {review.reviewer?.name ||
                  review.reviewer?.email ||
                  "حساب حذف‌شده"}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                زمان: {new Date(review.createdAt).toLocaleString("fa-IR")}
              </p>

              {review.reason && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">
                  دلیل: {review.reason}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}