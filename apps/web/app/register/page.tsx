"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "ثبت‌نام انجام نشد. اطلاعات را بررسی کنید.");
        return;
      }

      router.push("/login?registered=1");
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

      <div className={`${styles.container} ${styles.registerContainer}`}>
        <section className={`${styles.card} ${styles.registerCard}`} aria-labelledby="register-title">
          <div className={styles.brandMark} aria-hidden="true">⌂</div>

          <div className={styles.heading}>
            <span className={styles.eyebrow}>به خانوادهٔ خانه‌یار بپیوندید</span>
            <h1 id="register-title">حساب کاربری بسازید</h1>
            <p>چند قدم کوتاه تا شروع جست‌وجو و مدیریت آگهی‌های شما.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="register-name">نام و نام خانوادگی</label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="نام کامل شما"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="register-email">آدرس ایمیل</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="register-phone">
                شمارهٔ تماس <span className={styles.optional}>اختیاری</span>
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="شماره تماس شما"
                dir="ltr"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="register-password">رمز عبور</label>
              <div className={styles.passwordWrap}>
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
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
              <span className={styles.hint}>برای امنیت بیشتر، رمز عبور قوی انتخاب کنید.</span>
            </div>

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
                  در حال ساخت حساب...
                </>
              ) : (
                <>ساخت حساب کاربری <span aria-hidden="true">←</span></>
              )}
            </button>
          </form>

          <div className={styles.switchAuth}>
            قبلاً ثبت‌نام کرده‌اید؟
            <Link href="/login">وارد حساب شوید</Link>
          </div>

          <Link href="/" className={styles.backHome}>
            <span aria-hidden="true">→</span> بازگشت به صفحهٔ اصلی
          </Link>
        </section>

        <aside className={styles.sidePanel}>
          <span className={styles.sideBadge}>شروعی ساده، انتخابی بهتر</span>
          <h2>مسیر پیدا کردن<br />خانهٔ دلخواهتان.</h2>
          <p>
            با ساخت حساب در خانه‌یار، برای ثبت آگهی، پیگیری درخواست‌ها
            و ارتباط با دیگر کاربران آماده می‌شوید.
          </p>
          <div className={styles.sideArt} aria-hidden="true">
            <span className={styles.artCircle} />
            <span className={styles.artHouse}>⌂</span>
            <span className={styles.artDot}>✦</span>
          </div>
          <div className={styles.sideFoot}>
            <span>●</span> حساب شما، شروع تجربه‌ای تازه
          </div>
        </aside>
      </div>
    </main>
  );
}