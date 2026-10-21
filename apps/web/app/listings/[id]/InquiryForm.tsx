"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InquiryForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openConversation() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/inquiries`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open" }),
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
        return;
      }

      const data = await response.json() as { error?: string; conversationId?: string };
      if (!response.ok || !data.conversationId) {
        setError(data.error || "باز کردن گفت‌وگو ناموفق بود.");
        return;
      }

      router.push(`/dashboard/messages/${encodeURIComponent(data.conversationId)}`);
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hd-inquiry-form hd-messenger-entry" aria-labelledby="hd-messenger-title">
      <h3 id="hd-messenger-title">گفت‌وگو با آگهی‌دهنده</h3>
      <p>چت این ملک را باز کنید؛ پیام‌ها و پاسخ‌ها در پیام‌رسان خانه‌یار باقی می‌مانند.</p>
      <button type="button" className="hd-action-primary" onClick={openConversation} disabled={busy}>
        {busy ? "در حال باز کردن گفت‌وگو..." : "پیام به آگهی‌دهنده ←"}
      </button>
      {error && <p className="hd-inquiry-error" role="alert">{error}</p>}
    </section>
  );
}
