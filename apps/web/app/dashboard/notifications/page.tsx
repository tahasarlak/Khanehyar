"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./notifications.css";

type Notice = {
  id: string;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  isRead?: boolean;
  read?: boolean;
  href?: string | null;
  url?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
};
function getItems(payload: unknown): Notice[] {
  if (Array.isArray(payload)) return payload as Notice[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const key of ["notifications", "items", "data", "results"]) if (Array.isArray(p[key])) return p[key] as Notice[];
  }
  return [];
}
function isRead(n: Notice) { return Boolean(n.isRead || n.read || n.readAt); }
function labelType(type?: string | null) {
  const t=(type||"").toLowerCase();
  if(t.includes("message")) return "پیام";
  if(t.includes("review")) return "نظر";
  if(t.includes("listing") || t.includes("property")) return "آگهی";
  if(t.includes("system")) return "سیستم";
  return "اعلان";
}
function timeLabel(value?: string | null) {
  if(!value) return "";
  const d=new Date(value); if(Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle:"medium", timeStyle:"short" }).format(d);
}
export default function NotificationsPage() {
  const [items,setItems]=useState<Notice[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState<"all"|"unread">("all");
  const [busy,setBusy]=useState<string|null>(null);
  const load=useCallback(async()=>{
    setLoading(true); setError("");
    try {
      const res=await fetch("/api/notifications",{cache:"no-store",credentials:"same-origin"});
      if(!res.ok) throw new Error(res.status===401?"برای دیدن اعلان‌ها وارد حساب کاربری شو.":"دریافت اعلان‌ها ناموفق بود.");
      setItems(getItems(await res.json()));
    } catch(e) { setError(e instanceof Error?e.message:"خطا در دریافت اعلان‌ها"); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void load(); },[load]);
  const unread=useMemo(()=>items.filter(n=>!isRead(n)).length,[items]);
  const shown=useMemo(()=>filter==="unread"?items.filter(n=>!isRead(n)):items,[items,filter]);
  async function markRead(n:Notice) {
    if(isRead(n)) return;
    setBusy(n.id);
    try {
      // Use the notification-specific read endpoint if the backend exposes it.
      const res=await fetch(`/api/notifications/${encodeURIComponent(n.id)}/read`,{method:"PATCH",credentials:"same-origin"});
      if(res.ok) setItems(old=>old.map(x=>x.id===n.id?{...x,isRead:true,read:true,readAt:new Date().toISOString()}:x));
      else if(res.status===404 || res.status===405) setError("نمایش اعلان فعال است؛ برای ثبت خوانده‌شدن، endpoint خواندن اعلان باید در API موجود باشد.");
      else setError("ثبت خوانده‌شدن اعلان انجام نشد.");
    } catch { setError("ارتباط با سرور برای ثبت اعلان خوانده‌شده برقرار نشد."); }
    finally { setBusy(null); }
  }
  return <main className="kh-notifications" dir="rtl">
    <header className="kh-notifications-head">
      <Link className="kh-notifications-back" href="/dashboard/messages" aria-label="بازگشت به پیام‌ها">‹</Link>
      <div className="kh-notifications-heading"><span className="kh-notifications-bell">♧</span><div><h1>اعلان‌ها</h1><p>{unread?`${unread.toLocaleString("fa-IR")} اعلان خوانده‌نشده`:"همه اعلان‌ها خوانده شده‌اند"}</p></div></div>
      <button className="kh-notifications-refresh" onClick={()=>void load()} disabled={loading} title="تازه‌سازی" aria-label="تازه‌سازی">↻</button>
    </header>
    <nav className="kh-notifications-tabs" aria-label="فیلتر اعلان‌ها">
      <button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>همه <span>{items.length.toLocaleString("fa-IR")}</span></button>
      <button className={filter==="unread"?"active":""} onClick={()=>setFilter("unread")}>خوانده‌نشده <span>{unread.toLocaleString("fa-IR")}</span></button>
    </nav>
    {error&&<div className="kh-notifications-error" role="status">{error}</div>}
    {loading?<div className="kh-notifications-empty"><span className="kh-notifications-spinner"/>در حال دریافت اعلان‌ها…</div>:shown.length===0?<div className="kh-notifications-empty"><span className="kh-notifications-empty-icon">♧</span><strong>{filter==="unread"?"اعلان خوانده‌نشده‌ای نداری":"هنوز اعلانی وجود ندارد"}</strong><p>اعلان‌های پیام‌ها و فعالیت‌های مربوط به آگهی‌ها اینجا نمایش داده می‌شوند.</p></div>:<section className="kh-notifications-list" aria-label="فهرست اعلان‌ها">
      {shown.map(n=>{const read=isRead(n);const href=n.href||n.url;return <article key={n.id} className={`kh-notification-row ${read?"is-read":"is-unread"}`}>
        <span className={`kh-notification-type type-${(n.type||"other").toLowerCase().replace(/[^a-z0-9_-]/g,"")}`}>{labelType(n.type)==="پیام"?"✉":labelType(n.type)==="نظر"?"☆":labelType(n.type)==="آگهی"?"⌂":"♧"}</span>
        <div className="kh-notification-content"><div className="kh-notification-title-line"><strong>{n.title||labelType(n.type)}</strong>{!read&&<span className="kh-notification-unread-dot"/>}</div><p>{n.message||n.body||"یک اعلان جدید برای شما ثبت شده است."}</p><time>{timeLabel(n.createdAt)}</time></div>
        <div className="kh-notification-actions">{href&&<Link href={href} className="kh-notification-open" onClick={()=>void markRead(n)}>مشاهده</Link>}{!read&&<button onClick={()=>void markRead(n)} disabled={busy===n.id} aria-label="علامت‌گذاری به‌عنوان خوانده‌شده" title="خوانده شد">✓</button>}</div>
      </article>})}
    </section>}
    <footer className="kh-notifications-footer"><Link href="/dashboard/messages">رفتن به پیام‌ها <span>←</span></Link></footer>
  </main>;
}