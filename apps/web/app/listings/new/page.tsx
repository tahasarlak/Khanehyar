"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function NewListingPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/listings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "ثبت آگهی انجام نشد. اطلاعات را بررسی کن.",
        );
        return;
      }

      setMessage(
        `${result.message} کد آگهی: ${result.listing.id}`,
      );
      event.currentTarget.reset();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black text-emerald-700">
            خانه‌یار
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-emerald-700"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="mb-8">
          <p className="text-sm font-bold text-emerald-700">
            ثبت آگهی جدید
          </p>
          <h1 className="mt-2 text-3xl font-black">ملکت را معرفی کن</h1>
          <p className="mt-3 leading-7 text-slate-500">
            اطلاعات ملک را دقیق وارد کن تا متقاضیان بتوانند آن را بهتر پیدا کنند.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <section>
            <h2 className="text-lg font-bold">اطلاعات اصلی</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold">
                عنوان آگهی *
                <input
                  name="title"
                  required
                  minLength={5}
                  maxLength={120}
                  placeholder="مثلاً آپارتمان دوخوابه نزدیک مترو"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block text-sm font-semibold">
                نوع معامله *
                <select
                  name="listingType"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="SALE">فروش</option>
                  <option value="RENT">اجاره</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                نوع ملک *
                <select
                  name="propertyType"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="APARTMENT">آپارتمان</option>
                  <option value="HOUSE">خانه</option>
                  <option value="VILLA">ویلا</option>
                  <option value="LAND">زمین</option>
                  <option value="COMMERCIAL">تجاری</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                شهر *
                <input
                  name="city"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="مثلاً مسکو"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
                />
              </label>
            </div>

            <label className="mt-5 block text-sm font-semibold">
              توضیحات ملک *
              <textarea
                name="description"
                required
                minLength={20}
                maxLength={5000}
                rows={5}
                placeholder="درباره وضعیت ملک، امکانات و موقعیت آن توضیح بده..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
              />
            </label>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <h2 className="text-lg font-bold">قیمت و مشخصات</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold">
                قیمت *
                <input
                  name="price"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="مثلاً 18500000"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold">
                واحد پول *
                <select
                  name="currency"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="RUB">روبل روسیه (RUB)</option>
                  <option value="IRR">ریال ایران (IRR)</option>
                  <option value="USD">دلار آمریکا (USD)</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                مساحت (متر مربع) *
                <input
                  name="area"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="مثلاً 86"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold">
                تعداد اتاق
                <input
                  name="rooms"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="مثلاً 3"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold">
                طبقه
                <input
                  name="floor"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="مثلاً 4"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold">
                تعداد کل طبقات ساختمان
                <input
                  name="totalFloors"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="مثلاً 9"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold md:col-span-2">
                آدرس دقیق (اختیاری)
                <input
                  name="address"
                  maxLength={300}
                  placeholder="خیابان، منطقه یا نشانی ملک"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                />
              </label>
            </div>
          </section>

          <div className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            فعلاً آگهی به کاربر آزمایشی متصل می‌شود و پس از ثبت، منتظر تأیید مدیر می‌ماند.
            برای استفاده عمومی باید سیستم ورود کاربران پیاده‌سازی شود.
          </div>

          {message && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "در حال ثبت..." : "ثبت آگهی"}
            </button>
            <Link
              href="/"
              className="rounded-xl border border-slate-300 px-6 py-4 text-center font-bold transition hover:bg-slate-50"
            >
              انصراف
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
