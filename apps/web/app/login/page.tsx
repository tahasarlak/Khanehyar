"use client";

import {useState, type FormEvent, useEffect} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [registeredMessage, setRegisteredMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("registered") !== "1") {
      return;
    }

    const timer = window.setTimeout(() => {
      setRegisteredMessage(
        "حساب شما با موفقیت ساخته شد. حالا وارد حساب خود شوید."
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "ورود ناموفق بود. اطلاعات را بررسی کنید.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.container}>
        <section className={styles.card} aria-labelledby="login-title">
          <div className={styles.brandMark} aria-hidden="true">⌂</div>

          <div className={styles.heading}>
            <span className={styles.eyebrow}>خوش برگشتید</span>
            <h1 id="login-title">ورود به خانه‌یار</h1>
            <p>وارد حساب خود شوید و مدیریت املاک‌تان را ادامه دهید.</p>
          </div>

          <div className={styles.benefit}>
            <span className={styles.benefitIcon} aria-hidden="true">✓</span>
            <span>آگهی‌ها و پیام‌های شما، یک‌جا و همیشه در دسترس</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="login-email">آدرس ایمیل</label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="login-password">رمز عبور</label>
              </div>
              <div className={styles.passwordWrap}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="رمز عبور خود را وارد کنید"
                  dir="ltr"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "پنهان" : "نمایش"}
                </button>
              </div>
            </div>

            {registeredMessage && (
              <p className={styles.successMessage} role="status" aria-live="polite">
                <span aria-hidden="true">✓</span>
                {registeredMessage}
              </p>
            )}

            {message && (
              <p className={styles.error} role="alert" aria-live="polite">
                {message}
              </p>
            )}

            <button
              type="submit"
              className={styles.submit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  در حال ورود...
                </>
              ) : (
                <>ورود به حساب <span aria-hidden="true">←</span></>
              )}
            </button>
          </form>

          <div className={styles.switchAuth}>
            حساب کاربری ندارید؟
            <Link href="/register">ساخت حساب جدید</Link>
          </div>

          <Link href="/" className={styles.backHome}>
            <span aria-hidden="true">→</span> بازگشت به صفحهٔ اصلی
          </Link>
        </section>

        <aside className={styles.sidePanel}>
          <span className={styles.sideBadge}>خانه‌یار؛ همراه انتخاب شما</span>
          <h2>خانهٔ بعدی‌تان را<br />با اطمینان پیدا کنید.</h2>
          <p>
            جست‌وجوی ملک، ارتباط با آگهی‌دهندگان و مدیریت درخواست‌ها
            در یک تجربهٔ ساده و یکپارچه.
          </p>
          <div className={styles.sideArt} aria-hidden="true">
            <span className={styles.artCircle} />
            <span className={styles.artHouse}>⌂</span>
            <span className={styles.artDot}>✦</span>
          </div>
          <div className={styles.sideFoot}>
            <span>●</span> شروعی مطمئن برای انتخاب خانه
          </div>
        </aside>
      </div>
    </main>
  );
}