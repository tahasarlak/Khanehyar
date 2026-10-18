import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import PropertyCard from "../../_components/PropertyCard";
import FavoriteButton from "../../_components/FavoriteButton";
import "../../market.css";
import "./favorites.css";

export const instant = false;

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="hy-site hy-favorites-page kh-favorites-dashboard" dir="rtl">
        <div className="hy-wrap hy-favorites-inner">
          <Link href="/" className="hy-results-home">
            خانه‌یار
          </Link>

          <div className="hy-empty">
            <span aria-hidden="true">♡</span>
            <h1>علاقه‌مندی‌های من</h1>
            <p>
              برای مشاهده آگهی‌های ذخیره‌شده وارد حساب خود شوید.
            </p>
            <Link
              href="/login?next=%2Ffavorites"
              className="hy-button hy-button-primary"
            >
              ورود به حساب
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
      listing: { status: "PUBLISHED" },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      listing: {
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
      },
    },
  });

  return (
    <main className="hy-site hy-favorites-page kh-favorites-dashboard" dir="rtl">
<div className="hy-wrap hy-favorites-inner">
        <div className="hy-section-heading">
          <div>
            <span className="hy-overline">فهرست شخصی</span>
            <h2>آگهی‌های ذخیره‌شده</h2>
            <p>
              {favorites.length.toLocaleString("fa-IR")}
              {" "}آگهی در این صفحه
            </p>
          </div>

          <Link href="/search" className="hy-text-link">
            جست‌وجوی ملک جدید ←
          </Link>
        </div>

        {favorites.length ? (
          <div className="hy-property-grid">
            {favorites.map(({ listing }) => (
              <div key={listing.id} className="hy-favorite-item">
                <PropertyCard listing={listing} />
                <FavoriteButton listingId={listing.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="hy-empty">
            <span aria-hidden="true">♡</span>
            <h2>هنوز آگهی ذخیره نکرده‌ای</h2>
            <p>
              وارد صفحه یک ملک شو و با دکمه قلب آن را ذخیره کن.
            </p>
            <Link href="/search" className="hy-button hy-button-primary">
              مشاهده آگهی‌ها
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}