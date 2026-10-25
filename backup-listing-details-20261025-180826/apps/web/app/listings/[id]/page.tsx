import { getSiteOrigin } from "@/src/lib/site-url";
import Image from "next/image";
import type { Metadata } from "next";

import InquiryForm from "./InquiryForm";
import PrintListingButton from "./PrintListingButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import PropertyGallery, { ShareListing } from "./PropertyGallery";
import FavoriteButton from "../../_components/FavoriteButton";
import "./detail.css";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

const metadataPropertyNames: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "ملک تجاری",
};

const metadataCurrencyNames: Record<string, string> = {
  RUB: "روبل",
  IRR: "ریال",
  IRT: "تومان",
  USD: "دلار",
  EUR: "یورو",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findFirst({
    where: { id, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      city: true,
      propertyType: true,
      listingType: true,
      price: true,
      currency: true,
      area: true,
      monthlyRent: true,
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { url: true },
      },
    },
  });

  if (!listing) {
    return {
      title: "ملک پیدا نشد | خانه‌یار",
      robots: { index: false, follow: false },
    };
  }

  const propertyType = metadataPropertyNames[listing.propertyType] ?? "ملک";
  const dealType = listing.listingType === "RENT" ? "اجاره" : "فروش";
  const currency = metadataCurrencyNames[listing.currency] ?? listing.currency;
  const amount = listing.listingType === "RENT"
    ? (listing.monthlyRent === null
        ? null
        : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Number(listing.monthlyRent.toString())))
    : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Number(listing.price.toString()));
  const area = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Number(listing.area.toString()));
  const description = (listing.description || "").replace(/\s+/g, " ").trim();
  const seoDescription = [
    `${propertyType} برای ${dealType} در ${listing.city}`,
    `${area} متر مربع`,
    amount === null ? "جزئیات مبلغ اجاره در آگهی" : `${listing.listingType === "RENT" ? "اجاره ماهانه" : "قیمت"} ${amount} ${currency}`,
    description,
  ].filter(Boolean).join("، ").slice(0, 180);
  const baseUrl = getSiteOrigin();
  const canonical = baseUrl ? `${baseUrl}/listings/${encodeURIComponent(listing.id)}` : undefined;
  const image = listing.images[0]?.url;
  const safeImage = image
    ? (image.startsWith("/") && baseUrl
        ? `${baseUrl}${image}`
        : /^https?:\/\//i.test(image) ? image : undefined)
    : undefined;

  return {
    title: `${listing.title} | ${propertyType} برای ${dealType} در ${listing.city} | خانه‌یار`,
    description: seoDescription,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: "خانه‌یار",
      title: `${listing.title} | خانه‌یار`,
      description: seoDescription,
      url: canonical,
      images: safeImage ? [{ url: safeImage, alt: listing.title }] : undefined,
    },
    twitter: {
      card: safeImage ? "summary_large_image" : "summary",
      title: `${listing.title} | خانه‌یار`,
      description: seoDescription,
      images: safeImage ? [safeImage] : undefined,
    },
  };
}


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

function formatNumber(value: string | number, digits = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits }).format(parsed)
    : String(value);
}

function imageIsSafe(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(date);
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, status: "PUBLISHED", deletedAt: null },
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
      yearBuilt: true,
      bathrooms: true,
      parkingSpaces: true,
      hasElevator: true,
      hasStorage: true,
      heatingType: true,
      coolingType: true,
      documentType: true,
      orientation: true,
      naturalLight: true,
      furnished: true,
      readyToMove: true,
      balcony: true,
      terrace: true,
      garden: true,
      amenities: true,
      monthlyRent: true,
      deposit: true,
      allowDepositConversion: true,
      advertiserType: true,
      showExactLocation: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, avatarUrl: true, role: true, createdAt: true } },
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 20,
        select: { url: true },
      },
    },
  });

  if (!listing) notFound();

  const pictures = listing.images.map((item) => item.url).filter(imageIsSafe);
  const isRent = listing.listingType === "RENT";
  const propertyName = propertyNames[listing.propertyType] ?? "ملک";
  const currency = currencyNames[listing.currency] ?? listing.currency;
  const priceValue = Number(listing.price.toString());
  const areaValue = Number(listing.area.toString());
  const price = formatNumber(listing.price.toString());
  const area = formatNumber(listing.area.toString(), 2);
  const pricePerMeter = !isRent && areaValue > 0 && Number.isFinite(priceValue)
    ? formatNumber(priceValue / areaValue)
    : null;
  const publishedDate = formatDate(listing.createdAt);
  const updatedDate = formatDate(listing.updatedAt);
  const mapUrl = listing.showExactLocation && listing.latitude !== null && listing.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.008}%2C${listing.latitude - 0.005}%2C${listing.longitude + 0.008}%2C${listing.latitude + 0.005}&layer=mapnik&marker=${listing.latitude}%2C${listing.longitude}`
    : null;
  const mapLink = listing.showExactLocation && listing.latitude !== null && listing.longitude !== null
    ? `https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=16/${listing.latitude}/${listing.longitude}`
    : null;

  const facts: { label: string; value: string; icon: string }[] = [
    { label: "نوع ملک", value: propertyName, icon: "⌂" },
    { label: "نوع معامله", value: isRent ? "اجاره" : "فروش", icon: "↔" },
    { label: "متراژ", value: `${area} متر مربع`, icon: "▦" },
    { label: "شهر", value: listing.city, icon: "⌖" },
  ];
  if (listing.rooms !== null) facts.push({ label: "تعداد اتاق", value: listing.rooms.toLocaleString("fa-IR"), icon: "▤" });
  if (listing.floor !== null) facts.push({ label: "طبقه", value: listing.floor.toLocaleString("fa-IR"), icon: "⇅" });
  if (listing.totalFloors !== null) facts.push({ label: "تعداد طبقات ساختمان", value: listing.totalFloors.toLocaleString("fa-IR"), icon: "▥" });

  const yesNo = (value: boolean | null | undefined) => value === null || value === undefined ? null : value ? "دارد" : "ندارد";
  const detailFacts: { label: string; value: string }[] = [];
  if (listing.bathrooms !== null) detailFacts.push({ label: "سرویس بهداشتی و حمام", value: listing.bathrooms.toLocaleString("fa-IR") });
  if (listing.parkingSpaces !== null) detailFacts.push({ label: "ظرفیت پارکینگ", value: listing.parkingSpaces === 0 ? "بدون پارکینگ" : `${listing.parkingSpaces.toLocaleString("fa-IR")} خودرو` });
  if (listing.yearBuilt !== null) detailFacts.push({ label: "سال ساخت", value: listing.yearBuilt.toLocaleString("fa-IR") });
  if (listing.documentType) detailFacts.push({ label: "نوع سند", value: listing.documentType });
  if (listing.orientation) detailFacts.push({ label: "جهت ملک", value: listing.orientation });
  if (listing.naturalLight) detailFacts.push({ label: "نورگیری", value: listing.naturalLight });
  if (listing.heatingType) detailFacts.push({ label: "سیستم گرمایش", value: listing.heatingType });
  if (listing.coolingType) detailFacts.push({ label: "سیستم سرمایش", value: listing.coolingType });
  for (const [label, value] of [["آسانسور", listing.hasElevator], ["انباری", listing.hasStorage], ["مبله", listing.furnished], ["آماده سکونت", listing.readyToMove], ["بالکن", listing.balcony], ["تراس", listing.terrace], ["باغچه", listing.garden]] as const) {
    const formatted = yesNo(value);
    if (formatted) detailFacts.push({ label, value: formatted });
  }
  const amenityLabels: Record<string, string> = {
    WIFI: "اینترنت", POOL: "استخر", GYM: "سالن ورزشی", SECURITY: "نگهبانی", CCTV: "دوربین مداربسته",
    PLAYGROUND: "فضای بازی کودکان", PET_FRIENDLY: "مناسب حیوانات خانگی", AIR_CONDITIONING: "تهویه مطبوع",
    DISHWASHER: "ماشین ظرف‌شویی", WASHING_MACHINE: "ماشین لباس‌شویی", ROOFTOP: "روف‌گاردن", FIREPLACE: "شومینه",
  };

  const similarListings = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      id: { not: listing.id },
      city: listing.city,
      OR: [
        { propertyType: listing.propertyType },
        { listingType: listing.listingType },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true, title: true, city: true, area: true, price: true, currency: true,
      rooms: true, propertyType: true, listingType: true,
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1, select: { url: true } },
    },
  });

  const ownerName = listing.owner.name?.trim() || "آگهی‌دهنده خانه‌یار";
  const ownerInitial = ownerName.slice(0, 1);
  const ownerMemberSince = formatDate(listing.owner.createdAt);

  return (
    <div className="hd-page" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "RealEstateListing", name: listing.title,
        description: listing.description?.trim() || listing.title,
        datePosted: listing.createdAt.toISOString(), dateModified: listing.updatedAt.toISOString(),
        url: getSiteOrigin() ? `${getSiteOrigin()}/listings/${encodeURIComponent(listing.id)}` : undefined,
        image: pictures,
        address: { "@type": "PostalAddress", addressLocality: listing.city, streetAddress: listing.showExactLocation ? (listing.address || undefined) : undefined },
        offers: isRent && listing.monthlyRent === null
          ? undefined
          : {
              "@type": "Offer",
              price: isRent
                ? Number(listing.monthlyRent!.toString())
                : priceValue,
              priceCurrency: listing.currency,
              availability: "https://schema.org/InStock",
              businessFunction: isRent
                ? "http://purl.org/goodrelations/v1#LeaseOut"
                : "http://purl.org/goodrelations/v1#Sell",
            },
        floorSize: { "@type": "QuantitativeValue", value: areaValue, unitCode: "MTK" },
        numberOfRooms: listing.rooms ?? undefined
      }).replace(/<\//g, "<\\/") }} />
      <main className="hd-container">
        <nav className="hd-breadcrumb" aria-label="مسیر صفحه">
          <Link href="/">خانه‌یار</Link><span>/</span><Link href="/search">آگهی‌های املاک</Link><span>/</span><span aria-current="page">{propertyName}</span>
        </nav>

        <div className="hd-heading">
          <div className="hd-heading-copy">
            <div className="hd-tags"><span>{isRent ? "برای اجاره" : "برای فروش"}</span><span>{propertyName}</span></div>
            <h1>{listing.title}</h1>
            <p className="hd-address-line"><span aria-hidden="true">⌖</span>{listing.city}{listing.showExactLocation && listing.address ? `، ${listing.address}` : ""}{listing.address && !listing.showExactLocation ? " · نشانی دقیق پس از هماهنگی" : ""}</p>
            <div className="hd-heading-meta"><span>کد آگهی: {listing.id.slice(-8).toLocaleUpperCase()}</span><span>ثبت‌شده در {publishedDate}</span></div>
          </div>
          <div className="hd-favorite-actions"><ShareListing /><PrintListingButton /><FavoriteButton listingId={listing.id} /></div>
        </div>

        <PropertyGallery title={listing.title} images={pictures} />

        <div className="hd-layout">
          <div className="hd-main-column">
            <section className="hd-panel hd-overview-panel">
              <div className="hd-section-heading">
                <span className="hd-section-icon" aria-hidden="true">▦</span>
                <div><h2>نگاهی سریع به ملک</h2><p>مهم‌ترین اطلاعات برای تصمیم‌گیری در یک نگاه</p></div>
              </div>
              <div className="hd-facts">
                {facts.map((fact) => <div key={fact.label} className="hd-fact"><span className="hd-fact-icon" aria-hidden="true">{fact.icon}</span><div><dt>{fact.label}</dt><dd>{fact.value}</dd></div></div>)}
              </div>
            </section>

            {(detailFacts.length > 0 || listing.amenities.length > 0) && <section className="hd-panel hd-details-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">✦</span><div><h2>امکانات و مشخصات تکمیلی</h2><p>جزئیات فنی و امکاناتی که برای این ملک ثبت شده‌اند</p></div></div>
              {detailFacts.length > 0 && <dl className="hd-detail-grid">{detailFacts.map((fact) => <div className="hd-detail-item" key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
              {listing.amenities.length > 0 && <div className="hd-amenities"><h3>امکانات رفاهی</h3><ul>{listing.amenities.map((amenity) => <li key={amenity}><span aria-hidden="true">✓</span>{amenityLabels[amenity] ?? amenity.replace(/[_-]/g, " ")}</li>)}</ul></div>}
            </section>}

            <section className="hd-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">≡</span><div><h2>توضیحات ملک</h2><p>جزئیات ثبت‌شده توسط آگهی‌دهنده</p></div></div>
              <div className="hd-description">{listing.description?.trim() || "برای این آگهی توضیحی ثبت نشده است."}</div>
            </section>

            <section className="hd-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">⌖</span><div><h2>موقعیت و محله</h2><p>اطلاعات مکانی ثبت‌شده برای این آگهی</p></div></div>
              <div className="hd-location">
                <div className="hd-location-symbol" aria-hidden="true">⌖</div>
                <div className="hd-location-copy"><strong>{listing.city}</strong><p>{listing.showExactLocation && listing.address ? listing.address : "نشانی دقیق برای حفظ حریم خصوصی نمایش داده نمی‌شود؛ برای هماهنگی با آگهی‌دهنده تماس بگیرید."}</p><small>{mapUrl ? "نقشه بر اساس مختصات ثبت‌شده آگهی نمایش داده می‌شود." : "موقعیت روی نقشه نمایش داده نمی‌شود چون مختصات ملک ثبت نشده است."}</small></div>
              </div>
              {mapUrl && mapLink && <div className="hd-map-wrap"><iframe title={`نقشه موقعیت ${listing.title}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" className="hd-map" /><a className="hd-map-link" href={mapLink} target="_blank" rel="noreferrer">مشاهده نقشه بزرگ‌تر ↗</a></div>}
              <p className="hd-privacy-note">برای حفظ حریم خصوصی، پیش از مراجعه حضوری موقعیت و نشانی را با آگهی‌دهنده هماهنگ کنید.</p>
            </section>

            <section className="hd-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">♙</span><div><h2>درباره آگهی‌دهنده</h2><p>اطلاعات عمومی حساب کاربری</p></div></div>
              <div className="hd-owner-card">
                {listing.owner.avatarUrl ? <Image src={listing.owner.avatarUrl} alt={`تصویر ${ownerName}`} width={58} height={58} unoptimized className="hd-owner-avatar-image" /> : <div className="hd-owner-avatar" aria-hidden="true">{ownerInitial}</div>}
                <div className="hd-owner-details"><strong>{ownerName}</strong><span>{listing.owner.role === "ADMIN" ? "حساب مدیر" : "عضو خانه‌یار"}</span><small>عضویت از {ownerMemberSince}</small></div>
                <a href="#hd-contact" className="hd-owner-contact">ارسال پیام</a>
              </div>
              <p className="hd-owner-disclaimer">اطلاعات بالا از حساب کاربری نمایش داده شده است و به‌تنهایی به معنی احراز هویت یا تأیید مالکیت ملک نیست.</p>
            </section>

            <section className="hd-panel hd-last-updated">
              <span aria-hidden="true">◷</span><div><strong>آخرین به‌روزرسانی اطلاعات</strong><p>{updatedDate}</p></div>
            </section>
          </div>

          <aside className="hd-sidebar" aria-label="قیمت و اطلاعات آگهی">
            <div className="hd-price-card">
              <div className="hd-price-label">{isRent ? "مبلغ درج‌شده در آگهی اجاره" : "قیمت پیشنهادی فروش"}</div>
              <div className="hd-price" dir="auto">{price}<span>{currency}</span></div>
              {pricePerMeter && <div className="hd-price-per-meter">حدود {pricePerMeter} {currency} به‌ازای هر متر مربع</div>}
              <div className="hd-price-divider" />
              {isRent && listing.monthlyRent !== null && <div className="hd-info-row"><span>اجاره ماهانه</span><strong>{formatNumber(listing.monthlyRent.toString())} {currency}</strong></div>}
              {isRent && listing.deposit !== null && <div className="hd-info-row"><span>ودیعه</span><strong>{formatNumber(listing.deposit.toString())} {currency}</strong></div>}
              {isRent && listing.allowDepositConversion && <p className="hd-conversion-note">امکان گفت‌وگو درباره تبدیل بخشی از ودیعه و اجاره وجود دارد؛ شرایط نهایی را با آگهی‌دهنده هماهنگ کنید.</p>}
              <div className="hd-info-row"><span>نوع معامله</span><strong>{isRent ? "اجاره" : "فروش"}</strong></div>
              <div className="hd-info-row"><span>متراژ</span><strong>{area} متر مربع</strong></div>
              {listing.rooms !== null && <div className="hd-info-row"><span>تعداد اتاق</span><strong>{listing.rooms.toLocaleString("fa-IR")}</strong></div>}
              <div className="hd-info-row"><span>تاریخ ثبت</span><strong>{publishedDate}</strong></div>
              <div className="hd-price-note">مبلغ بر اساس اطلاعات ثبت‌شده توسط آگهی‌دهنده است. پیش از توافق، قیمت نهایی، مدارک و شرایط معامله را بررسی کنید.</div>
              <div id="hd-contact"><InquiryForm listingId={listing.id} /></div>
              <a href="#hd-contact" className="hd-action-primary hd-visit-link">درخواست بازدید یا اطلاعات بیشتر</a>
              <Link href="/search" className="hd-action-secondary">مشاهده همه املاک</Link>
            </div>
            <div className="hd-safety-card"><strong>◇ نکته امنیتی خانه‌یار</strong><p>پیش از بازدید و بررسی مدارک، وجهی پرداخت نکنید. انتشار آگهی به معنی تضمین مالکیت یا صحت تمام اطلاعات آن نیست.</p><Link href="/safety">راهنمای امنیت معاملات ←</Link></div>
          </aside>
        </div>

        {similarListings.length > 0 && <section className="hd-similar-section">
          <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">⌂</span><div><h2>املاک مشابه در {listing.city}</h2><p>آگهی‌های دیگری که ممکن است برایت مناسب باشند</p></div><Link href={`/search?city=${encodeURIComponent(listing.city)}`} className="hd-see-all">مشاهده همه ←</Link></div>
          <div className="hd-similar-grid">
            {similarListings.map((item) => {
              const similarPrice = formatNumber(item.price.toString());
              const similarArea = formatNumber(item.area.toString(), 2);
              const similarCurrency = currencyNames[item.currency] ?? item.currency;
              const similarImage = item.images[0]?.url && imageIsSafe(item.images[0].url) ? item.images[0].url : null;
              return <Link href={`/listings/${encodeURIComponent(item.id)}`} className="hd-similar-card" key={item.id}>
                <div className="hd-similar-image">{similarImage ? <Image src={similarImage} alt={item.title} fill unoptimized sizes="(max-width: 700px) 80vw, 25vw" /> : <span aria-hidden="true">⌂</span>}<span className="hd-similar-badge">{item.listingType === "RENT" ? "اجاره" : "فروش"}</span></div>
                <div className="hd-similar-body"><span className="hd-similar-meta">{propertyNames[item.propertyType] ?? "ملک"} · {item.city}</span><h3>{item.title}</h3><div className="hd-similar-specs">{similarArea} متر مربع{item.rooms !== null ? ` · ${item.rooms.toLocaleString("fa-IR")} اتاق` : ""}</div><strong>{similarPrice} {similarCurrency}</strong></div>
              </Link>;
            })}
          </div>
        </section>}

        <div className="hd-bottom-link"><Link href="/search">← بازگشت به جست‌وجوی املاک</Link></div>
      </main>
      <div className="hd-mobile-dock" aria-label="اقدام سریع"><div><small>قیمت ملک</small><strong>{price} <span>{currency}</span></strong></div><a href="#hd-contact">درخواست بازدید</a></div>
    </div>
  );
}
