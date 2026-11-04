import Link from "next/link";
import styles from "./SiteFooter.module.css";

/* KHANEHYAR_CIAN_INSPIRED_FOOTER_V2 */
export default function SiteFooter() {
  return (
    <footer className={styles.footer} dir="rtl">
      <div className={`hy-wrap ${styles.main}`}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.brand}>
            <span aria-hidden="true">⌂</span>
            <strong>خانه‌یار</strong>
          </Link>
          <p>
            خانه‌یار بستری برای جست‌وجو، خرید، فروش و اجاره ملک است.
            آگهی‌ها، پروژه‌های ساختمانی و مشاوران املاک را در یکجا پیدا کنید
            و با آگاهی بیشتر تصمیم بگیرید.
          </p>
          <Link href="/about" className={styles.aboutLink}>بیشتر درباره خانه‌یار ←</Link>
        </div>

        <div className={styles.column}>
          <h2>جست‌وجوی ملک</h2>
          <Link href="/search?deal=SALE">خرید آپارتمان و خانه</Link>
          <Link href="/search?deal=RENT">اجاره بلندمدت</Link>
          <Link href="/stays">اجاره روزانه و اقامتگاه</Link>
          <Link href="/search?property=VILLA">ویلا و خانه</Link>
          <Link href="/search?property=LAND">زمین</Link>
          <Link href="/search?property=COMMERCIAL">ملک تجاری</Link>
          <Link href="/search?view=map">جست‌وجو روی نقشه</Link>
        </div>

        <div className={styles.column}>
          <h2>بازار املاک</h2>
          <Link href="/projects">پروژه‌های ساختمانی</Link>
          <Link href="/agents">مشاوران املاک</Link>
          <Link href="/search?sort=popular">آگهی‌های پربازدید</Link>
          <Link href="/search?urgent=true">فروش فوری</Link>
          <Link href="/listings/new">ثبت آگهی ملک</Link>
          <Link href="/dashboard/listings">مدیریت آگهی‌ها</Link>
          <Link href="/favorites">علاقه‌مندی‌ها</Link>
        </div>

        <div className={styles.column}>
          <h2>راهنمای کاربران</h2>
          <Link href="/help">مرکز راهنما</Link>
          <Link href="/help/buying">راهنمای خرید ملک</Link>
          <Link href="/help/renting">راهنمای اجاره</Link>
          <Link href="/help/post-listing">راهنمای ثبت آگهی</Link>
          <Link href="/faq">سؤالات متداول</Link>
          <Link href="/safety">نکات ایمنی معاملات</Link>
          <Link href="/contact">تماس با ما</Link>
        </div>

        <div className={styles.column}>
          <h2>درباره خانه‌یار</h2>
          <Link href="/about">معرفی خانه‌یار</Link>
          <Link href="/support">پشتیبانی</Link>
          <Link href="/contact">ارتباط با ما</Link>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">شرایط استفاده</Link>
          <Link href="/cookies">سیاست کوکی‌ها</Link>
        </div>
      </div>

      <div className={`hy-wrap ${styles.bottom}`}>
        <span>© {2026} خانه‌یار — تمامی حقوق محفوظ است.</span>
        <span>با دقت انتخاب کن، با خیال راحت خانه پیدا کن.</span>
        <div className={styles.bottomLinks}>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">قوانین</Link>
          <Link href="/contact">تماس</Link>
        </div>
      </div>
    </footer>
  );
}
