import Link from "next/link";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer} dir="rtl">
      <div className={`hy-wrap ${styles.main}`}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.brand}><span aria-hidden="true">⌂</span> خانه‌یار</Link>
          <p>همراه شما برای پیدا کردن خانه‌ای بهتر؛ از جست‌وجو تا ارتباط با مالک.</p>
        </div>
        <div className={styles.column}>
          <h2>دسترسی سریع</h2>
          <Link href="/search">جست‌وجوی ملک</Link>
          <Link href="/search?sort=popular">آگهی‌های پربازدید</Link>
          <Link href="/search?urgent=true">فروش فوری</Link>
          <Link href="/projects">پروژه‌های ساختمانی</Link>
          <Link href="/stays">هتل و اقامتگاه</Link>
          <Link href="/agents">مشاوران و املاکی‌ها</Link>
          <Link href="/search?deal=SALE">خرید ملک</Link>
          <Link href="/search?deal=RENT">اجاره ملک</Link>
          <Link href="/listings/new">ثبت آگهی</Link>
        </div>
        <div className={styles.column}>
          <h2>خانه‌یار</h2>
          <Link href="/about">درباره ما</Link>
          <Link href="/contact">تماس با ما</Link>
          <Link href="/faq">سؤالات متداول</Link>
          <Link href="/help">راهنما</Link>
        </div>
        <div className={styles.column}>
          <h2>قوانین و امنیت</h2>
          <Link href="/safety">نکات ایمنی</Link>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">شرایط استفاده</Link>
          <Link href="/cookies">سیاست کوکی‌ها</Link>
        </div>
      </div>
      <div className={`hy-wrap ${styles.bottom}`}>
        <span>© {2026} خانه‌یار — تمامی حقوق محفوظ است.</span>
        <span>با دقت انتخاب کن، با خیال راحت خانه پیدا کن.</span>
      </div>
    </footer>
  );
}


