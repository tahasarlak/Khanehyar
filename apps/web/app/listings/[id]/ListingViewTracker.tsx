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
  return <span className="hd-view-count"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>{count.toLocaleString("fa-IR")} بازدید</span></span>;
}
