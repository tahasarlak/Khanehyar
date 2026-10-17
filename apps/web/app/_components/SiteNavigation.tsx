"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteNavigation.module.css";

const links = [
  {
    href: "/",
    label: "خانه",
    icon: "⌂",
    match: "home",
  },
  {
    href: "/search",
    label: "جست‌وجو",
    icon: "⌕",
    match: "search",
  },
  {
    href: "/listings/new",
    label: "ثبت آگهی",
    icon: "+",
    match: "create",
  },
  {
    href: "/favorites",
    label: "علاقه‌مندی",
    icon: "♡",
    match: "favorites",
  },
  {
    href: "/my/messages",
    label: "پیام‌ها",
    icon: "✉",
    match: "messages",
  },
  {
    href: "/dashboard",
    label: "حساب من",
    icon: "▦",
    match: "dashboard",
  },
] as const;

function isActive(pathname: string, match: string): boolean {
  if (match === "home") {
    return pathname === "/";
  }

  if (match === "create") {
    return pathname === "/listings/new";
  }

  if (match === "search") {
    return pathname === "/search" ||
      (pathname.startsWith("/listings/") &&
        pathname !== "/listings/new");
  }

  if (match === "dashboard") {
    return pathname.startsWith("/dashboard");
  }

  if (match === "messages") {
    return pathname.startsWith("/my/messages");
  }

  if (match === "favorites") {
    return pathname === "/favorites";
  }

  return false;
}
export default function SiteNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.dock} aria-label="دسترسی سریع خانه‌یار" dir="rtl">
      {links.map((link) => {
        const active = isActive(pathname, link.match);

        return (
          <Link
            href={link.href}
            key={link.href}
            className={[
              styles.link,
              active ? styles.active : "",
              link.match === "create" ? styles.create : "",
            ].filter(Boolean).join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.icon} aria-hidden="true">
              {link.icon}
            </span>
            <span className={styles.label}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}