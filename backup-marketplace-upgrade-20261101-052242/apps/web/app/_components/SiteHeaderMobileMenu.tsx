"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignOutButton from "./SignOutButton";
import styles from "./SiteHeader.module.css";

type Props = {
  authenticated: boolean;
  userName: string;
  userInitial: string;
  isAdmin: boolean;
};

/* KHANEHYAR_SITEWIDE_HEADER_V1 */
export default function SiteHeaderMobileMenu({
  authenticated,
  userName,
  userInitial,
  isAdmin,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={styles.mobileMenu} ref={rootRef}>
      <button
        type="button"
        className={styles.menuToggle}
        aria-label={open ? "بستن منوی اصلی" : "باز کردن منوی اصلی"}
        aria-expanded={open}
        aria-controls="khanehyar-mobile-site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.menuToggleLines} aria-hidden="true"><i /><i /><i /></span>
      </button>

      {open ? (
        <div className={styles.mobilePanel} id="khanehyar-mobile-site-menu">
          <div className={styles.mobilePanelHead}>
            {authenticated ? (
              <Link href="/dashboard" className={styles.mobileAccount} onClick={close}>
                <span className={styles.mobileAvatar} aria-hidden="true">{userInitial}</span>
                <span className={styles.mobileAccountCopy}>
                  <strong>{userName}</strong>
                  <small>مشاهده حساب کاربری</small>
                </span>
              </Link>
            ) : (
              <div className={styles.mobileWelcome}>
                <strong>به خانه‌یار خوش آمدید</strong>
                <small>خرید، فروش و اجاره ملک</small>
              </div>
            )}
            <span className={styles.mobilePanelTag}>منوی اصلی</span>
          </div>

          <nav className={styles.mobileNav} aria-label="منوی اصلی موبایل">
            <Link href="/" onClick={close}><span aria-hidden="true">⌂</span><span>خانه</span></Link>
            <Link href="/search" onClick={close}><span aria-hidden="true">⌕</span><span>جست‌وجوی ملک</span></Link>
            <Link href="/search?deal=SALE" onClick={close}><span aria-hidden="true">↗</span><span>خرید ملک</span></Link>
            <Link href="/search?deal=RENT" onClick={close}><span aria-hidden="true">⌂</span><span>اجاره ملک</span></Link>
            {authenticated ? <Link href="/dashboard" onClick={close}><span aria-hidden="true">▦</span><span>داشبورد</span></Link> : null}
            {authenticated ? <Link href="/dashboard/listings" onClick={close}><span aria-hidden="true">▤</span><span>آگهی‌های من</span></Link> : null}
            {authenticated ? <Link href="/dashboard/messages" onClick={close}><span aria-hidden="true">✉</span><span>پیام‌ها</span></Link> : null}
            {authenticated ? <Link href="/dashboard/notifications" onClick={close}><span aria-hidden="true">♧</span><span>اعلان‌ها</span></Link> : null}
            {authenticated ? <Link href="/dashboard/favorites" onClick={close}><span aria-hidden="true">♡</span><span>علاقه‌مندی‌ها</span></Link> : null}
            {authenticated ? <Link href="/dashboard/settings" onClick={close}><span aria-hidden="true">⚙</span><span>تنظیمات</span></Link> : null}
            {authenticated ? <Link href="/profile" onClick={close}><span aria-hidden="true">◎</span><span>پروفایل</span></Link> : null}
            {isAdmin ? <Link href="/admin/listings" onClick={close}><span aria-hidden="true">⚙</span><span>مدیریت</span></Link> : null}
          </nav>

          <div className={styles.mobilePanelActions}>
            <Link href="/listings/new" className="ui-btn ui-btn-primary" onClick={close}>＋ ثبت آگهی</Link>
            {authenticated ? (
              <>
                <Link href="/dashboard" className="ui-btn ui-btn-outline" onClick={close}>حساب کاربری</Link>
                <div className={styles.mobileSignOut} onClick={close}><SignOutButton /></div>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.mobileLogin} onClick={close}>ورود</Link>
                <Link href="/register" className="ui-btn ui-btn-outline" onClick={close}>ساخت حساب</Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
