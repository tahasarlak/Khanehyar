"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AccountShell.module.css";

const links = [
  { href: "/dashboard", label: "نمای کلی", icon: "▦" },
  { href: "/dashboard/listings", label: "آگهی‌های من", icon: "⌂" },
  { href: "/listings/new", label: "ثبت آگهی جدید", icon: "＋" },
  { href: "/favorites", label: "علاقه‌مندی‌ها", icon: "♡" },
  { href: "/dashboard/messages", label: "صندوق پیام‌ها", icon: "✉" },
  { href: "/profile", label: "پروفایل من", icon: "◎" },
];

type Props = {
  children: React.ReactNode;
  userName: string;
  email: string;
  unreadMessages?: number;
  role?: string;
};

export default function AccountShell({
  children,
  userName,
  email,
  unreadMessages = 0,
  role = "USER",
}: Props) {
  const pathname = usePathname();

  const visibleLinks = role === "ADMIN"
    ? [
        ...links,
        { href: "/admin/listings", label: "مدیریت آگهی‌ها", icon: "⚙" },
        { href: "/admin/reviews", label: "مدیریت بررسی‌ها", icon: "✓" },
      ]
    : links;

  return (
    <div className={styles.shell} dir="rtl">
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}>⌂</span>
          <span>
            <strong>خانه‌یار</strong>
            <small>پنل کاربری</small>
          </span>
        </Link>

        <div className={styles.menuTitle}>مدیریت حساب</div>

        <nav className={styles.menu} aria-label="منوی حساب کاربری">
          {visibleLinks.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.menuLink} ${
                  active ? styles.active : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.menuIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.href === "/dashboard/messages" && unreadMessages > 0 && (
                  <span className={styles.badge}>
                    {unreadMessages.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link href="/search">جست‌وجوی املاک ←</Link>
          <Link href="/">بازگشت به سایت</Link>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topbarLabel}>حساب کاربری</span>
            <strong>{userName || "کاربر خانه‌یار"}</strong>
          </div>

          <div className={styles.account}>
            <span className={styles.avatar}>
              {(userName || email || "ک").charAt(0).toLocaleUpperCase("fa-IR")}
            </span>
            <span className={styles.email}>{email}</span>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </section>
    </div>
  );
}