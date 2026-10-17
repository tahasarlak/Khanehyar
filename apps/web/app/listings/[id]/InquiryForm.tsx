"use client";

import Link from "next/link";
import { useState } from "react";

export default function InquiryForm({
  listingId,
}: {
  listingId: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/listings/${encodeURIComponent(listingId)}/inquiries`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );

      if (response.status === 401) {
        setLoginRequired(true);
        return;
      }

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || "ارسال پیام ناموفق بود.");
        return;
      }

      setSuccess(true);
      setMessage("");
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="hd-inquiry-success" role="status">
        <strong>پیامت ارسال شد.</strong>
        <p>آگهی‌دهنده می‌تواند آن را در صندوق پیام‌هایش مشاهده کند.</p>
        <Link href="/my/messages">مشاهده صندوق پیام‌ها</Link>
      </div>
    );
  }

  return (
    <form className="hd-inquiry-form" onSubmit={send}>
      <h3>پیام به آگهی‌دهنده</h3>
      <p>
        درباره شرایط بازدید یا اطلاعات بیشتر ملک سؤال بپرس.
      </p>

      <label htmlFor="inquiry-message">متن پیام</label>

      <textarea
        id="inquiry-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        minLength={20}
        maxLength={2000}
        required
        rows={5}
        placeholder="سلام، درباره این ملک و امکان بازدید سؤال داشتم..."
        disabled={busy || loginRequired}
      />

      <small>
        {message.length.toLocaleString("fa-IR")} / ۲۰۰۰ کاراکتر
      </small>

      {error && (
        <p className="hd-inquiry-error" role="alert">
          {error}
        </p>
      )}

      {loginRequired ? (
        <Link
          href={`/login?next=${encodeURIComponent(
            `/listings/${listingId}`
          )}`}
          className="hd-action-primary"
        >
          برای ارسال پیام وارد شوید
        </Link>
      ) : (
        <button
          type="submit"
          className="hd-action-primary"
          disabled={busy || message.trim().length < 20}
        >
          {busy ? "در حال ارسال..." : "ارسال پیام"}
        </button>
      )}
    </form>
  );
}