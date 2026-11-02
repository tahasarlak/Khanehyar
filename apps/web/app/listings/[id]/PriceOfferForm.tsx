"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PriceOfferForm({
  listingId,
  currency,
  currentPrice,
  isRent,
}: {
  listingId: string;
  currency: string;
  currentPrice: number;
  isRent: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(Math.round(currentPrice)));
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const numericAmount = Number(amount.replace(/[ ,٬]/g, ""));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("مبلغ پیشنهادی را به‌درستی وارد کنید.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/listings/${encodeURIComponent(listingId)}/inquiries`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "offer",
            offerAmount: numericAmount,
            currency,
            note: note.trim(),
          }),
        },
      );

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
        return;
      }

      const data = await response.json() as {
        error?: string;
        conversationId?: string;
      };
      if (!response.ok) throw new Error(data.error || "ارسال پیشنهاد ناموفق بود.");

      if (data.conversationId) {
        router.push(`/dashboard/messages/${encodeURIComponent(data.conversationId)}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ارسال پیشنهاد ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hd-offer-form hd-offer-form--compact" onSubmit={submit}>
      <label className="hd-offer-amount-label">
        <span>مبلغ پیشنهادی ({currency})</span>
        <input
          aria-label={`مبلغ پیشنهادی به ${currency}`}
          required
          type="number"
          min="1"
          max="999999999999"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          inputMode="numeric"
        />
      </label>

      <div className="hd-offer-icon-actions">
        <button
          type="button"
          className={`hd-offer-note-toggle${noteOpen ? " is-active" : ""}`}
          aria-label={noteOpen ? "بستن توضیحات" : "افزودن توضیحات"}
          aria-expanded={noteOpen}
          title={noteOpen ? "بستن توضیحات" : "افزودن توضیحات"}
          onClick={() => setNoteOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
            <path d="M15 5l4 4" />
          </svg>
        </button>
        <button
          type="submit"
          className="hd-offer-send"
          aria-label="ارسال پیشنهاد قیمت"
          title="ارسال پیشنهاد قیمت"
          disabled={busy}
        >
          {busy ? (
            <span className="hd-offer-spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          )}
        </button>
      </div>

      {noteOpen && (
        <label className="hd-offer-note-field">
          <span>توضیحات (اختیاری)</span>
          <textarea
            maxLength={1000}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="توضیح کوتاهی برای آگهی‌دهنده بنویسید..."
          />
        </label>
      )}

      {error && <p role="alert" className="hd-offer-error">{error}</p>}
    </form>
  );
}
