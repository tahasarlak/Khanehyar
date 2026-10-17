"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "ثبت‌نام انجام نشد.");
        return;
      }

      setMessage("ثبت‌نام موفق بود. مرحله ورود را در ادامه پیاده‌سازی می‌کنیم.");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
    } catch {
      setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">ایجاد حساب کاربری</h1>
        <p className="mb-6 text-sm text-gray-600">
          برای ثبت آگهی و استفاده از امکانات خانه‌یار حساب بسازید.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              نام و نام خانوادگی
            </label>
            <input
              id="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder="نام شما"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder="you@example.com"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              شماره تلفن (اختیاری)
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder="شماره تماس"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder="حداقل ۸ کاراکتر"
              dir="ltr"
            />
          </div>

          {message && (
            <p role="status" aria-live="polite" className="text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          حساب دارید؟{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            ورود به حساب
          </Link>
        </p>
      </div>
    </main>
  );
}
