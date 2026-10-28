"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./ListingMap.css";

type ApproximateLocation = { latitude: number; longitude: number; city?: string | null; country?: string | null };
type NearbyPlace = { id: string; name: string; category: string; categoryLabel: string; icon: string; latitude: number; longitude: number; distance?: number };

type MapPoint = {
  id: string;
  title: string;
  city: string;
  price: string;
  currency: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  listingType: "SALE" | "RENT";
  urgentSale?: boolean;
  rentalPeriod?: string | null;
};

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function worldPoint(lat: number, lon: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function geoPoint(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude: clamp(lat, -85, 85), longitude: clamp(lon, -180, 180) };
}

function initialZoom(points: MapPoint[]) {
  if (points.length < 2) return 12;
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const span = Math.max(Math.max(...longitudes) - Math.min(...longitudes), Math.max(...latitudes) - Math.min(...latitudes));
  if (span > 25) return 4;
  if (span > 12) return 5;
  if (span > 5) return 6;
  if (span > 2) return 7;
  if (span > 0.8) return 8;
  return 10;
}

function formatMoney(value: string, currency: string) {
  const number = Number(value);
  const formatted = Number.isFinite(number) ? new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(number) : value;
  const currencyLabel = currency === "IRT" ? "تومان" : currency === "IRR" ? "ریال" : currency === "RUB" ? "روبل" : currency;
  return `${formatted} ${currencyLabel}`;
}

export default function ListingMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [zoom, setZoom] = useState(() => initialZoom(points));
  const [center, setCenter] = useState(() => {
    if (!points.length) return { latitude: 35.6892, longitude: 51.3890 };
    return {
      latitude: points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
      longitude: points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
    };
  });
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id ?? null);
  const [dragging, setDragging] = useState(false);
  const [approximateLocation, setApproximateLocation] = useState<ApproximateLocation | null>(null);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(1000);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbyCategory, setNearbyCategory] = useState("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [nearbyRetry, setNearbyRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/location/approximate", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ location?: ApproximateLocation | null }> : { location: null })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.location && Number.isFinite(data.location.latitude) && Number.isFinite(data.location.longitude)) setApproximateLocation(data.location);
        else setLocationUnavailable(true);
      })
      .catch(() => { if (!controller.signal.aborted) setLocationUnavailable(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.max(320, rect.width), height: Math.max(420, rect.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);



  const visibleNearbyPlaces = useMemo(() => nearbyPlaces.filter((place) => nearbyCategory === "all" || place.category === nearbyCategory), [nearbyPlaces, nearbyCategory]);
  const formatDistance = (value: number) => value < 1000 ? `${Math.round(value).toLocaleString("fa-IR")} متر` : `${(value / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;

  const centerWorld = useMemo(() => worldPoint(center.latitude, center.longitude, zoom), [center, zoom]);
  const tileLayout = useMemo(() => {
    const tilesX = Math.ceil(size.width / TILE) + 2;
    const tilesY = Math.ceil(size.height / TILE) + 2;
    const baseX = Math.floor(centerWorld.x / TILE);
    const baseY = Math.floor(centerWorld.y / TILE);
    const startX = baseX - Math.floor(tilesX / 2);
    const startY = baseY - Math.floor(tilesY / 2);
    const offsetX = size.width / 2 - centerWorld.x + baseX * TILE;
    const offsetY = size.height / 2 - centerWorld.y + baseY * TILE;
    const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
    for (let y = startY; y < startY + tilesY; y++) {
      if (y < 0 || y >= 2 ** zoom) continue;
      for (let x = startX; x < startX + tilesX; x++) {
        const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
        tiles.push({ x: wrappedX, y, left: offsetX + (x - baseX) * TILE, top: offsetY + (y - baseY) * TILE });
      }
    }
    return tiles;
  }, [centerWorld, size, zoom]);

  const visiblePoints = useMemo(() => points.map((point) => {
    const projected = worldPoint(point.latitude, point.longitude, zoom);
    return { ...point, left: size.width / 2 + projected.x - centerWorld.x, top: size.height / 2 + projected.y - centerWorld.y };
  }).filter((point) => point.left > -50 && point.left < size.width + 50 && point.top > -55 && point.top < size.height + 20), [points, zoom, size, centerWorld]);

  const markerGroups = useMemo(() => {
    const groups = new Map<string, typeof visiblePoints>();
    for (const point of visiblePoints) {
      const key = `${Math.floor(point.left / 54)}:${Math.floor(point.top / 54)}`;
      const group = groups.get(key) ?? [];
      group.push(point);
      groups.set(key, group);
    }
    return [...groups.values()].map((items) => ({
      id: items.length === 1 ? items[0].id : `cluster-${items.map((item) => item.id).join("-")}`,
      items,
      left: items.reduce((sum, item) => sum + item.left, 0) / items.length,
      top: items.reduce((sum, item) => sum + item.top, 0) / items.length,
    }));
  }, [visiblePoints]);

  const selected = points.find((point) => point.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) { setNearbyPlaces([]); return; }
    const controller = new AbortController();
    setNearbyLoading(true); setNearbyError(""); setSelectedPlaceId(null);
    fetch(`/api/map/nearby?lat=${encodeURIComponent(selected.latitude)}&lon=${encodeURIComponent(selected.longitude)}&radius=${nearbyRadius}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { places?: NearbyPlace[]; error?: string };
        if (!response.ok) throw new Error(data.error || "دریافت امکانات اطراف ناموفق بود.");
        return data;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const distance = (place: NearbyPlace) => {
          const toRad = (value: number) => value * Math.PI / 180;
          const dLat = toRad(place.latitude - selected.latitude); const dLon = toRad(place.longitude - selected.longitude);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(selected.latitude)) * Math.cos(toRad(place.latitude)) * Math.sin(dLon / 2) ** 2;
          return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
        };
        setNearbyPlaces((data.places || []).map((place) => ({ ...place, distance: distance(place) })).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      })
      .catch((error) => { if (!controller.signal.aborted) setNearbyError(error instanceof Error ? error.message : "دریافت امکانات اطراف ناموفق بود."); })
      .finally(() => { if (!controller.signal.aborted) setNearbyLoading(false); });
    return () => controller.abort();
  }, [selected?.id, selected?.latitude, selected?.longitude, nearbyRadius, nearbyRetry]);
  const zoomBy = useCallback((delta: number) => setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM)), []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button,a")) return;
    const projected = worldPoint(center.latitude, center.longitude, zoom);
    dragRef.current = { x: event.clientX, y: event.clientY, centerX: projected.x, centerY: projected.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    setCenter(geoPoint(drag.centerX - (event.clientX - drag.x), drag.centerY - (event.clientY - drag.y), zoom));
  }

  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div className="hy-map-shell">
      <div className="hy-map-topbar">
        <div><strong>نقشهٔ آگهی‌ها</strong><span>{new Intl.NumberFormat("fa-IR").format(points.length)} ملک روی نقشه</span></div>
        <div className="hy-map-controls">
          <button type="button" aria-label="بزرگ‌نمایی" onClick={() => zoomBy(1)}>+</button>
          <button type="button" aria-label="کوچک‌نمایی" onClick={() => zoomBy(-1)}>−</button>
          {approximateLocation && <button type="button" className="hy-map-near-me" aria-label="نمایش محدودهٔ تقریبی محل اتصال اینترنت من" onClick={() => { setCenter({ latitude: approximateLocation.latitude, longitude: approximateLocation.longitude }); setZoom(12); setSelectedId(null); }}>محدودهٔ من</button>}
          <button type="button" aria-label="بازگشت به محدودهٔ آگهی‌ها" onClick={() => {
            if (!points.length) return;
            setCenter({ latitude: points.reduce((sum, p) => sum + p.latitude, 0) / points.length, longitude: points.reduce((sum, p) => sum + p.longitude, 0) / points.length });
            setZoom(initialZoom(points));
          }}>بازنشانی</button>
        </div>
      </div>
      <div ref={containerRef} className={`hy-map-canvas${dragging ? " is-dragging" : ""}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {tileLayout.map((tile) => <img key={`${zoom}-${tile.x}-${tile.y}`} className="hy-map-tile" draggable={false} src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} alt="" style={{ left: tile.left, top: tile.top }} />)}
        {markerGroups.map((group) => {
          const point = group.items[0];
          const isCluster = group.items.length > 1;
          return <button key={group.id} type="button" className={`hy-map-marker${isCluster ? " is-cluster" : ""}${!isCluster && selectedId === point.id ? " is-selected" : ""}`} style={{ left: group.left, top: group.top }} onClick={() => {
            if (isCluster) {
              const averageLat = group.items.reduce((sum, item) => sum + item.latitude, 0) / group.items.length;
              const averageLon = group.items.reduce((sum, item) => sum + item.longitude, 0) / group.items.length;
              setCenter({ latitude: averageLat, longitude: averageLon });
              setZoom((current) => clamp(current + 2, MIN_ZOOM, MAX_ZOOM));
              setSelectedId(point.id);
            } else setSelectedId(point.id);
          }} aria-label={isCluster ? `${group.items.length} آگهی؛ برای بزرگ‌نمایی کلیک کن` : `مشاهده ${point.title}`} title={isCluster ? `${group.items.length} آگهی` : point.title}><span>{isCluster ? new Intl.NumberFormat("fa-IR").format(group.items.length) : point.listingType === "RENT" ? "اجاره" : "فروش"}</span></button>;
        })}
        {visibleNearbyPlaces.map((place) => {
          const projected = worldPoint(place.latitude, place.longitude, zoom);
          const left = size.width / 2 + projected.x - centerWorld.x;
          const top = size.height / 2 + projected.y - centerWorld.y;
          if (left < -20 || left > size.width + 20 || top < -24 || top > size.height + 20) return null;
          return <button key={place.id} type="button" className={`hy-map-poi-marker${selectedPlaceId === place.id ? " is-selected" : ""}`} style={{ left, top }} onClick={() => setSelectedPlaceId(place.id)} aria-label={`${place.name}، ${formatDistance(place.distance || 0)}`} title={`${place.name} · ${formatDistance(place.distance || 0)}`}><span>{place.icon}</span></button>;
        })}
        {approximateLocation && (() => {
          const projected = worldPoint(approximateLocation.latitude, approximateLocation.longitude, zoom);
          const left = size.width / 2 + projected.x - centerWorld.x;
          const top = size.height / 2 + projected.y - centerWorld.y;
          return left > -24 && left < size.width + 24 && top > -30 && top < size.height + 24
            ? <div className="hy-map-user-location" style={{ left, top }} title="محدودهٔ تقریبی اتصال اینترنت شما"><span /><b>محدودهٔ تقریبی شما</b></div>
            : null;
        })()}
        <div className="hy-map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</div>
      </div>
      {selected && <div className="hy-map-selected">
        {selected.imageUrl ? <img src={selected.imageUrl || undefined} alt="" /> : <div className="hy-map-no-image">⌂</div>}
        <div className="hy-map-selected-copy"><span>{selected.city} · {selected.listingType === "RENT" ? (selected.rentalPeriod === "DAILY" ? "اجاره روزانه" : selected.rentalPeriod === "WEEKLY" ? "اجاره هفتگی" : selected.rentalPeriod === "HOURLY" ? "اجاره ساعتی" : "اجاره بلندمدت") : "فروش"}{selected.urgentSale && selected.listingType === "SALE" ? " · فروش فوری" : ""}</span><strong>{selected.title}</strong><b>{formatMoney(selected.price, selected.currency)}</b></div>
        <Link href={`/listings/${selected.id}`}>جزئیات ملک <span aria-hidden="true">←</span></Link>
      </div>}
      <section className="hy-map-nearby" aria-label="امکانات اطراف ملک انتخاب‌شده">
        <div className="hy-map-nearby-head"><div><strong>امکانات اطراف {selected ? "ملک انتخاب‌شده" : "محدوده"}</strong><span>{nearbyLoading ? "در حال جست‌وجو در نقشه…" : `${visibleNearbyPlaces.length.toLocaleString("fa-IR")} مکان نزدیک`}</span></div><div className="hy-map-radius" aria-label="شعاع جست‌وجوی امکانات">{[500,1000,3000,5000].map((value) => <button key={value} type="button" aria-pressed={nearbyRadius === value} className={nearbyRadius === value ? "is-active" : ""} onClick={() => setNearbyRadius(value)}>{value < 1000 ? `${value} م` : `${value / 1000} ک‌م`}</button>)}</div></div>
        <div className="hy-map-poi-categories">{[{id:"all",label:"همه"},{id:"education",label:"آموزش"},{id:"shopping",label:"خرید"},{id:"health",label:"سلامت"},{id:"transit",label:"حمل‌ونقل"},{id:"green",label:"پارک و ورزش"},{id:"food",label:"غذا و کافه"},{id:"services",label:"خدمات"}].map((item) => <button key={item.id} type="button" aria-pressed={nearbyCategory === item.id} className={nearbyCategory === item.id ? "is-active" : ""} onClick={() => setNearbyCategory(item.id)}>{item.label}</button>)}</div>
        {nearbyError ? <div className="hy-map-nearby-state" role="status"><span>{nearbyError}</span><button type="button" onClick={() => setNearbyRetry((value) => value + 1)}>تلاش دوباره</button></div> : visibleNearbyPlaces.length ? <div className="hy-map-nearby-list">{visibleNearbyPlaces.slice(0, 8).map((place) => <button type="button" key={place.id} className={`hy-map-nearby-item${selectedPlaceId === place.id ? " is-selected" : ""}`} onClick={() => { setSelectedPlaceId(place.id); setCenter({ latitude: place.latitude, longitude: place.longitude }); setZoom((value) => Math.max(value, 14)); }}><span className="hy-map-nearby-icon">{place.icon}</span><span className="hy-map-nearby-copy"><strong>{place.name}</strong><small>{place.categoryLabel}</small></span><b>{formatDistance(place.distance || 0)}</b></button>)}</div> : <div className="hy-map-nearby-state">{nearbyLoading ? "در حال دریافت اطلاعات امکانات اطراف…" : "مکانی در این دسته و شعاع پیدا نشد؛ شعاع را بیشتر کن یا دستهٔ دیگری را انتخاب کن."}</div>}
      </section>
      <p className="hy-map-privacy">موقعیت ملک‌ها در صورت غیرفعال بودن نمایش دقیق، تقریبی است. برای تخمین محدودهٔ شما، IP اتصال به سرویس موقعیت‌یابی ارسال می‌شود؛ GPS استفاده نمی‌شود و نتیجه ممکن است دقیق نباشد.{locationUnavailable ? " موقعیت تقریبی اتصال اینترنت در دسترس نیست." : ""} فاصله‌ها خط مستقیم و تقریبی‌اند؛ فاصلهٔ مسیر واقعی متفاوت است. امکانات از OpenStreetMap/Overpass می‌آیند و ممکن است کامل نباشند.</p>
    </div>
  );
}
