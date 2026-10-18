"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  listingId: string;
  counterpartId: string;
  unreadCount: number;
};

export default function MarkReadButton({
  listingId,
  counterpartId,
  unreadCount,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function markAsRead() {
    if (busy || unreadCount === 0) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/my/messages/read", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          counterpartId,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "تغییر وضعیت پیام‌ها ناموفق بود."
        );
      }

      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "مشکلی در ارتباط با سرور پیش آمد."
      );
    } finally {
      setBusy(false);
    }
  }

  if (unreadCount === 0) return null;

  return (
    <div className="hm-read-action">
      <button
        type="button"
        onClick={markAsRead}
        disabled={busy}
      >
        {busy
          ? "در حال ثبت..."
          : `علامت‌گذاری ${unreadCount.toLocaleString(
              "fa-IR"
            )} پیام به‌عنوان خوانده‌شده`}
      </button>

      {error && (
        <p role="alert" className="hm-reply-error">
          {error}
        </p>
      )}
    </div>
  );
}