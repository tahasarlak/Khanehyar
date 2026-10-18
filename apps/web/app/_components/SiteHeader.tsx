import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import UnreadMessagesLink from "./UnreadMessagesLink";
import SignOutButton from "./SignOutButton";
import styles from "./SiteHeader.module.css";

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className={styles.header} dir="rtl">
      <div className={`hy-wrap ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="خانه‌یار، صفحه اصلی">
          <span className={styles.logoMark} aria-hidden="true">⌂</span>
          <span className={styles.logoText}>
            <strong>خانه‌یار</strong>
            <small>انتخاب خانه، با خیال راحت</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="منوی اصلی">
          <Link href="/search">جست‌وجوی ملک</Link>
          <Link href="/search?deal=SALE">خرید ملک</Link>
          <Link href="/search?deal=RENT">اجاره ملک</Link>
          {user ? <Link href="/dashboard/listings">آگهی‌های من</Link> : null}
          {user ? <UnreadMessagesLink /> : null}
        </nav>

        <div className={styles.actions}>
          {user ? (
            <>
              <Link href="/dashboard" className={styles.account}>
                <span className={styles.accountAvatar} aria-hidden="true">{(user.name?.trim().charAt(0) || "ک").toLocaleUpperCase("fa-IR")}</span>
                <span className={styles.accountName}>{user.name?.trim() || "حساب کاربری"}</span>
              </Link>
              {user.role === "ADMIN" ? <Link href="/admin/listings" className="ui-btn ui-btn-outline">مدیریت</Link> : null}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={styles.login}>ورود</Link>
              <Link href="/register" className="ui-btn ui-btn-outline">ساخت حساب</Link>
            </>
          )}
          <Link href="/listings/new" className="ui-btn ui-btn-primary">+ ثبت آگهی</Link>
        </div>
      </div>
    </header>
  );
}
