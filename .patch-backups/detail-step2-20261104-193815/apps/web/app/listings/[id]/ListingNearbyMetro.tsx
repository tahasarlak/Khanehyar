"use client";

import { useEffect, useMemo, useState } from "react";

type Place = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  icon: string;
  latitude: number;
  longitude: number;
};
type PlaceWithDistance = Place & { distance: number };

const categories = [
  { id: "metro", label: "مترو", icon: "🚇" },
  { id: "transit", label: "حمل‌ونقل", icon: "🚏" },
  { id: "shopping", label: "خرید روزانه", icon: "🛍️" },
  { id: "education", label: "آموزش", icon: "🎓" },
  { id: "health", label: "سلامت", icon: "✚" },
  { id: "green", label: "پارک و ورزش", icon: "🌳" },
  { id: "food", label: "غذا و کافه", icon: "☕" },
  { id: "services", label: "خدمات شهری", icon: "⌖" },
] as const;

function distanceMeters(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  const dp = (c - a) * rad;
  const dl = (d - b) * rad;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dl / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(x));
}

function formatDistance(meters: number) {
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} متر`
    : `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

function walkingMinutes(meters: number) {
  return Math.max(1, Math.round(meters / 75));
}

export default function ListingNearbyMetro({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [radius, setRadius] = useState(1000);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    if (latitude === null || longitude === null) { setState("empty"); return; }
    const controller = new AbortController();
    setState("loading");
    fetch(`/api/map/nearby?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&radius=${radius}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("nearby unavailable");
        return response.json() as Promise<{ places?: Place[] }>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const items = (data.places ?? []).map((place) => ({ ...place, distance: distanceMeters(latitude, longitude, place.latitude, place.longitude) })).sort((a, b) => a.distance - b.distance);
        setPlaces(items);
        setState(items.length ? "ready" : "empty");
      })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [latitude, longitude, radius]);

  const visible = useMemo(() => (activeCategory === "all" ? places : places.filter((place) => place.category === activeCategory)).slice(0, 18), [places, activeCategory]);
  const counts = useMemo(() => categories.map((category) => ({ ...category, count: places.filter((place) => place.category === category.id).length })), [places]);

  return (
    <section className="hd-nearby-explorer" dir="rtl" aria-label="امکانات و دسترسی‌های اطراف ملک">
      <div className="hd-nearby-head">
        <div><strong>امکانات اطراف ملک</strong><small>بر اساس داده‌های نقشه و مکان‌های ثبت‌شده در محدوده</small></div>
        <label>شعاع جست‌وجو <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}><option value={500}>۵۰۰ متر</option><option value={1000}>۱ کیلومتر</option><option value={3000}>۳ کیلومتر</option><option value={5000}>۵ کیلومتر</option></select></label>
      </div>
      {state === "loading" && <p className="hd-nearby-state">در حال دریافت امکانات اطراف…</p>}
      {state === "error" && <p className="hd-nearby-state">اطلاعات نقشه موقتاً در دسترس نیست. کمی بعد دوباره تلاش کن.</p>}
      {state === "empty" && <p className="hd-nearby-state">برای این محدوده اطلاعات مکانی کافی پیدا نشد. این به معنی نبود امکانات نیست.</p>}
      {state === "ready" && <>
        <div className="hd-nearby-categories">
          <button type="button" className={activeCategory === "all" ? "is-active" : ""} onClick={() => setActiveCategory("all")}>همه ({places.length.toLocaleString("fa-IR")})</button>
          {counts.filter((item) => item.count > 0).map((item) => <button type="button" key={item.id} className={activeCategory === item.id ? "is-active" : ""} onClick={() => setActiveCategory(item.id)}>{item.icon} {item.label} ({item.count.toLocaleString("fa-IR")})</button>)}
        </div>
        <div className="hd-nearby-list">{visible.map((place) => <div className="hd-nearby-place" key={place.id}><span className="hd-nearby-icon">{place.icon}</span><span className="hd-nearby-name"><strong>{place.name}</strong><small>{place.categoryLabel}</small></span><span className="hd-nearby-distance"><b>{formatDistance(place.distance)}</b><small>حدود {walkingMinutes(place.distance).toLocaleString("fa-IR")} دقیقه پیاده</small></span></div>)}</div>
        <small className="hd-nearby-disclaimer">فاصله و زمان پیاده‌روی تخمینی و بر پایه فاصله مستقیم هستند، نه مسیریابی خیابانی. داده‌ها از OpenStreetMap می‌آیند و ممکن است کامل یا به‌روز نباشند.</small>
      </>}
    </section>
  );
}
