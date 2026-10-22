"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Item = { id: string; type: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string };
export default function NotificationCenter() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const seenIds = useRef(new Set<string>());
  const initialized = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const data = await response.json() as { items?: Item[]; unread?: number };
      if (Array.isArray(data.items)) {
        if (initialized.current && document.visibilityState === "hidden" && typeof Notification !== "undefined" && Notification.permission === "granted") {
          const fresh = data.items.filter((item) => !seenIds.current.has(item.id) && !item.readAt);
          if (fresh.length) {
            const item = fresh[0];
            try { new Notification(item.title, { body: item.body, tag: `khanehyar-notification-${item.id}`, data: { href: item.href } }); } catch { /* Optional browser notification. */ }
          }
        }
        for (const item of data.items) seenIds.current.add(item.id);
        initialized.current = true;
        setItems(data.items);
      }
      setUnread(typeof data.unread === "number" ? data.unread : 0);
    } catch { /* The message inbox remains usable if notifications are temporarily unavailable. */ }
  }, []);
  useEffect(() => {
    void refresh();
    if (typeof Notification !== "undefined") setBrowserPermission(Notification.permission);
    void fetch("/api/notifications/preferences", { cache: "no-store", credentials: "same-origin" }).then((response) => response.ok ? response.json() as Promise<{ emailNotificationsEnabled?: boolean }> : null).then((data) => { if (data && typeof data.emailNotificationsEnabled === "boolean") setEmailEnabled(data.emailNotificationsEnabled); }).catch(() => undefined);
    const timer = window.setInterval(() => { void refresh(); }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  async function enableBrowser() {
    if (typeof Notification === "undefined") { setBrowserPermission("unsupported"); return; }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  }
  async function toggleEmail() {
    setSavingEmail(true); setError("");
    try {
      const response = await fetch("/api/notifications/preferences", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailNotificationsEnabled: !emailEnabled }) });
      const data = await response.json() as { error?: string; emailNotificationsEnabled?: boolean };
      if (!response.ok || typeof data.emailNotificationsEnabled !== "boolean") throw new Error(data.error || "تنظیم اعلان ایمیلی ذخیره نشد.");
      setEmailEnabled(data.emailNotificationsEnabled);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تنظیم اعلان ایمیلی ذخیره نشد."); }
    finally { setSavingEmail(false); }
  }
  async function markRead(item: Item) {
    if (!item.readAt) {
      try {
        const response = await fetch(`/api/notifications/${encodeURIComponent(item.id)}/read`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (!response.ok) throw new Error("خوانده‌شدن اعلان ثبت نشد.");
        setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
        setUnread((current) => Math.max(0, current - 1));
      } catch { setError("وضعیت اعلان به‌روزرسانی نشد."); }
    }
  }
  async function markAll() {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0); setError("");
    } catch { setError("اعلان‌ها خوانده‌شده نشدند."); }
  }
  return <div className="hm-notification-center">
    <button type="button" className="hm-notification-trigger" aria-expanded={open} onClick={() => { setOpen((value) => !value); setError(""); }}>
      اعلان‌ها {unread > 0 && <span>{unread > 99 ? "۹۹+" : unread.toLocaleString("fa-IR")}</span>}
    </button>
    {open && <section className="hm-notification-popover" aria-label="اعلان‌ها">
      <header><strong>اعلان‌های خانه‌یار</strong><button type="button" onClick={() => void markAll()} disabled={unread === 0}>همه خوانده شد</button></header>
      <div className="hm-notification-settings"><span>اعلان ایمیلی</span><button type="button" onClick={() => void toggleEmail()} disabled={savingEmail}>{savingEmail ? "ذخیره…" : emailEnabled ? "فعال" : "غیرفعال"}</button></div>
      <div className="hm-notification-settings"><span>اعلان مرورگر</span><button type="button" onClick={() => void enableBrowser()} disabled={browserPermission === "granted" || browserPermission === "unsupported"}>{browserPermission === "granted" ? "فعال" : browserPermission === "denied" ? "مسدود در مرورگر" : browserPermission === "unsupported" ? "پشتیبانی نمی‌شود" : "فعال‌سازی"}</button></div>
      {error && <p role="alert">{error}</p>}
      {items.length === 0 ? <p className="hm-notification-empty">اعلانی ندارید.</p> : <div className="hm-notification-items">{items.map((item) => {
        const content = <><strong>{item.title}</strong><span>{item.body}</span><time>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}</time></>;
        return item.href ? <Link key={item.id} href={item.href} className={`hm-notification-item${item.readAt ? "" : " is-unread"}`} onClick={() => { void markRead(item); setOpen(false); }}>{content}</Link> : <button key={item.id} type="button" className={`hm-notification-item${item.readAt ? "" : " is-unread"}`} onClick={() => void markRead(item)}>{content}</button>;
      })}</div>}
    </section>}
  </div>;
}
