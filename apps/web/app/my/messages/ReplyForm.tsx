"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type Props = {
  replyToId: string;
};

export default function ReplyForm({ replyToId }: Props) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || message.trim().length < 2) return;

    setBusy(true);
    setError("");
    setSent(false);

    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(replyToId)}/reply`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "ارسال پاسخ ناموفق بود.");
      }

      setMessage("");
      setSent(true);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "خطایی هنگام ارسال پاسخ رخ داد."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hm-reply-form" onSubmit={submit}>
      <label htmlFor={`reply-${replyToId}`}>
        پاسخ به پیام
      </label>

      <textarea
        id={`reply-${replyToId}`}
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          setSent(false);
        }}
        placeholder="پاسخت را اینجا بنویس..."
        minLength={2}
        maxLength={2000}
        rows={3}
        required
        disabled={busy}
      />

      <div className="hm-reply-footer">
        <small>
          {message.length.toLocaleString("fa-IR")} / ۲۰۰۰
        </small>

        <button
          type="submit"
          disabled={busy || message.trim().length < 2}
        >
          {busy ? "در حال ارسال..." : "ارسال پاسخ ←"}
        </button>
      </div>

      {error && (
        <p className="hm-reply-error" role="alert">
          {error}
        </p>
      )}

      {sent && (
        <p className="hm-reply-success" role="status">
          پاسخ با موفقیت ثبت شد.
        </p>
      )}
    </form>
  );
}