import SiteNavigation from "../../_components/SiteNavigation";
import UnreadMessagesLink from "../../_components/UnreadMessagesLink";
import InquiryForm from "./InquiryForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import PropertyGallery, { ShareListing } from "./PropertyGallery";
import FavoriteButton from "../../_components/FavoriteButton";
import "./detail.css";

export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
};

const propertyNames: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "ملک تجاری",
};

const currencyNames: Record<string, string> = {
  RUB: "روبل",
  IRR: "ریال",
  IRT: "تومان",
  USD: "دلار",
  EUR: "یورو",
};

function formatNumber(value: string, digits = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("fa-IR", {
        maximumFractionDigits: digits,
      }).format(parsed)
    : value;
}

function imageIsSafe(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: {
      id,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      description: true,
      listingType: true,
      propertyType: true,
      price: true,
      currency: true,
      area: true,
      rooms: true,
      floor: true,
      totalFloors: true,
      city: true,
      address: true,
      createdAt: true,
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 20,
        select: { url: true },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  const pictures = listing.images
    .map((item) => item.url)
    .filter(imageIsSafe);

  const isRent = listing.listingType === "RENT";
  const propertyName = propertyNames[listing.propertyType] ?? "ملک";
  const price = formatNumber(listing.price.toString());
  const area = formatNumber(listing.area.toString(), 2);
  const currency = currencyNames[listing.currency] ?? listing.currency;
  const publishedDate = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
  }).format(listing.createdAt);

  const facts: { label: string; value: string }[] = [
    { label: "نوع ملک", value: propertyName },
    { label: "نوع معامله", value: isRent ? "اجاره" : "فروش" },
    { label: "متراژ", value: `${area} متر مربع` },
    { label: "شهر", value: listing.city },
  ];

  if (listing.rooms !== null) {
    facts.push({
      label: "تعداد اتاق",
      value: listing.rooms.toLocaleString("fa-IR"),
    });
  }

  if (listing.floor !== null) {
    facts.push({
      label: "طبقه",
      value: listing.floor.toLocaleString("fa-IR"),
    });
  }

  if (listing.totalFloors !== null) {
    facts.push({
      label: "تعداد طبقات ساختمان",
      value: listing.totalFloors.toLocaleString("fa-IR"),
    });
  }

  return (
    <div className="hd-page" dir="rtl">
      <SiteNavigation />
      <header className="hd-header">
        <div className="hd-container hd-header-inner">
          <Link href="/" className="hd-brand">
            <span className="hd-brand-icon" aria-hidden="true">⌂</span>
            <strong>خانه‌یار</strong>
          </Link>

          <nav className="hd-nav" aria-label="ناوبری">
            <Link href="/search">جست‌وجوی ملک</Link>
            <Link href="/dashboard/listings">آگهی‌های من</Link>
            <UnreadMessagesLink />
            <Link href="/listings/new" className="hd-create-link">
              + ثبت آگهی
            </Link>
          </nav>
        </div>
      </header>

      <main className="hd-container">
        <nav className="hd-breadcrumb" aria-label="مسیر صفحه">
          <Link href="/">خانه‌یار</Link>
          <span>/</span>
          <Link href="/search">آگهی‌های املاک</Link>
          <span>/</span>
          <span aria-current="page">{propertyName}</span>
        </nav>

        <div className="hd-heading">
          <div>
            <div className="hd-tags">
              <span>{isRent ? "برای اجاره" : "برای فروش"}</span>
              <span>{propertyName}</span>
            </div>
            <h1>{listing.title}</h1>
            <p>⌖ {listing.city}{listing.address ? `، ${listing.address}` : ""}</p>
          </div>
          <div className="hd-favorite-actions">
            <ShareListing />
            <FavoriteButton listingId={listing.id} />
          </div>
        </div>

        <div className="hd-layout">
          <div className="hd-main-column">
            <PropertyGallery title={listing.title} images={pictures} />

            <section className="hd-panel">
              <div className="hd-section-heading">
                <span className="hd-section-icon" aria-hidden="true">▦</span>
                <div>
                  <h2>مشخصات ملک</h2>
                  <p>اطلاعات ثبت‌شده توسط آگهی‌دهنده</p>
                </div>
              </div>

              <dl className="hd-facts">
                {facts.map((fact) => (
                  <div key={fact.label} className="hd-fact">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="hd-panel">
              <div className="hd-section-heading">
                <span className="hd-section-icon" aria-hidden="true">≡</span>
                <div>
                  <h2>توضیحات آگهی</h2>
                  <p>با جزئیات بیشتری ملک را بشناس</p>
                </div>
              </div>
              <div className="hd-description">{listing.description}</div>
            </section>

            <section className="hd-panel">
              <div className="hd-section-heading">
                <span className="hd-section-icon" aria-hidden="true">⌖</span>
                <div>
                  <h2>موقعیت ملک</h2>
                  <p>اطلاعات مکانی درج‌شده در آگهی</p>
                </div>
              </div>

              <div className="hd-location">
                <strong>{listing.city}</strong>
                <p>
                  {listing.address
                    ? listing.address
                    : "نشانی دقیق برای این آگهی ثبت نشده است."}
                </p>
              </div>
            </section>
          </div>

          <aside className="hd-sidebar" aria-label="قیمت و اطلاعات آگهی">
            <div className="hd-price-card">
              <div className="hd-price-label">
                {isRent ? "مبلغ درج‌شده برای اجاره" : "قیمت پیشنهادی فروش"}
              </div>
              <div className="hd-price" dir="auto">
                {price}
                <span>{currency}</span>
              </div>

              <div className="hd-price-divider" />

              <div className="hd-info-row">
                <span>نوع معامله</span>
                <strong>{isRent ? "اجاره" : "فروش"}</strong>
              </div>

              <div className="hd-info-row">
                <span>متراژ</span>
                <strong>{area} متر مربع</strong>
              </div>

              <div className="hd-info-row">
                <span>تاریخ ثبت</span>
                <strong>{publishedDate}</strong>
              </div>

              <div className="hd-price-note">
                مبلغ از اطلاعات آگهی نمایش داده می‌شود. شرایط
                معامله و صحت مشخصات را پیش از هر توافق بررسی کنید.
              </div>

              <InquiryForm listingId={listing.id} />

              <Link href="/search" className="hd-action-primary">
                مشاهده املاک مشابه ←
              </Link>

              <Link href="/login" className="hd-action-secondary">
                ورود به حساب کاربری
              </Link>
            </div>

            <div className="hd-safety-card">
              <strong>◈ نکته امنیتی خانه‌یار</strong>
              <p>
                پیش از بازدید یا بررسی مدارک، وجهی پرداخت نکنید.
                تأیید انتشار آگهی به معنی تضمین مالکیت یا صحت
                تمام اطلاعات آن نیست.
              </p>
            </div>
          </aside>
        </div>

        <div className="hd-bottom-link">
          <Link href="/search">← بازگشت به جست‌وجوی املاک</Link>
        </div>
      </main>

      <footer className="hd-footer">
        <div className="hd-container">
          خانه‌یار — جست‌وجویی بهتر برای انتخاب خانه
        </div>
      </footer>
    </div>
  );
}