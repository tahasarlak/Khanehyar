import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import PropertyCard from "./_components/PropertyCard";
import "./market.css";

export const instant = false;

const categories = [
  { name: "آپارتمان", mark: "▦", type: "APARTMENT" },
  { name: "خانه", mark: "⌂", type: "HOUSE" },
  { name: "ویلا", mark: "♧", type: "VILLA" },
  { name: "زمین", mark: "▱", type: "LAND" },
  { name: "تجاری", mark: "▤", type: "COMMERCIAL" },
];

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 6,
    select: {
      id: true,
      title: true,
      city: true,
      area: true,
      price: true,
      currency: true,
      rooms: true,
      propertyType: true,
      listingType: true,
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
    },
  });

  return (
    <div className="hy-site" dir="rtl">

      <main>
        <section className="hy-hero">
          <div className="hy-wrap hy-hero-layout">
            <div className="hy-hero-copy">
              <span className="hy-kicker">
                <span className="hy-kicker-dot" />
                تجربه‌ای تازه در بازار املاک
              </span>

              <h1>
                خانه‌ای که
                <br />
                <span>دنبالش هستی،</span>
                <br />
                همین نزدیکی‌هاست.
              </h1>

              <p>
                از آپارتمان‌های مدرن تا ویلاهای دنج،
                آگهی‌های منتشرشده را در یک فضای ساده،
                سریع و زیبا پیدا کن.
              </p>

              <form action="/search" method="get" className="hy-searchbox">
                <div className="hy-searchbox-head">
                  <span>جست‌وجوی ملک</span>
                  <span className="hy-searchbox-hint">
                    خرید، اجاره و انواع ملک
                  </span>
                </div>

                <div className="hy-search-fields">
                  <label className="hy-field">
                    <span>شهر</span>
                    <input
                      name="city"
                      type="search"
                      placeholder="نام شهر"
                      maxLength={100}
                    />
                  </label>

                  <label className="hy-field">
                    <span>نوع معامله</span>
                    <select name="deal" defaultValue="">
                      <option value="">همه معاملات</option>
                      <option value="SALE">خرید</option>
                      <option value="RENT">اجاره</option>
                    </select>
                  </label>

                  <label className="hy-field">
                    <span>نوع ملک</span>
                    <select name="property" defaultValue="">
                      <option value="">همه املاک</option>
                      <option value="APARTMENT">آپارتمان</option>
                      <option value="HOUSE">خانه</option>
                      <option value="VILLA">ویلا</option>
                      <option value="LAND">زمین</option>
                      <option value="COMMERCIAL">تجاری</option>
                    </select>
                  </label>

                  <button
                    type="submit"
                    className="hy-button hy-button-primary hy-search-submit ui-btn ui-btn-primary"
                  >
                    جست‌وجو ←
                  </button>
                </div>
              </form>

              <div className="hy-hero-trust">
                <span>✓ آگهی‌های دارای تأیید مدیر</span>
                <span>✓ جست‌وجوی آسان</span>
                <span>✓ ثبت آگهی آنلاین</span>
              </div>
            </div>

            <div className="hy-hero-visual" aria-hidden="true">
              <div className="hy-visual-halo" />
              <div className="hy-visual-building">
                <div className="hy-visual-roof" />
                <div className="hy-visual-windows">
                  <i /><i /><i /><i /><i /><i />
                </div>
                <div className="hy-visual-door" />
              </div>
              <div className="hy-visual-ground" />
              <div className="hy-floating-card hy-floating-card-top">
                <span>✦</span>
                خانه مناسب انتخاب تو
              </div>
              <div className="hy-floating-card hy-floating-card-bottom">
                <span>⌂</span>
                همه املاک در یک جا
              </div>
            </div>
          </div>
        </section>

        <section className="hy-section hy-categories">
          <div className="hy-wrap">
            <div className="hy-section-heading">
              <div>
                <span className="hy-overline">دسته‌بندی‌ها</span>
                <h2>دنبال چه نوع ملکی هستی؟</h2>
                <p>از دسته‌بندی مناسب جست‌وجو را شروع کن.</p>
              </div>
            </div>

            <div className="hy-category-grid">
              {categories.map((item) => (
                <Link
                  key={item.type}
                  href={`/search?property=${item.type}`}
                  className="hy-category"
                >
                  <span className="hy-category-icon" aria-hidden="true">
                    {item.mark}
                  </span>
                  <strong>{item.name}</strong>
                  <span className="hy-category-more">مشاهده ←</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="hy-section hy-listings">
          <div className="hy-wrap">
            <div className="hy-section-heading">
              <div>
                <span className="hy-overline">تازه‌ترین فرصت‌ها</span>
                <h2>جدیدترین آگهی‌های ملک</h2>
                <p>آگهی‌های منتشرشده از دیتابیس خانه‌یار</p>
              </div>
              <Link href="/search" className="hy-text-link">
                مشاهده همه آگهی‌ها ←
              </Link>
            </div>

            {listings.length ? (
              <div className="hy-property-grid">
                {listings.map((listing) => (
                  <PropertyCard
                    key={listing.id}
                    listing={listing}
                  />
                ))}
              </div>
            ) : (
              <div className="hy-empty">
                <span aria-hidden="true">⌂</span>
                <h3>هنوز آگهی منتشرشده‌ای نداریم</h3>
                <p>
                  آگهی‌ها بعد از تأیید مدیر در اینجا ظاهر می‌شوند.
                </p>
                <Link
                  href="/listings/new"
                  className="hy-button hy-button-primary ui-btn ui-btn-primary"
                >
                  ثبت اولین آگهی
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="hy-section hy-cta-section">
          <div className="hy-wrap">
            <div className="hy-cta">
              <div>
                <span className="hy-overline">مخصوص مالکان و مشاوران</span>
                <h2>ملکت را با خانه‌یار معرفی کن.</h2>
                <p>
                  آگهی جدید ثبت کن و وضعیت بررسی آن را از
                  پنل کاربری دنبال کن.
                </p>
              </div>

              <Link href="/listings/new" className="hy-button hy-button-light ui-btn ui-btn-outline">
                ثبت آگهی جدید ←
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}