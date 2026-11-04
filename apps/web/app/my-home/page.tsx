import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import styles from "./my-home.module.css";


const propertyNames: Record<string, string> = {
  APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", COMMERCIAL: "ملک تجاری",
};
const statusNames: Record<string, string> = {
  PUBLISHED: "منتشرشده", PENDING: "در انتظار بررسی", REJECTED: "نیازمند اصلاح", ARCHIVED: "بایگانی‌شده",
};
const money = (value: { toString(): string }) => {
  const number = Number(value.toString());
  return Number.isFinite(number) ? new Intl.NumberFormat("fa-IR").format(number) : "—";
};

export default async function MyHomePage() {
  const user = await getCurrentUser();
  const listings = user ? await prisma.listing.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      id: true, title: true, city: true, price: true, currency: true,
      area: true, rooms: true, propertyType: true, listingType: true, status: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  }) : [];

  const [totalCount, publishedCount, pendingCount] = user ? await Promise.all([
    prisma.listing.count({ where: { ownerId: user.id, deletedAt: null } }),
    prisma.listing.count({ where: { ownerId: user.id, deletedAt: null, status: "PUBLISHED" } }),
    prisma.listing.count({ where: { ownerId: user.id, deletedAt: null, status: "PENDING" } }),
  ]) : [0, 0, 0];

  return <main className={styles.page} dir="rtl">
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>خانه‌یار | فضای اختصاصی مالک</span>
          <h1>خانه من؛ مرکز مدیریت املاک شما</h1>
          <p>ملک‌ها و آگهی‌هایت را یکجا ببین، برای فروش یا اجاره آماده شو و تصمیم‌های دقیق‌تری درباره دارایی‌ات بگیر.</p>
          <div className={styles.heroActions}>
            <Link href={user ? "/listings/new" : "/login?next=%2Flistings%2Fnew"} className={styles.primaryButton}>＋ افزودن ملک</Link>
            <Link href="/dashboard/listings" className={styles.secondaryButton}>مدیریت آگهی‌ها</Link>
          </div>
          <div className={styles.heroNote}>مدیریت اطلاعات و آگهی‌ها در یک فضای امن و ساده</div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.sun} />
          <div className={styles.building}><i/><i/><i/><i/><i/><i/><b/></div>
          <div className={styles.artTag}>⌂ <span>خانه‌ی شما</span></div>
        </div>
      </div>
    </section>

    <section className={styles.content}>
      <div className={styles.welcomeRow}>
        <div><span className={styles.eyebrow}>داشبورد مالک</span><h2>{user ? `سلام ${user.name?.trim() || "دوست عزیز"}` : "از خانه‌ات بهتر مراقبت کن"}</h2><p>{user ? "وضعیت ملک‌ها و آگهی‌های ثبت‌شده‌ات را بررسی کن." : "برای ثبت ملک و دیدن وضعیت آگهی‌ها وارد حساب کاربری شو."}</p></div>
        {!user && <Link href="/login?next=%2Fmy-home" className={styles.primaryButton}>ورود به حساب</Link>}
      </div>

      <div className={styles.stats}>
        <article><span className={styles.statIcon}>⌂</span><div><strong>{user ? totalCount : "—"}</strong><span>ملک ثبت‌شده در این فهرست</span></div></article>
        <article><span className={styles.statIcon}>✓</span><div><strong>{user ? publishedCount : "—"}</strong><span>آگهی منتشرشده</span></div></article>
        <article><span className={styles.statIcon}>◷</span><div><strong>{user ? pendingCount : "—"}</strong><span>در انتظار بررسی</span></div></article>
      </div>

      <div className={styles.sectionHeading}><div><h2>ملک‌ها و آگهی‌های من</h2><p>آخرین مواردی که با حساب شما ثبت شده‌اند.</p></div><Link href="/dashboard/listings">مشاهده همه ←</Link></div>
      {user ? (listings.length ? <div className={styles.listingGrid}>{listings.map((listing) => <article className={styles.listingCard} key={listing.id}>
        <Link href={`/listings/${listing.id}`} className={styles.listingImage} style={listing.images[0]?.url ? { backgroundImage: `url("${listing.images[0].url.replace(/"/g, "")}")` } : undefined} aria-label={listing.title}><span>{statusNames[listing.status] || listing.status}</span></Link>
        <div className={styles.listingBody}><h3><Link href={`/listings/${listing.id}`}>{listing.title}</Link></h3><p>{propertyNames[listing.propertyType] || "ملک"} · {listing.city} · {money(listing.area)} متر</p><strong>{money(listing.price)} {listing.currency === "IRT" ? "تومان" : listing.currency}</strong></div>
      </article>)}</div> : <div className={styles.empty}><span>⌂</span><h3>هنوز ملکی ثبت نکرده‌ای</h3><p>اولین ملک خودت را اضافه کن تا مدیریت آن را از همین صفحه شروع کنی.</p><Link href="/listings/new" className={styles.primaryButton}>ثبت اولین ملک</Link></div>) : <div className={styles.empty}><span>⌂</span><h3>ملک‌هایت را اینجا مدیریت کن</h3><p>پس از ورود، آگهی‌ها و ملک‌های ثبت‌شده با حساب کاربری‌ات نمایش داده می‌شوند.</p><Link href="/login?next=%2Fmy-home" className={styles.primaryButton}>ورود و مشاهده ملک‌ها</Link></div>}

      <div className={styles.featureHeading} id="valuation"><span className={styles.eyebrow}>ابزارهای خانه‌یار</span><h2>چه کمکی به مدیریت ملک می‌کنیم؟</h2><p>قابلیت‌هایی که مرحله‌به‌مرحله به فضای اختصاصی مالک اضافه می‌شوند.</p></div>
      <div className={styles.features}>
        <article><span>⌁</span><h3>بررسی ارزش ملک</h3><p>مقایسه با آگهی‌های مشابه و آماده‌سازی برآورد بازار. ارزش‌گذاری خودکار هنوز فعال نیست و قیمت قطعی نمایش داده نمی‌شود.</p><small>در حال توسعه</small></article>
        <article id="rent"><span>↗</span><h3>درآمد احتمالی اجاره</h3><p>بررسی آگهی‌های اجاره مشابه برای کمک به انتخاب قیمت مناسب و سنجش سناریوهای درآمدی.</p><small>در حال توسعه</small></article>
        <article><span>▤</span><h3>تاریخچه و وضعیت آگهی</h3><p>مدیریت آگهی‌های ثبت‌شده، مشاهده وضعیت بررسی و دسترسی سریع به اطلاعات هر ملک.</p><Link href="/dashboard/listings">رفتن به آگهی‌های من ←</Link></article>
        <article><span>⌕</span><h3>آگهی‌های مشابه</h3><p>جست‌وجوی ملک‌های مشابه در بازار بر اساس شهر، نوع ملک و شرایط معامله.</p><Link href="/search">جست‌وجوی ملک‌ها ←</Link></article>
      </div>

      <section className={styles.helpBanner}><div><h2>برای فروش یا اجاره آماده‌ای؟</h2><p>اطلاعات ملک را ثبت کن و آگهی‌ات را در خانه‌یار منتشر کن.</p></div><Link href={user ? "/listings/new" : "/login?next=%2Flistings%2Fnew"} className={styles.primaryButton}>افزودن ملک</Link></section>
    </section>
  </main>;
}
