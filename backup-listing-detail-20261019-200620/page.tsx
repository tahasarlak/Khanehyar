import Image from "next/image";
import InquiryForm from "./InquiryForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import PropertyGallery, { ShareListing } from "./PropertyGallery";
import FavoriteButton from "../../_components/FavoriteButton";
import "./detail.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

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
    where: { id, status: "PUBLISHED" },
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
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, role: true, createdAt: true } },
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
  const mapUrl = listing.latitude !== null && listing.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.008}%2C${listing.latitude - 0.005}%2C${listing.longitude + 0.008}%2C${listing.latitude + 0.005}&layer=mapnik&marker=${listing.latitude}%2C${listing.longitude}`
    : null;
  const mapLink = listing.latitude !== null && listing.longitude !== null
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

  const similarListings = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
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
      <main className="hd-container">
        <nav className="hd-breadcrumb" aria-label="مسیر صفحه">
          <Link href="/">خانه‌یار</Link><span>/</span><Link href="/search">آگهی‌های املاک</Link><span>/</span><span aria-current="page">{propertyName}</span>
        </nav>

        <div className="hd-heading">
          <div className="hd-heading-copy">
            <div className="hd-tags"><span>{isRent ? "برای اجاره" : "برای فروش"}</span><span>{propertyName}</span></div>
            <h1>{listing.title}</h1>
            <p className="hd-address-line"><span aria-hidden="true">⌖</span>{listing.city}{listing.address ? `، ${listing.address}` : ""}</p>
            <div className="hd-heading-meta"><span>کد آگهی: {listing.id.slice(-8).toLocaleUpperCase()}</span><span>ثبت‌شده در {publishedDate}</span></div>
          </div>
          <div className="hd-favorite-actions"><ShareListing /><FavoriteButton listingId={listing.id} /></div>
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

            <section className="hd-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">≡</span><div><h2>توضیحات ملک</h2><p>جزئیات ثبت‌شده توسط آگهی‌دهنده</p></div></div>
              <div className="hd-description">{listing.description?.trim() || "برای این آگهی توضیحی ثبت نشده است."}</div>
            </section>

            <section className="hd-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">⌖</span><div><h2>موقعیت و محله</h2><p>اطلاعات مکانی ثبت‌شده برای این آگهی</p></div></div>
              <div className="hd-location">
                <div className="hd-location-symbol" aria-hidden="true">⌖</div>
                <div className="hd-location-copy"><strong>{listing.city}</strong><p>{listing.address || "نشانی دقیق برای این آگهی ثبت نشده است."}</p><small>{mapUrl ? "نقشه بر اساس مختصات ثبت‌شده آگهی نمایش داده می‌شود." : "موقعیت روی نقشه نمایش داده نمی‌شود چون مختصات ملک ثبت نشده است."}</small></div>
              </div>
              {mapUrl && mapLink && <div className="hd-map-wrap"><iframe title={`نقشه موقعیت ${listing.title}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" className="hd-map" /><a className="hd-map-link" href={mapLink} target="_blank" rel="noreferrer">مشاهده نقشه بزرگ‌تر ↗</a></div>}
              <p className="hd-privacy-note">برای حفظ حریم خصوصی، پیش از مراجعه حضوری موقعیت و نشانی را با آگهی‌دهنده هماهنگ کنید.</p>
            </section>

            <section className="hd-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">♙</span><div><h2>درباره آگهی‌دهنده</h2><p>اطلاعات عمومی حساب کاربری</p></div></div>
              <div className="hd-owner-card">
                <div className="hd-owner-avatar" aria-hidden="true">{ownerInitial}</div>
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
