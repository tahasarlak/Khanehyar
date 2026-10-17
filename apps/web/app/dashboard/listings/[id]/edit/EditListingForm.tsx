"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Property = {
  id: string;
  title: string;
  description: string;
  listingType: "SALE" | "RENT";
  propertyType: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "COMMERCIAL";
  price: string;
  currency: string;
  area: string;
  rooms: number | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  floor: number | null;
  totalFloors: number | null;
};

export default function EditListingForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `/api/my/listings/${encodeURIComponent(params.id)}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "ابتدا وارد حساب شوید."
              : "آگهی پیدا نشد یا دسترسی ندارید.",
          );
        }

        const data: { listing: Property } = await response.json();

        if (!controller.signal.aborted) {
          setForm(data.listing);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "خطایی رخ داد.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [params.id]);

  function update<K extends keyof Property>(key: K, value: Property[K]) {
    setForm((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving) return;

    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      listingType: form.listingType,
      propertyType: form.propertyType,
      price: Number(form.price),
      currency: form.currency.toUpperCase(),
      area: Number(form.area),
      rooms: form.rooms,
      city: form.city,
      address: form.address,
      latitude: form.latitude,
      longitude: form.longitude,
      floor: form.floor,
      totalFloors: form.totalFloors,
    };

    try {
      const response = await fetch(
        `/api/my/listings/${encodeURIComponent(params.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ذخیره تغییرات ناموفق بود.");
      }

      router.push("/dashboard/listings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="mx-auto max-w-3xl p-8">
        در حال دریافت اطلاعات آگهی...
      </main>
    );
  }

  if (!form) {
    return (
      <main dir="rtl" className="mx-auto max-w-3xl p-8">
        <p role="alert" className="text-red-700">{error}</p>
        <Link href="/dashboard/listings" className="mt-5 inline-block text-emerald-700">
          بازگشت به آگهی‌های من
        </Link>
      </main>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900";

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-emerald-800">
          ویرایش آگهی
        </h1>
        <p className="mb-7 mt-2 text-sm text-slate-600">
          پس از ذخیره، آگهی برای تأیید مجدد مدیر ارسال می‌شود.
        </p>

        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            عنوان آگهی
            <input
              required
              maxLength={120}
              className={inputClass}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>

          <label className="md:col-span-2">
            توضیحات
            <textarea
              required
              rows={5}
              className={inputClass}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>

          <label>
            نوع آگهی
            <select
              className={inputClass}
              value={form.listingType}
              onChange={(e) =>
                update("listingType", e.target.value as Property["listingType"])
              }
            >
              <option value="SALE">فروش</option>
              <option value="RENT">اجاره</option>
            </select>
          </label>

          <label>
            نوع ملک
            <select
              className={inputClass}
              value={form.propertyType}
              onChange={(e) =>
                update("propertyType", e.target.value as Property["propertyType"])
              }
            >
              <option value="APARTMENT">آپارتمان</option>
              <option value="HOUSE">خانه</option>
              <option value="VILLA">ویلا</option>
              <option value="LAND">زمین</option>
              <option value="COMMERCIAL">تجاری</option>
            </select>
          </label>

          <label>
            قیمت
            <input
              type="number"
              min="0"
              step="0.01"
              required
              dir="ltr"
              className={inputClass}
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </label>

          <label>
            واحد پول
            <input
              required
              maxLength={3}
              minLength={3}
              dir="ltr"
              className={inputClass}
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
            />
          </label>

          <label>
            متراژ
            <input
              type="number"
              min="0"
              step="0.01"
              required
              dir="ltr"
              className={inputClass}
              value={form.area}
              onChange={(e) => update("area", e.target.value)}
            />
          </label>

          <label>
            تعداد اتاق
            <input
              type="number"
              min="0"
              step="1"
              dir="ltr"
              className={inputClass}
              value={form.rooms ?? ""}
              onChange={(e) =>
                update("rooms", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </label>

          <label>
            شهر
            <input
              required
              className={inputClass}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </label>

          <label>
            آدرس
            <input
              className={inputClass}
              value={form.address ?? ""}
              onChange={(e) => update("address", e.target.value || null)}
            />
          </label>

          <label>
            طبقه
            <input
              type="number"
              min="0"
              step="1"
              dir="ltr"
              className={inputClass}
              value={form.floor ?? ""}
              onChange={(e) =>
                update("floor", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </label>

          <label>
            تعداد کل طبقات
            <input
              type="number"
              min="1"
              step="1"
              dir="ltr"
              className={inputClass}
              value={form.totalFloors ?? ""}
              onChange={(e) =>
                update(
                  "totalFloors",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </label>

          {error && (
            <p role="alert" className="md:col-span-2 text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </button>

            <Link
              href="/dashboard/listings"
              className="rounded-lg border border-slate-300 px-6 py-3"
            >
              انصراف
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}