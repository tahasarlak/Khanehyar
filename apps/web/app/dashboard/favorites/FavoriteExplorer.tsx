"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FavoriteButton from "../../_components/FavoriteButton";
import PropertyCard from "../../_components/PropertyCard";

export type FavoriteListingItem = {
  id: string;
  title: string;
  city: string;
  area: string;
  price: string;
  currency: string;
  rooms: number | null;
  propertyType: string;
  listingType: string;
  imageUrl: string | null;
};

const currencies: Record<string, string> = { RUB: "روبل", IRR: "ریال", IRT: "تومان", USD: "دلار", EUR: "یورو" };
const propertyNames: Record<string, string> = { APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", COMMERCIAL: "تجاری" };

export default function FavoriteExplorer({ listings }: { listings: FavoriteListingItem[] }) {
  const [query, setQuery] = useState("");
  const [deal, setDeal] = useState<"ALL" | "SALE" | "RENT">("ALL");
  const [sort, setSort] = useState<"newest" | "price-high" | "price-low">("newest");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    return listings.filter((item) => {
      const matchesText = !normalized || `${item.title} ${item.city} ${item.propertyType}`.toLocaleLowerCase("fa").includes(normalized);
      return matchesText && (deal === "ALL" || item.listingType === deal);
    }).sort((a, b) => sort === "price-high" ? Number(b.price) - Number(a.price) : sort === "price-low" ? Number(a.price) - Number(b.price) : 0);
  }, [listings, query, deal, sort]);

  const compareItems = listings.filter((item) => compareIds.includes(item.id));
  function toggleCompare(id: string) {
    setCompareError("");
    if (compareIds.includes(id)) {
      setCompareIds((current) => current.filter((item) => item !== id));
      return;
    }
    if (compareIds.length >= 3) {
      setCompareError("برای مقایسه هم‌زمان حداکثر ۳ آگهی انتخاب کن.");
      return;
    }
    setCompareIds((current) => current.includes(id) ? current : [...current, id]);
  }

  return (
    <>
      <section className="kh-favorites-toolbar" aria-label="جست‌وجو و مرتب‌سازی علاقه‌مندی‌ها">
        <label className="kh-favorites-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی عنوان یا شهر..." aria-label="جست‌وجوی علاقه‌مندی‌ها" />{query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>}</label>
        <label className="kh-favorites-select"><span>نوع معامله</span><select value={deal} onChange={(event) => setDeal(event.target.value as typeof deal)}><option value="ALL">همه</option><option value="SALE">فروش</option><option value="RENT">اجاره</option></select></label>
        <label className="kh-favorites-select"><span>مرتب‌سازی</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">آخرین ذخیره‌شده</option><option value="price-high">بالاترین قیمت</option><option value="price-low">پایین‌ترین قیمت</option></select></label>
      </section>
      <p className="kh-favorites-count" aria-live="polite">{filtered.length.toLocaleString("fa-IR")} مورد از {listings.length.toLocaleString("fa-IR")} آگهی</p>
      {compareError && <p className="kh-settings-feedback is-error" role="status">{compareError}</p>}
      {compareItems.length > 0 && <section className="kh-compare-panel" aria-label="مقایسه آگهی‌های انتخاب‌شده">
        <div className="kh-compare-heading"><div><strong>مقایسه آگهی‌ها</strong><small>{compareItems.length.toLocaleString("fa-IR")} مورد انتخاب شده؛ حداکثر ۳ مورد</small></div><button type="button" onClick={() => { setCompareIds([]); setCompareError(""); }}>پاک کردن مقایسه</button></div>
        <div className="kh-compare-scroll"><table><thead><tr><th>ویژگی</th>{compareItems.map((item) => <th key={item.id}>{item.title}</th>)}</tr></thead><tbody>
          <tr><th>قیمت</th>{compareItems.map((item) => <td key={item.id}>{Number(item.price).toLocaleString("fa-IR")} {currencies[item.currency] ?? item.currency}</td>)}</tr>
          <tr><th>شهر</th>{compareItems.map((item) => <td key={item.id}>{item.city}</td>)}</tr>
          <tr><th>متراژ</th>{compareItems.map((item) => <td key={item.id}>{Number(item.area).toLocaleString("fa-IR")} متر مربع</td>)}</tr>
          <tr><th>اتاق</th>{compareItems.map((item) => <td key={item.id}>{item.rooms === null ? "ثبت نشده" : item.rooms.toLocaleString("fa-IR")}</td>)}</tr>
          <tr><th>نوع ملک</th>{compareItems.map((item) => <td key={item.id}>{propertyNames[item.propertyType] ?? "ملک"}</td>)}</tr>
          <tr><th>معامله</th>{compareItems.map((item) => <td key={item.id}>{item.listingType === "RENT" ? "اجاره" : "فروش"}</td>)}</tr>
        </tbody></table></div>
      </section>}
      {filtered.length ? <div className="hy-property-grid">{filtered.map((item) => <div key={item.id} className="hy-favorite-item">
        <PropertyCard listing={{ ...item, images: item.imageUrl ? [{ url: item.imageUrl }] : [] }} actions={<><FavoriteButton listingId={item.id} /><label className="kh-favorite-compare"><input type="checkbox" checked={compareIds.includes(item.id)} onChange={() => toggleCompare(item.id)} /> مقایسه</label></>} />
      </div>)}</div> : <div className="hy-empty"><span aria-hidden="true">⌕</span><h2>{listings.length ? "نتیجه‌ای پیدا نشد" : "هنوز آگهی ذخیره نکرده‌ای"}</h2><p>{listings.length ? "عبارت جست‌وجو یا فیلترها را تغییر بده." : "وارد صفحه یک ملک شو و با دکمه قلب آن را ذخیره کن."}</p>{listings.length ? <button type="button" className="hy-button hy-button-primary" onClick={() => { setQuery(""); setDeal("ALL"); setSort("newest"); }}>پاک کردن فیلترها</button> : <Link href="/search" className="hy-button hy-button-primary">مشاهده آگهی‌ها</Link>}</div>}
    </>
  );
}
