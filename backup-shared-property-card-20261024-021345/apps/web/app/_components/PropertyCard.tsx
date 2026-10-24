import Image from "next/image";
import Link from "next/link";

export type PropertyCardData = {
  id: string;
  title: string;
  city: string;
  area: { toString(): string };
  price: { toString(): string };
  currency: string;
  rooms: number | null;
  propertyType: string;
  listingType: string;
  images: { url: string }[];
};

const typeNames: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "تجاری",
};

const currencyNames: Record<string, string> = {
  RUB: "روبل",
  IRR: "ریال",
  IRT: "تومان",
  USD: "دلار",
  EUR: "یورو",
};

export default function PropertyCard({
  listing,
}: {
  listing: PropertyCardData;
}) {
  const photo = listing.images[0]?.url;
  const amount = Number(listing.price.toString());

  const price = Number.isFinite(amount)
    ? new Intl.NumberFormat("fa-IR", {
        maximumFractionDigits: 0,
      }).format(amount)
    : listing.price.toString();

  const area = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(Number(listing.area.toString()));

  return (
    <article className="hy-property">
      <Link
        className="hy-property-link"
        href={`/listings/${encodeURIComponent(listing.id)}`}
        aria-label={`مشاهده آگهی ${listing.title}`}
      >
        <div className="hy-property-image">
          {photo ? (
            <Image
              src={photo}
              alt={`تصویر ملک ${listing.title}`}
              fill
              unoptimized
              sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
              className="hy-property-photo"
            />
          ) : (
            <div className="hy-property-placeholder">
              <span aria-hidden="true">⌂</span>
              <small>خانه‌یار</small>
            </div>
          )}

          <span className="hy-property-badge">
            {listing.listingType === "RENT" ? "اجاره" : "فروش"}
          </span>
        </div>

        <div className="hy-property-body">
          <div className="hy-property-meta">
            <span>{typeNames[listing.propertyType] ?? "ملک"}</span>
            <span aria-hidden="true">•</span>
            <span>{listing.city}</span>
          </div>

          <h3 className="hy-property-title">{listing.title}</h3>

          <div className="hy-property-specs">
            <span>{area} متر مربع</span>
            {listing.rooms !== null && (
              <span>{listing.rooms.toLocaleString("fa-IR")} اتاق</span>
            )}
          </div>

          <div className="hy-property-bottom">
            <div>
              <small>قیمت درج‌شده</small>
              <strong>
                {price} {currencyNames[listing.currency] ?? listing.currency}
              </strong>
            </div>
            <span className="hy-property-arrow" aria-hidden="true">
              ←
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}