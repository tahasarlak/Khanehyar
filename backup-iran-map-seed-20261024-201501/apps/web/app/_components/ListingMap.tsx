"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./ListingMap.css";

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
  return `${formatted} ${currency}`;
}

export default function ListingMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [zoom, setZoom] = useState(() => initialZoom(points));
  const [center, setCenter] = useState(() => {
    if (!points.length) return { latitude: 55.751244, longitude: 37.618423 };
    return {
      latitude: points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
      longitude: points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
    };
  });
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id ?? null);
  const [dragging, setDragging] = useState(false);

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
        <div className="hy-map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</div>
      </div>
      {selected && <div className="hy-map-selected">
        {selected.imageUrl ? <img src={selected.imageUrl || undefined} alt="" /> : <div className="hy-map-no-image">⌂</div>}
        <div className="hy-map-selected-copy"><span>{selected.city} · {selected.listingType === "RENT" ? "اجاره" : "فروش"}</span><strong>{selected.title}</strong><b>{formatMoney(selected.price, selected.currency)}</b></div>
        <Link href={`/listings/${selected.id}`}>جزئیات ملک <span aria-hidden="true">←</span></Link>
      </div>}
      <p className="hy-map-privacy">موقعیت‌ها در صورت غیرفعال بودن نمایش موقعیت دقیق، به‌صورت تقریبی نشان داده می‌شوند.</p>
    </div>
  );
}
