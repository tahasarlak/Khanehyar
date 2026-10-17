"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./UnreadMessagesLink.module.css";

type CountResponse = {
  unread?: number;
};

export default function UnreadMessagesLink() {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;

    async function refresh() {
      if (document.visibilityState === "hidden") return;

      controller?.abort();
      const current = new AbortController();
      controller = current;

      try {
        const response = await fetch("/api/my/messages/unread", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: current.signal,
        });

        if (!response.ok) {
          if (mounted && !current.signal.aborted) {
            setUnread(null);
          }
          return;
        }

        const data = (await response.json()) as CountResponse;

        if (
          mounted &&
          !current.signal.aborted &&
          typeof data.unread === "number" &&
          Number.isInteger(data.unread) &&
          data.unread >= 0
        ) {
          setUnread(data.unread);
        }
      } catch {
        // Keep the last successful count during temporary network errors.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function onFocus() {
      void refresh();
    }

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Link
      href="/my/messages"
      className={styles.root}
      aria-label={
        unread && unread > 0
          ? `پیام‌های من، ${unread.toLocaleString("fa-IR")} پیام خوانده‌نشده`
          : "پیام‌های من"
      }
    >
      <span className={styles.icon} aria-hidden="true">
        ✉
      </span>

      <span>پیام‌های من</span>

      {unread !== null && unread > 0 && (
        <span className={styles.count}>
          {unread > 99 ? "+۹۹" : unread.toLocaleString("fa-IR")}
        </span>
      )}
    </Link>
  );
}