import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import UnreadMessagesLink from "./UnreadMessagesLink";
import SignOutButton from "./SignOutButton";
import SiteHeaderMobileMenu from "./SiteHeaderMobileMenu";
import styles from "./SiteHeader.module.css";

/* KHANEHYAR_CIAN_INSPIRED_HEADER_V2 */
export default async function SiteHeader() {
  const user = await getCurrentUser();
  const userName = user?.name?.trim() || "کاربر خانه‌یار";
  const userInitial = (user?.name?.trim() || "ک").slice(0, 1).toLocaleUpperCase("fa-IR");

  return (
    <header className={styles.header} dir="rtl">
      <div className={`hy-wrap ${styles.inner}`}>
        <div className={styles.topRow}>
          <Link href="/" className={styles.logo} aria-label="خانه‌یار، صفحه اصلی">
            <span className={styles.logoMark} aria-hidden="true">⌂</span>
            <span className={styles.logoText}>
              <strong>خانه‌یار</strong>
              <small>انتخاب خانه، با خیال راحت</small>
            </span>
          </Link>

          <div className={styles.actions} aria-label="ابزارهای کاربری">
            <Link href="/search?view=map" className={styles.utilityLink}>
              <span aria-hidden="true">⌖</span><span>جست‌وجو روی نقشه</span>
            </Link>
            {user ? (
              <>
                <Link href="/dashboard/favorites" className={styles.iconLink} aria-label="علاقه‌مندی‌ها" title="علاقه‌مندی‌ها">♡</Link>
                <Link href="/dashboard/notifications" className={styles.iconLink} aria-label="اعلان‌ها" title="اعلان‌ها">♧</Link>
                <span className={styles.messageLink}><UnreadMessagesLink /></span>
                <Link href="/dashboard" className={styles.account}>
                  <span className={styles.accountAvatar} aria-hidden="true">{userInitial}</span>
                  <span className={styles.accountName}>{userName}</span>
                </Link>
                {user.role === "ADMIN" ? <Link href="/admin/listings" className={styles.adminLink}>مدیریت</Link> : null}
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/favorites" className={styles.iconLink} aria-label="علاقه‌مندی‌ها" title="علاقه‌مندی‌ها">♡</Link>
                <Link href="/login" className={styles.login}>ورود</Link>
                <Link href="/register" className={styles.register}>ساخت حساب</Link>
              </>
            )}
            <Link href="/listings/new" className={styles.create}>＋ ثبت آگهی</Link>
          </div>

          <SiteHeaderMobileMenu
            authenticated={Boolean(user)}
            userName={userName}
            userInitial={userInitial}
            isAdmin={user?.role === "ADMIN"}
          />
        </div>

        <nav className={styles.nav} aria-label="دسته‌بندی‌های اصلی">
          <Link href="/search?deal=RENT">اجاره</Link>
          <Link href="/search?deal=SALE">خرید و فروش</Link>
          <Link href="/projects">پروژه‌های ساختمانی</Link>
          <Link href="/search?property=HOUSE">خانه و ویلا</Link>
          <Link href="/search?property=COMMERCIAL">املاک تجاری</Link>
          <Link href="/stays">اجاره روزانه و اقامتگاه</Link>
          <Link href="/agents">مشاوران املاک</Link>
          <Link href="/help">خدمات و راهنما</Link>
        </nav>
      </div>
    </header>
  );
}
