"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SignOutButton from "./SignOutButton";
import styles from "./AccountShell.module.css";

const links = [
  { href: "/dashboard", label: "نمای کلی", icon: "▦" },
  { href: "/dashboard/listings", label: "آگهی‌های من", icon: "⌂" },
  { href: "/listings/new", label: "ثبت آگهی جدید", icon: "＋" },
  { href: "/dashboard/favorites", label: "علاقه‌مندی‌ها", icon: "♡" },
  { href: "/dashboard/messages", label: "صندوق پیام‌ها", icon: "✉" },
  { href: "/dashboard/notifications", label: "اعلان‌ها", icon: "♧" },
  { href: "/dashboard/settings", label: "تنظیمات", icon: "⚙" },
  { href: "/profile", label: "پروفایل من", icon: "◎" },
];

type Props = {
  children: React.ReactNode;
  userName: string;
  email: string;
  unreadMessages?: number;
  unreadNotifications?: number;
  role?: string;
};

function getPageTitle(pathname: string, role: string) {
  if (pathname === "/dashboard") return "نمای کلی";
  if (pathname.startsWith("/dashboard/listings/") && pathname.endsWith("/edit")) return "ویرایش آگهی";
  if (pathname === "/dashboard/listings") return "آگهی‌های من";
  if (pathname === "/listings/new") return "ثبت آگهی جدید";
  if (pathname.startsWith("/dashboard/messages/") && pathname !== "/dashboard/messages") return "گفت‌وگو";
  if (pathname === "/dashboard/messages") return "صندوق پیام‌ها";
  if (pathname.startsWith("/dashboard/notifications")) return "اعلان‌ها";
  if (pathname.startsWith("/dashboard/settings")) return "تنظیمات";
  if (pathname.startsWith("/dashboard/favorites") || pathname === "/favorites") return "علاقه‌مندی‌ها";
  if (pathname === "/profile") return "پروفایل من";
  if (pathname === "/admin/listings") return "مدیریت آگهی‌ها";
  if (pathname === "/admin/reviews") return "تاریخچه بررسی";
  if (pathname === "/admin/messages") return "گزارش‌های پیام‌رسان";
  return role === "ADMIN" ? "پنل مدیریت" : "حساب کاربری";
}

export default function AccountShell({ children, userName, email, unreadMessages = 0, unreadNotifications = 0, role = "USER" }: Props) {
  const pathname = usePathname();
  const isMessagesRoute = pathname === "/dashboard/messages" || pathname.startsWith("/dashboard/messages/");
  const isConversationRoute = pathname.startsWith("/dashboard/messages/") && pathname !== "/dashboard/messages";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const pageTitle = getPageTitle(pathname, role);

  useEffect(() => {
    try {
      setDesktopSidebarCollapsed(window.localStorage.getItem("kh-account-sidebar-collapsed") === "true");
    } catch {
      // Storage may be unavailable; the sidebar remains usable for this session.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("kh-account-sidebar-collapsed", String(desktopSidebarCollapsed));
    } catch {
      // Keep the in-memory toggle functional when storage is unavailable.
    }
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const visibleLinks = role === "ADMIN" ? [
    ...links,
    { href: "/admin/listings", label: "مدیریت آگهی‌ها", icon: "⚙" },
    { href: "/admin/reviews", label: "تاریخچه بررسی", icon: "✓" },
    { href: "/admin/messages", label: "گزارش‌های پیام‌رسان", icon: "⚑" },
  ] : links;

  return (
    <div className={`${styles.shell} ${desktopSidebarCollapsed ? styles.sidebarCollapsed : ""} kh-account-shell${isMessagesRoute ? " kh-account-shell--messages" : ""}${isConversationRoute ? " kh-account-shell--chat" : ""}`} dir="rtl">
      {mobileMenuOpen && <button type="button" className={styles.drawerBackdrop} aria-label="بستن منوی حساب کاربری" onClick={() => setMobileMenuOpen(false)} />}
      <aside id="kh-account-drawer" className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <button
          type="button"
          className={styles.sidebarMenuToggle}
          aria-label={desktopSidebarCollapsed ? "باز کردن سایدبار" : "جمع کردن سایدبار"}
          aria-expanded={!desktopSidebarCollapsed}
          aria-controls="kh-account-drawer"
          onClick={() => setDesktopSidebarCollapsed((collapsed) => !collapsed)}
        ><span /><span /><span /></button>
        <button type="button" className={styles.drawerClose} aria-label="بستن منو" onClick={() => setMobileMenuOpen(false)}>×</button>
        <Link href="/" className={styles.brand} onClick={() => setMobileMenuOpen(false)}><span className={styles.brandIcon}>⌂</span><span><strong>خانه‌یار</strong><small>{role === "ADMIN" ? "پنل مدیریت" : "پنل کاربری"}</small></span></Link>
        <div className={styles.menuTitle}>فضای کاری</div>
        <nav className={styles.menu} aria-label="منوی حساب کاربری">
          {visibleLinks.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const badgeValue = item.href === "/dashboard/messages" ? unreadMessages : item.href === "/dashboard/notifications" ? unreadNotifications : 0;
            return <Link key={item.href} href={item.href} className={`${styles.menuLink} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}>
              <span className={styles.menuIcon} aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              {badgeValue > 0 && <span className={styles.badge}>{badgeValue > 99 ? "۹۹+" : badgeValue.toLocaleString("fa-IR")}</span>}
            </Link>;
          })}
        </nav>
        <div className={styles.sidebarBottom}><Link href="/search" onClick={() => setMobileMenuOpen(false)}>جست‌وجوی املاک ←</Link><Link href="/" onClick={() => setMobileMenuOpen(false)}>بازگشت به سایت</Link><SignOutButton /></div>
      </aside>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarIdentity}>
            <button type="button" className={styles.menuToggle} aria-label={mobileMenuOpen ? "بستن منو" : desktopSidebarCollapsed ? "باز کردن سایدبار" : "جمع کردن سایدبار"} aria-expanded={mobileMenuOpen || !desktopSidebarCollapsed} aria-controls="kh-account-drawer" onClick={() => { if (window.matchMedia("(max-width: 900px)").matches) setMobileMenuOpen((open) => !open); else setDesktopSidebarCollapsed((collapsed) => !collapsed); }}><span /><span /><span /></button>
            <Link href="/" className={styles.mobileBrand} aria-label="خانه‌یار، صفحه اصلی"><span className={styles.mobileBrandIcon} aria-hidden="true">⌂</span><strong>خانه‌یار</strong></Link>
            <div className={styles.desktopIdentity}><span className={styles.topbarLabel}>{role === "ADMIN" ? "مدیریت خانه‌یار" : "حساب کاربری"}</span><strong className={styles.topbarPageTitle}>{pageTitle}</strong></div>
          </div>
          <div className={styles.topbarActions}>
            <Link href="/dashboard/notifications" className={styles.notificationLink} aria-label={`اعلان‌ها${unreadNotifications ? `، ${unreadNotifications} خوانده‌نشده` : ""}`} title="اعلان‌ها"><span aria-hidden="true">♧</span>{unreadNotifications > 0 && <b className={styles.notificationBadge}>{unreadNotifications > 99 ? "۹۹+" : unreadNotifications.toLocaleString("fa-IR")}</b>}</Link>
            <Link href="/dashboard/messages" className={styles.notificationLink} aria-label={`پیام‌ها${unreadMessages ? `، ${unreadMessages} خوانده‌نشده` : ""}`} title="پیام‌ها"><span aria-hidden="true">✉</span>{unreadMessages > 0 && <b className={styles.notificationBadge}>{unreadMessages > 99 ? "۹۹+" : unreadMessages.toLocaleString("fa-IR")}</b>}</Link>
            <Link href="/profile" className={styles.account} aria-label="مشاهده پروفایل"><span className={styles.avatar}>{(userName || email || "ک").charAt(0).toLocaleUpperCase("fa-IR")}</span><span className={styles.email}>{userName || email}</span></Link>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </section>
      <nav className={styles.mobileNav} aria-label="دسترسی سریع">
        {[{ href: "/dashboard", label: "خانه", icon: "▦" }, { href: "/dashboard/listings", label: "آگهی‌ها", icon: "⌂" }, { href: "/dashboard/messages", label: "پیام‌ها", icon: "✉" }, { href: "/dashboard/favorites", label: "علاقه‌مندی", icon: "♡" }].map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return <Link key={item.href} href={item.href} className={`${styles.mobileNavLink} ${active ? styles.mobileNavActive : ""}`} aria-current={active ? "page" : undefined}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small>{item.href === "/dashboard/messages" && unreadMessages > 0 && <b className={styles.mobileBadge}>{unreadMessages > 99 ? "۹۹+" : unreadMessages.toLocaleString("fa-IR")}</b>}</Link>;
        })}
        <button type="button" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(true)} aria-label="بیشتر" aria-controls="kh-account-drawer"><span aria-hidden="true">☰</span><small>بیشتر</small></button>
      </nav>
    </div>
  );
}
