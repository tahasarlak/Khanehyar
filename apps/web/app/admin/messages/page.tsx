"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Report = {
  id: string; reason: string; status: string; createdAt: string;
  reporter: { id: string; name: string | null; email: string };
  message: { id: string; body: string; createdAt: string; deletedAt: string | null; sender: { id: string; name: string | null; email: string }; conversation: { id: string; listing: { id: string; title: string } } };
};
export default function AdminMessageReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/message-reports", { cache: "no-store" });
      const data = await response.json() as { error?: string; reports?: Report[] };
      if (!response.ok || !Array.isArray(data.reports)) throw new Error(data.error || "دریافت گزارش‌ها ناموفق بود.");
      setReports(data.reports);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "خطا در دریافت گزارش‌ها."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function setStatus(report: Report, status: "OPEN" | "RESOLVED" | "DISMISSED") {
    setBusyId(report.id); setError("");
    try {
      const response = await fetch("/api/admin/message-reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id, status }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "ذخیره وضعیت ناموفق بود.");
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ذخیره وضعیت ناموفق بود."); }
    finally { setBusyId(null); }
  }
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-emerald-700">خانه‌یار · مدیریت اعتماد و امنیت</p><h1 className="text-2xl font-bold text-slate-900">گزارش‌های پیام‌رسان</h1></div><Link href="/admin/listings" className="text-emerald-700">بازگشت به پنل مدیریت</Link></header>
    {loading && <p>در حال دریافت گزارش‌ها…</p>}{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    {!loading && reports.length === 0 && !error && <p className="rounded-xl bg-white p-6">گزارشی ثبت نشده است.</p>}
    <div className="space-y-4">{reports.map((report) => <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{report.message.conversation.listing.title}</h2><p className="mt-1 text-sm text-slate-500">{new Date(report.createdAt).toLocaleString("fa-IR")} · وضعیت: {report.status}</p></div><Link className="text-sm text-emerald-700" href="/admin/listings">بازگشت به مدیریت ↗</Link></div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">پیام گزارش‌شده از {report.message.sender.name || report.message.sender.email}</p><p className="mt-2 whitespace-pre-wrap text-sm">{report.message.deletedAt ? "پیام پس از گزارش حذف شده است." : report.message.body}</p></div>
      <p className="mt-3 whitespace-pre-wrap text-sm"><strong>دلیل گزارش:</strong> {report.reason}</p><p className="mt-2 text-xs text-slate-500">گزارش‌دهنده: {report.reporter.name || report.reporter.email}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busyId === report.id} onClick={() => void setStatus(report, "OPEN")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">باز</button><button disabled={busyId === report.id} onClick={() => void setStatus(report, "RESOLVED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50">رسیدگی شد</button><button disabled={busyId === report.id} onClick={() => void setStatus(report, "DISMISSED")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">رد گزارش</button></div>
    </article>)}</div>
  </div></main>;
}
