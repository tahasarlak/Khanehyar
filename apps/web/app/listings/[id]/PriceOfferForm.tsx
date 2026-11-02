"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PriceOfferForm({ listingId, currency, currentPrice, isRent }: { listingId: string; currency: string; currentPrice: number; isRent: boolean }) {
  const router = useRouter();
  const [amount,setAmount] = useState("");
  const [note,setNote] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [offerOpen,setOfferOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/inquiries`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "offer", offerAmount: Number(amount), currency, note })
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
        return;
      }

      const data = await response.json() as { error?: string; conversationId?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "ارسال پیشنهاد ناموفق بود.");

      setSuccess(data.message || "پیشنهاد ارسال شد.");

      if (data.conversationId) {
        router.push(`/dashboard/messages/${encodeURIComponent(data.conversationId)}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال پیشنهاد ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="hd-price-offer-widget">
    <button
      id="hd-price-offer-toggle"
      type="button"
      className="hd-price-offer-toggle"
      aria-controls="hd-offer-form"
      aria-expanded={offerOpen}
      onClick={() => setOfferOpen(v => !v)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      {isRent ? "پیشنهاد اجاره" : "قیمت پیشنهادی"}
    </button>

    <form
      id="hd-offer-form"
      className="hd-offer-form"
      data-mobile-open={offerOpen ? "true" : "false"}
      onSubmit={submit}
    >
      <div className="hd-offer-heading-row">
        <h3>{isRent ? "پیشنهاد مبلغ اجاره" : "پیشنهاد قیمت خرید"}</h3>
        <button type="button" className="hd-offer-close" onClick={() => setOfferOpen(false)} aria-label="بستن فرم">×</button>
      </div>

      <label>
        مبلغ پیشنهادی ({currency})
        <input required type="number" min="1" max="999999999999" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder={String(Math.round(currentPrice))}/>
      </label>

      <label>
        توضیح برای آگهی‌دهنده (اختیاری)
        <textarea maxLength={1000} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="مثلاً امکان بازدید و زمان پرداخت"/>
      </label>

      <button type="submit" className="hd-offer-submit" disabled={busy}>
        {busy ? "در حال ارسال…" : "ارسال پیشنهاد در پیام‌رسان"}
      </button>

      {error && <p role="alert" className="hd-offer-error">{error}</p>}
      {success && <p role="status">{success}</p>}
    </form>
  </div>;
}