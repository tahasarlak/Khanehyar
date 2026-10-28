"use client";
import { useEffect, useState } from "react";
export default function ListingViewTracker({ listingId, initialCount }: { listingId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  useEffect(() => {
    const key = `kh-listing-view:${listingId}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* continue if storage is disabled */ }
    void fetch(`/api/listings/${encodeURIComponent(listingId)}/view`, { method: "POST", credentials: "same-origin", keepalive: true })
      .then(async (response) => { if (!response.ok) return; const data = await response.json() as { viewCount?: number }; if (typeof data.viewCount === "number") setCount(data.viewCount); })
      .catch(() => undefined);
  }, [listingId]);
  return <span>{count.toLocaleString("fa-IR")} بازدید</span>;
}
