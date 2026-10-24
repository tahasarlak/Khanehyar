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
  yearBuilt: number | null; bathrooms: number | null; parkingSpaces: number | null;
  hasElevator: boolean | null; hasStorage: boolean | null; heatingType: string | null; coolingType: string | null;
  documentType: string | null; orientation: string | null; naturalLight: string | null;
  furnished: boolean | null; readyToMove: boolean | null; balcony: boolean | null; terrace: boolean | null; garden: boolean | null;
  amenities: string[]; monthlyRent: string | null; deposit: string | null; allowDepositConversion: boolean;
  advertiserType: "UNSPECIFIED" | "OWNER" | "AGENT" | "BUILDER"; showExactLocation: boolean;
  images: { id: string; url: string; sortOrder: number; altText: string | null }[];
};

export default function EditListingForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]);
  const [imageBusyId, setImageBusyId] = useState<string | null>(null);

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

  useEffect(() => {
    const urls = selectedImages.map((file) => URL.createObjectURL(file));
    setSelectedImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImages]);

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
      yearBuilt: form.yearBuilt, bathrooms: form.bathrooms, parkingSpaces: form.parkingSpaces,
      hasElevator: form.hasElevator, hasStorage: form.hasStorage, heatingType: form.heatingType, coolingType: form.coolingType,
      documentType: form.documentType, orientation: form.orientation, naturalLight: form.naturalLight,
      furnished: form.furnished, readyToMove: form.readyToMove, balcony: form.balcony, terrace: form.terrace, garden: form.garden,
      amenities: form.amenities,
      monthlyRent: form.monthlyRent === null || form.monthlyRent === "" ? null : Number(form.monthlyRent),
      deposit: form.deposit === null || form.deposit === "" ? null : Number(form.deposit),
      allowDepositConversion: form.allowDepositConversion, advertiserType: form.advertiserType, showExactLocation: form.showExactLocation,
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
      if (selectedImages.length > 0) {
        const imageData = new FormData();
        selectedImages.forEach((file) => imageData.append("images", file, file.name));
        const imageResponse = await fetch(`/api/my/listings/${encodeURIComponent(params.id)}/images`, { method: "POST", body: imageData, credentials: "same-origin" });
        const imageResult = await imageResponse.json() as { error?: string };
        if (!imageResponse.ok) throw new Error(imageResult.error || "اطلاعات آگهی ذخیره شد اما بارگذاری تصاویر ناموفق بود.");
        setSelectedImages([]);
      }

      router.push("/dashboard/listings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage(imageId: string) {
    if (!form || imageBusyId) return;
    setImageBusyId(imageId); setError("");
    try {
      const response = await fetch(`/api/my/listings/${encodeURIComponent(params.id)}/images/${encodeURIComponent(imageId)}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "حذف تصویر ناموفق بود.");
      setForm((previous) => previous ? { ...previous, images: previous.images.filter((image) => image.id !== imageId) } : previous);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "حذف تصویر ناموفق بود."); }
    finally { setImageBusyId(null); }
  }
  function chooseImages(files: FileList | null) {
    const chosen = Array.from(files ?? []);
    if ((form?.images.length ?? 0) + chosen.length > 8) { setError("هر آگهی حداکثر ۸ تصویر می‌تواند داشته باشد."); setSelectedImages([]); return; }
    if (chosen.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024)) { setError("تصاویر باید JPG، PNG یا WebP و هرکدام حداکثر ۸ مگابایت باشند."); setSelectedImages([]); return; }
    setError(""); setSelectedImages(chosen);
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

        <form onSubmit={submit} className="kh-edit-listing-form grid gap-5 md:grid-cols-2">
          <div className="kh-edit-section-heading md:col-span-2"><span>بخش ۱</span><div><strong>اطلاعات اصلی آگهی</strong><small>عنوان، توضیحات، نوع معامله و موقعیت ملک</small></div></div>
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

          <div className="kh-edit-section-heading md:col-span-2"><span>بخش ۲</span><div><strong>قیمت و مشخصات</strong><small>اطلاعات مالی، متراژ و جزئیات ساختمان</small></div></div>
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

          <div className="kh-edit-section-heading md:col-span-2"><span>بخش ۳</span><div><strong>امکانات و ویژگی‌ها</strong><small>مشخصات تکمیلی، امکانات و اطلاعات آگهی‌دهنده</small></div></div>
          <label>سال ساخت<input type="number" min="1000" max="2200" className={inputClass} value={form.yearBuilt ?? ""} onChange={(e) => update("yearBuilt", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>تعداد حمام / سرویس<input type="number" min="0" className={inputClass} value={form.bathrooms ?? ""} onChange={(e) => update("bathrooms", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>تعداد جای پارک<input type="number" min="0" className={inputClass} value={form.parkingSpaces ?? ""} onChange={(e) => update("parkingSpaces", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>اجاره ماهانه<input type="number" min="0.01" step="0.01" className={inputClass} value={form.monthlyRent ?? ""} onChange={(e) => update("monthlyRent", e.target.value || null)} /></label>
          <label>ودیعه / رهن<input type="number" min="0" step="0.01" className={inputClass} value={form.deposit ?? ""} onChange={(e) => update("deposit", e.target.value || null)} /></label>
          {([ ["hasElevator","آسانسور"], ["hasStorage","انباری"], ["furnished","مبله"], ["readyToMove","آماده تحویل"], ["balcony","بالکن"], ["terrace","تراس"], ["garden","حیاط یا باغچه"] ] as const).map(([key,label]) => <label key={key}>{label}<select className={inputClass} value={form[key] === null ? "" : String(form[key])} onChange={(e) => update(key, e.target.value === "" ? null : e.target.value === "true")}><option value="">مشخص نشده</option><option value="true">دارد / بله</option><option value="false">ندارد / خیر</option></select></label>)}
          <label>گرمایش<input className={inputClass} maxLength={80} value={form.heatingType ?? ""} onChange={(e) => update("heatingType", e.target.value || null)} /></label>
          <label>سرمایش<input className={inputClass} maxLength={80} value={form.coolingType ?? ""} onChange={(e) => update("coolingType", e.target.value || null)} /></label>
          <label>جهت ملک<input className={inputClass} maxLength={50} value={form.orientation ?? ""} onChange={(e) => update("orientation", e.target.value || null)} /></label>
          <label>نور طبیعی<input className={inputClass} maxLength={50} value={form.naturalLight ?? ""} onChange={(e) => update("naturalLight", e.target.value || null)} /></label>
          <label>نوع سند<input className={inputClass} maxLength={100} value={form.documentType ?? ""} onChange={(e) => update("documentType", e.target.value || null)} /></label>
          <label>نوع آگهی‌دهنده<select className={inputClass} value={form.advertiserType} onChange={(e) => update("advertiserType", e.target.value as Property["advertiserType"])}><option value="UNSPECIFIED">مشخص نشده</option><option value="OWNER">مالک</option><option value="AGENT">مشاور املاک</option><option value="BUILDER">سازنده</option></select></label>
          <label className="md:col-span-2">امکانات (با ویرگول جدا کن)<input className={inputClass} value={form.amenities.join("، ")} onChange={(e) => update("amenities", e.target.value.split(/[،,]/).map((item) => item.trim()).filter(Boolean).slice(0,30))} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.allowDepositConversion} onChange={(e) => update("allowDepositConversion", e.target.checked)} /> امکان تبدیل رهن و اجاره</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.showExactLocation} onChange={(e) => update("showExactLocation", e.target.checked)} /> نمایش نشانی دقیق</label>
          <section className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-bold text-slate-900">تصاویر آگهی</h2><p className="mt-1 text-sm text-slate-600">حداکثر ۸ تصویر JPG، PNG یا WebP؛ هر تصویر تا ۸ مگابایت.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{form.images.map((image) => <figure key={image.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={image.url} alt={image.altText || form.title} className="h-28 w-full object-cover"/><figcaption className="flex items-center justify-between gap-2 p-2 text-xs"><span>تصویر ثبت‌شده</span><button type="button" disabled={imageBusyId === image.id} onClick={() => void deleteImage(image.id)} className="text-red-700 disabled:opacity-50">{imageBusyId === image.id ? "در حال حذف…" : "حذف"}</button></figcaption></figure>)}</div>
            <label className="mt-4 block text-sm font-semibold">افزودن تصاویر جدید<input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => chooseImages(e.target.files)} /></label>
            {selectedImages.length > 0 && <p className="mt-2 text-sm text-emerald-800">{selectedImages.length.toLocaleString("fa-IR")} تصویر برای بارگذاری انتخاب شده است.</p>}
            {selectedImagePreviews.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{selectedImagePreviews.map((url,index)=><figure key={url} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={url} alt={`پیش‌نمایش تصویر ${index+1}`} className="h-28 w-full object-cover"/><figcaption className="p-2 text-xs">تصویر جدید {index+1}</figcaption></figure>)}</div>}
          </section>

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