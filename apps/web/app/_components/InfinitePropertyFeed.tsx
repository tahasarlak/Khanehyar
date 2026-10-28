"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PropertyCard, { type PropertyCardData } from "./PropertyCard";

type FeedListing = PropertyCardData & {
  urgentSale?: boolean;
  rentalPeriod?: string | null;
  viewCount?: number;
};

type FeedResponse = {
  listings?: FeedListing[];
  hasMore?: boolean;
  nextOffset?: number;
  error?: string;
};

export default function InfinitePropertyFeed({
  initialListings,
  filterQuery,
  total,
}: {
  initialListings: FeedListing[];
  filterQuery: string;
  total: number;
}) {
  const [listings, setListings] = useState<FeedListing[]>(initialListings);
  const [offset, setOffset] = useState(initialListings.length);
  const [hasMore, setHasMore] = useState(initialListings.length < total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const lastRequestAt = useRef(0);

  const loadMore = useCallback(async (automatic = false) => {
    if (loadingRef.current || !hasMore) return;
    // Keep automatic scrolling from issuing a burst of requests on short screens.
    const now = Date.now();
    if (automatic && now - lastRequestAt.current < 1200) return;
    loadingRef.current = true;
    lastRequestAt.current = now;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(filterQuery);
      query.set("offset", String(offset));
      const response = await fetch(`/api/search/listings?${query.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json()) as FeedResponse;
      if (!response.ok) throw new Error(payload.error || "بارگذاری آگهی‌های بیشتر ناموفق بود.");
      const nextListings = Array.isArray(payload.listings) ? payload.listings : [];
      setListings((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...nextListings.filter((item) => !known.has(item.id))];
      });
      setOffset(typeof payload.nextOffset === "number" ? payload.nextOffset : offset + nextListings.length);
      setHasMore(Boolean(payload.hasMore) && nextListings.length > 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "اتصال برقرار نشد. دوباره تلاش کن.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filterQuery, hasMore, offset]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore(true);
    }, { rootMargin: "250px 0px", threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="hy-advanced-property-grid">
        {listings.map((listing) => <PropertyCard key={listing.id} listing={listing} />)}
      </div>
      <div className="hy-feed-status" aria-live="polite">
        <div ref={sentinelRef} className="hy-feed-sentinel" aria-hidden="true" />
        {loading && <p className="hy-feed-message" role="status">در حال بارگذاری آگهی‌های بعدی…</p>}
        {!loading && error && <div className="hy-feed-error"><p>{error}</p><button type="button" className="hy-button hy-button-secondary" onClick={() => void loadMore(false)}>تلاش دوباره</button></div>}
        {!loading && !error && hasMore && <button type="button" className="hy-button hy-feed-more" onClick={() => void loadMore(false)}>نمایش آگهی‌های بیشتر</button>}
        {!hasMore && listings.length > 0 && <p className="hy-feed-message">همهٔ {listings.length.toLocaleString("fa-IR")} آگهی این فهرست نمایش داده شد.</p>}
      </div>
    </>
  );
}
