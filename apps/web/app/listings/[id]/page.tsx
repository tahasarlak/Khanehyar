import { getSiteOrigin } from "@/src/lib/site-url";
import Image from "next/image";
import type { Metadata } from "next";


import PriceOfferForm from "./PriceOfferForm";
import ListingViewTracker from "./ListingViewTracker";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import PropertyGallery, { ShareListing } from "./PropertyGallery";
import FavoriteButton from "../../_components/FavoriteButton";
import MobileListingActions from "./MobileListingActions";
import ListingContactBar from "./ListingContactBar";
import ListingNearbyMetro from "./ListingNearbyMetro";
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
function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(date);
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
      urgentSale: true,
      rentalPeriod: true,
      viewCount: true,
      publishedAt: true,
      priceHistory: { orderBy: { changedAt: "desc" }, take: 10, select: { oldPrice: true, newPrice: true, oldCurrency: true, newCurrency: true, changedAt: true } },
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
      ceilingHeight: true,
      architecturalStyle: true,
      windowView: true,
      furnishedItems: true,
      accessibilitySuitable: true,
      accessibilityFeatures: true,
      buildingType: true, constructionStatus: true, structureType: true, facadeType: true,
      elevatorCount: true, unitCount: true, parkingType: true, serviceCharge: true,
      commission: true, advancePayment: true, minimumContractMonths: true,
      petsAllowed: true, familyOnly: true, smokingAllowed: true, priceNegotiable: true,
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
      showOnMap: true,
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
        select: { url: true, label: true, altText: true },
      },
    },
  });

  if (!listing) notFound();

  const pictures = listing.images.map((item) => item.url).filter(imageIsSafe);
  const floorPlanImage = listing.images.find((item) => /^(floor.?plan|plan|نقشه|پلان)$/i.test(item.label || ""))?.url;
  const isRent = listing.listingType === "RENT";
  const propertyName = propertyNames[listing.propertyType] ?? "ملک";
  const currency = currencyNames[listing.currency] ?? listing.currency;
  const priceValue = Number(listing.price.toString());
  const areaValue = Number(listing.area.toString());
  const price = formatNumber(listing.price.toString());
  const displayPrice = isRent && listing.monthlyRent !== null ? formatNumber(listing.monthlyRent.toString()) : price;
  const area = formatNumber(listing.area.toString(), 2);
  const pricePerMeter = !isRent && areaValue > 0 && Number.isFinite(priceValue)
    ? formatNumber(priceValue / areaValue)
    : null;
  const publishedDate = formatDateTime(listing.publishedAt ?? listing.createdAt);
  const updatedDate = formatDate(listing.updatedAt);
  const effectivePrice = isRent ? Number((listing.monthlyRent ?? listing.price).toString()) : priceValue;
  const comparableListings = await prisma.listing.findMany({
    where: { id: { not: listing.id }, status: "PUBLISHED", deletedAt: null, city: listing.city, propertyType: listing.propertyType, listingType: listing.listingType, currency: listing.currency, area: { gte: areaValue * 0.7, lte: areaValue * 1.3 } },
    take: 300, select: { price: true, monthlyRent: true, area: true },
  });
  const comparableRates = comparableListings.map((item) => ({ rate: Number((isRent ? (item.monthlyRent ?? item.price) : item.price).toString()) / Number(item.area.toString()), price: Number((isRent ? (item.monthlyRent ?? item.price) : item.price).toString()) })).filter((item) => Number.isFinite(item.rate) && item.rate > 0);
  const averagePricePerMeter = comparableRates.length >= 5 ? comparableRates.reduce((sum, item) => sum + item.rate, 0) / comparableRates.length : null;
  const isBelowAverage = averagePricePerMeter !== null && areaValue > 0 && effectivePrice / areaValue < averagePricePerMeter * 0.9;
  const averageDifferencePercent = averagePricePerMeter && areaValue > 0 ? Math.round((1 - (effectivePrice / areaValue) / averagePricePerMeter) * 100) : null;
  const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
    "تهران": { latitude: 35.6892, longitude: 51.3890 }, "مشهد": { latitude: 36.2972, longitude: 59.6067 },
    "اصفهان": { latitude: 32.6546, longitude: 51.6680 }, "شیراز": { latitude: 29.5918, longitude: 52.5837 },
    "تبریز": { latitude: 38.0962, longitude: 46.2738 }, "کرج": { latitude: 35.8400, longitude: 50.9391 },
    "قم": { latitude: 34.6416, longitude: 50.8746 }, "اهواز": { latitude: 31.3183, longitude: 48.6706 },
    "رشت": { latitude: 37.2808, longitude: 49.5832 }, "کرمان": { latitude: 30.2839, longitude: 57.0834 },
    "یزد": { latitude: 31.8974, longitude: 54.3569 }, "قزوین": { latitude: 36.2688, longitude: 50.0041 },
    "ساری": { latitude: 36.5633, longitude: 53.0601 }, "اراک": { latitude: 34.0917, longitude: 49.6892 }, "همدان": { latitude: 34.7992, longitude: 48.5146 },
    "کرمانشاه": { latitude: 34.3142, longitude: 47.0650 }, "سنندج": { latitude: 35.3219, longitude: 46.9862 },
    "زاهدان": { latitude: 29.4963, longitude: 60.8629 }, "گرگان": { latitude: 36.8456, longitude: 54.4393 },
    "بجنورد": { latitude: 37.4747, longitude: 57.3290 }, "بیرجند": { latitude: 32.8663, longitude: 59.2211 },
    "کاشان": { latitude: 33.9850, longitude: 51.4100 }, "بوشهر": { latitude: 28.9234, longitude: 50.8203 },
    "خرم‌آباد": { latitude: 33.4878, longitude: 48.3558 }, "خرم آباد": { latitude: 33.4878, longitude: 48.3558 },
    "ایلام": { latitude: 33.6374, longitude: 46.4227 }, "زنجان": { latitude: 36.6736, longitude: 48.4787 },
    "اردبیل": { latitude: 38.2498, longitude: 48.2933 }, "ارومیه": { latitude: 37.5527, longitude: 45.0761 },
    "سمنان": { latitude: 35.5769, longitude: 53.3950 }, "شهرکرد": { latitude: 32.3256, longitude: 50.8644 },
    "یاسوج": { latitude: 30.6682, longitude: 51.5879 }, "مراغه": { latitude: 37.3892, longitude: 46.2374 },
    "کیش": { latitude: 26.5320, longitude: 53.9850 }, "قشم": { latitude: 26.9581, longitude: 56.2719 },
    "پردیس": { latitude: 35.7410, longitude: 51.8200 }, "اندیشه": { latitude: 35.6800, longitude: 51.0200 },
    "شهریار": { latitude: 35.6596, longitude: 51.0590 }, "اسلامشهر": { latitude: 35.5446, longitude: 51.2300 },
    "پرند": { latitude: 35.4710, longitude: 51.0400 }, "پاکدشت": { latitude: 35.4740, longitude: 51.6860 },
    "دزفول": { latitude: 32.3831, longitude: 48.4236 }, "آبادان": { latitude: 30.3473, longitude: 48.2934 },
    "مرودشت": { latitude: 29.8742, longitude: 52.8025 }, "بابل": { latitude: 36.5387, longitude: 52.6765 },
    "آمل": { latitude: 36.4696, longitude: 52.3507 }, "لاهیجان": { latitude: 37.2072, longitude: 50.0039 },
    "نیشابور": { latitude: 36.2133, longitude: 58.7958 }, "سبزوار": { latitude: 36.2126, longitude: 57.6819 },
    "رفسنجان": { latitude: 30.4067, longitude: 55.9939 }, "سیرجان": { latitude: 29.4514, longitude: 55.6814 },
    "بندر انزلی": { latitude: 37.4727, longitude: 49.4622 }, "بندرعباس": { latitude: 27.1832, longitude: 56.2666 },
  };
  const baseCoords = listing.latitude !== null && listing.longitude !== null
    ? { latitude: listing.latitude, longitude: listing.longitude }
    : cityCoordinates[listing.city] ?? null;
  const coordHash = [...listing.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const mapCoords = baseCoords && listing.showOnMap ? {
    latitude: baseCoords.latitude + (listing.showExactLocation && listing.latitude !== null ? 0 : (((coordHash % 1000) / 1000) - 0.5) * 0.012),
    longitude: baseCoords.longitude + (listing.showExactLocation && listing.longitude !== null ? 0 : ((((coordHash >>> 4) % 1000) / 1000) - 0.5) * 0.016),
  } : null;
  const mapUrl = mapCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.longitude - 0.012}%2C${mapCoords.latitude - 0.008}%2C${mapCoords.longitude + 0.012}%2C${mapCoords.latitude + 0.008}&layer=mapnik&marker=${mapCoords.latitude}%2C${mapCoords.longitude}`
    : null;
  const mapLink = mapCoords
    ? `https://www.openstreetmap.org/?mlat=${mapCoords.latitude}&mlon=${mapCoords.longitude}#map=${listing.showExactLocation ? 16 : 13}/${mapCoords.latitude}/${mapCoords.longitude}`
    : null;

  const facts: { label: string; value: string; icon: string }[] = [
    { label: "نوع ملک", value: propertyName, icon: "⌂" },
    { label: "معامله", value: isRent ? "اجاره" : "فروش", icon: "↔" },
    { label: "متراژ", value: `${area} متر`, icon: "▦" },
    { label: "اتاق", value: listing.rooms === null ? (listing.floor === null ? "ثبت نشده" : `طبقه ${listing.floor.toLocaleString("fa-IR")}`) : listing.rooms.toLocaleString("fa-IR"), icon: "▤" },
  ];

  const yesNo = (value: boolean | null | undefined) => value === null || value === undefined ? null : value ? "دارد" : "ندارد";
  const detailFacts: { label: string; value: string }[] = [];
  if (listing.bathrooms !== null) detailFacts.push({ label: "سرویس بهداشتی و حمام", value: listing.bathrooms.toLocaleString("fa-IR") });
  if (listing.parkingSpaces !== null) detailFacts.push({ label: "ظرفیت پارکینگ", value: listing.parkingSpaces === 0 ? "بدون پارکینگ" : `${listing.parkingSpaces.toLocaleString("fa-IR")} خودرو` });
  if (listing.yearBuilt !== null) detailFacts.push({ label: "سال ساخت", value: listing.yearBuilt.toLocaleString("fa-IR") });
  if (listing.ceilingHeight !== null) detailFacts.push({ label: "ارتفاع سقف", value: `${formatNumber(listing.ceilingHeight.toString(), 2)} متر` });
  if (listing.architecturalStyle) detailFacts.push({ label: "سبک معماری", value: listing.architecturalStyle });
  if (listing.windowView) detailFacts.push({ label: "منظره پنجره", value: listing.windowView });
  if (listing.furnishedItems.length) detailFacts.push({ label: "وسایل مبله", value: listing.furnishedItems.join("، ") });
  if (listing.accessibilitySuitable !== null) detailFacts.push({ label: "دسترس‌پذیری معلولان", value: listing.accessibilitySuitable ? (listing.accessibilityFeatures.length ? listing.accessibilityFeatures.join("، ") : "مناسب") : "مناسب نیست" });
  if (listing.buildingType) detailFacts.push({ label: "نوع ساختمان", value: listing.buildingType });
  if (listing.constructionStatus) detailFacts.push({ label: "وضعیت ساخت", value: listing.constructionStatus });
  if (listing.structureType) detailFacts.push({ label: "نوع سازه", value: listing.structureType });
  if (listing.facadeType) detailFacts.push({ label: "نمای ساختمان", value: listing.facadeType });
  if (listing.elevatorCount !== null) detailFacts.push({ label: "تعداد آسانسور", value: listing.elevatorCount.toLocaleString("fa-IR") });
  if (listing.unitCount !== null) detailFacts.push({ label: "تعداد واحدها", value: listing.unitCount.toLocaleString("fa-IR") });
  if (listing.parkingType) detailFacts.push({ label: "نوع پارکینگ", value: listing.parkingType });
  if (listing.serviceCharge !== null) detailFacts.push({ label: "شارژ ماهانه", value: `${formatNumber(listing.serviceCharge.toString())} ${currency}` });
  if (listing.commission !== null) detailFacts.push({ label: "کمیسیون", value: `${formatNumber(listing.commission.toString())} ${currency}` });
  if (listing.advancePayment !== null) detailFacts.push({ label: "پیش‌پرداخت", value: `${formatNumber(listing.advancePayment.toString())} ${currency}` });
  if (listing.minimumContractMonths !== null) detailFacts.push({ label: "حداقل مدت قرارداد", value: `${listing.minimumContractMonths.toLocaleString("fa-IR")} ماه` });
  if (listing.priceNegotiable) detailFacts.push({ label: "قیمت", value: "قابل مذاکره" });
  for (const [label, value] of [["نگهداری حیوان خانگی", listing.petsAllowed], ["فقط خانواده", listing.familyOnly], ["اجازه سیگار", listing.smokingAllowed]] as const) {
    const formatted = yesNo(value);
    if (formatted) detailFacts.push({ label, value: formatted });
  }
  if (listing.documentType) detailFacts.push({ label: "نوع سند", value: listing.documentType });
  if (listing.orientation) detailFacts.push({ label: "جهت ملک", value: listing.orientation });
  if (listing.naturalLight) detailFacts.push({ label: "نورگیری", value: listing.naturalLight });
  if (listing.heatingType) detailFacts.push({ label: "سیستم گرمایش", value: listing.heatingType });
  if (listing.coolingType) detailFacts.push({ label: "سیستم سرمایش", value: listing.coolingType });
  for (const [label, value] of [["آسانسور", listing.hasElevator], ["انباری", listing.hasStorage], ["مبله", listing.furnished], ["آماده سکونت", listing.readyToMove], ["بالکن", listing.balcony], ["تراس", listing.terrace], ["باغچه", listing.garden]] as const) {
    const formatted = yesNo(value);
    if (formatted) detailFacts.push({ label, value: formatted });
  }
  const mobileApartmentLabels = new Set([
    "سرویس بهداشتی و حمام", "ظرفیت پارکینگ", "ارتفاع سقف", "سبک معماری", "منظره پنجره",
    "وسایل مبله", "دسترس‌پذیری معلولان", "جهت ملک", "نورگیری", "سیستم گرمایش",
    "سیستم سرمایش", "مبله", "آماده سکونت", "بالکن", "تراس", "باغچه",
  ]);
  const mobileLegalLabels = new Set([
    "نوع سند", "کمیسیون", "پیش‌پرداخت", "حداقل مدت قرارداد", "قیمت",
    "نگهداری حیوان خانگی", "فقط خانواده", "اجازه سیگار",
  ]);
  const mobileBuildingLabels = new Set([
    "سال ساخت", "نوع ساختمان", "وضعیت ساخت", "نوع سازه", "نمای ساختمان",
    "تعداد آسانسور", "تعداد واحدها", "نوع پارکینگ", "شارژ ماهانه", "آسانسور", "انباری",
  ]);
  const mobileApartmentFacts = detailFacts.filter((fact) => mobileApartmentLabels.has(fact.label));
  const mobileLegalFacts = detailFacts.filter((fact) => mobileLegalLabels.has(fact.label));
  const mobileBuildingFacts = detailFacts.filter((fact) => mobileBuildingLabels.has(fact.label));
  const mobileAssignedLabels = new Set([
    ...mobileApartmentLabels, ...mobileLegalLabels, ...mobileBuildingLabels,
  ]);
  const mobileOtherFacts = detailFacts.filter((fact) => !mobileAssignedLabels.has(fact.label));

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
        datePosted: (listing.publishedAt ?? listing.createdAt).toISOString(), dateModified: listing.updatedAt.toISOString(),
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
      <MobileListingActions listingId={listing.id} title={listing.title} price={displayPrice} currency={currency} area={`${area} متر`} rooms={listing.rooms === null ? "" : listing.rooms.toLocaleString("fa-IR")} propertyName={propertyName} floorLabel={listing.floor !== null ? `طبقه ${listing.floor.toLocaleString("fa-IR")}${listing.totalFloors !== null ? ` از ${listing.totalFloors.toLocaleString("fa-IR")}` : ""}` : ""} image={pictures[0] ?? ""} />
      <main className="hd-container">
        <nav className="hd-breadcrumb" aria-label="مسیر صفحه">
          <Link href="/">خانه‌یار</Link><span>/</span><Link href="/search">آگهی‌های املاک</Link><span>/</span><span aria-current="page">{propertyName}</span>
        </nav>

        <div className="hd-heading">
          <div className="hd-heading-copy">
            <div className="hd-tags"><span>{isRent ? "برای اجاره" : "برای فروش"}</span><span>{propertyName}</span></div>
            <div className="hd-market-badges">{listing.urgentSale && !isRent && <span className="hd-market-badge is-urgent">فروش فوری</span>}{isBelowAverage && <span className="hd-market-badge">حدود {Math.max(0, averageDifferencePercent ?? 0).toLocaleString("fa-IR")}٪ پایین‌تر از میانگین آگهی‌های مشابه</span>}{isRent && listing.rentalPeriod && <span className="hd-market-badge">{({LONG_TERM:"اجاره بلندمدت",DAILY:"اجاره روزانه",WEEKLY:"اجاره هفتگی",HOURLY:"اجاره ساعتی"} as const)[listing.rentalPeriod]}</span>}</div>
            <h1>{listing.title}</h1>
            <p className="hd-address-line"><span aria-hidden="true">⌖</span>{listing.city}{listing.showExactLocation && listing.address ? `، ${listing.address}` : ""}{listing.address && !listing.showExactLocation ? " · نشانی دقیق پس از هماهنگی" : ""}</p>
            <div className="hd-heading-meta"><span className="hd-meta-item">کد آگهی: {listing.id.slice(-8).toLocaleUpperCase()}</span><span className="hd-meta-item">منتشرشده در {publishedDate}</span><span className="hd-meta-item hd-view-meta"><ListingViewTracker listingId={listing.id} initialCount={listing.viewCount} /></span></div>
          </div>
          <div className="hd-favorite-actions" aria-label="اقدام‌های آگهی"><ShareListing title={listing.title} /><FavoriteButton listingId={listing.id} /></div>
        </div>

        <PropertyGallery title={listing.title} images={pictures} />
        <section className="hd-mobile-title-block" aria-label="عنوان آگهی">
          <div className="hd-mobile-badges">
            <span>{isRent ? "اجاره" : "فروش"}</span><span>{propertyName}</span>
            {listing.urgentSale && !isRent && <span className="is-urgent">فروش فوری</span>}
            {isBelowAverage && <span className="is-value">حدود {Math.max(0, averageDifferencePercent ?? 0).toLocaleString("fa-IR")}٪ زیر میانگین</span>}
            {isRent && listing.rentalPeriod && <span>{({LONG_TERM:"بلندمدت",DAILY:"روزانه",WEEKLY:"هفتگی",HOURLY:"ساعتی"} as const)[listing.rentalPeriod]}</span>}
          </div>
          <h1>{listing.title}</h1>
          <p><span aria-hidden="true">⌖</span>{listing.city}{listing.showExactLocation && listing.address ? `، ${listing.address}` : ""}</p>
          <small>کد آگهی: {listing.id.slice(-8).toLocaleUpperCase()} · انتشار {publishedDate}</small>
        </section>
        {floorPlanImage && <a className="hd-floorplan-shortcut" href={floorPlanImage} target="_blank" rel="noreferrer">⌗ مشاهدهٔ پلان یا نقشهٔ واحد</a>}

        <section className="hd-price-summary" id="hd-price-summary" aria-label="قیمت و پیشنهاد قیمت">
  <div className="hd-price-summary-main">
    <div className="hd-price-summary-main-top">
      <div className="hd-price-summary-price">
        <span className="hd-price-label">{isRent ? "مبلغ اجاره" : "قیمت ملک"}</span>
        <div className="hd-price-value-line">
          <strong className="hd-price">{displayPrice}<small>{currency}</small></strong>
          <details className="hd-price-info">
            <summary aria-label="توضیحات قیمت">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
              <span>توضیحات</span>
            </summary>
            <div className="hd-price-info-panel">
              <strong>درباره قیمت</strong>
              <p>قیمت درج‌شده، مبلغ اعلامی آگهی‌دهنده است. مبلغ نهایی، هزینه‌های جانبی و شرایط پرداخت را پیش از توافق بررسی کنید.</p>
            </div>
          </details>
        </div>
        {isRent && listing.monthlyRent !== null && <span className="hd-price-summary-sub">اجاره ماهانه</span>}
        {pricePerMeter && <span className="hd-price-summary-sub">{pricePerMeter} {currency} به‌ازای هر متر</span>}
      </div>
      <PriceOfferForm listingId={listing.id} currency={listing.currency} currentPrice={effectivePrice} isRent={isRent} />
    </div>
    <div className="hd-price-summary-tags">
      {isRent ? <span>اجاره</span> : <span>فروش</span>}
      {listing.urgentSale && !isRent && <span className="is-urgent">فروش فوری</span>}
      {isRent && listing.rentalPeriod && <span>{({LONG_TERM:"بلندمدت",DAILY:"روزانه",WEEKLY:"هفتگی",HOURLY:"ساعتی"} as const)[listing.rentalPeriod]}</span>}
      {isBelowAverage && <span>حدود {Math.max(0, averageDifferencePercent ?? 0).toLocaleString("fa-IR")}٪ زیر میانگین</span>}
    </div>
  </div>
</section>
        <div className="hd-mobile-stats" aria-label="مشخصات اصلی ملک">
          <div><strong>{listing.rooms === null ? "—" : listing.rooms.toLocaleString("fa-IR")}</strong><small>تعداد اتاق</small></div>
          <div><strong>{area} متر</strong><small>مساحت کل</small></div>
          <div><strong>{propertyName}</strong><small>نوع ملک</small></div>
          <div><strong>{listing.floor === null ? "—" : `${listing.floor.toLocaleString("fa-IR")}${listing.totalFloors !== null ? `/${listing.totalFloors.toLocaleString("fa-IR")}` : ""}`}</strong><small>طبقه</small></div>
        </div>
        <ListingContactBar listingId={listing.id} />

        <div className="hd-layout">
          <div className="hd-main-column">
            <section className="hd-panel hd-overview-panel">
              <div className="hd-mobile-overview-heading"><h2>دسترسی و زیرساخت</h2><p>آدرس و امکانات اطراف ملک</p></div>
              <div className="hd-facts">
                {facts.map((fact) => <div key={fact.label} className="hd-fact"><span className="hd-fact-icon" aria-hidden="true">{fact.icon}</span><div><dt>{fact.label}</dt><dd>{fact.value}</dd></div></div>)}
              </div>
              <div className="hd-quick-address"><span>⌖</span><div><strong>{listing.city}</strong><small>{listing.showExactLocation && listing.address ? listing.address : "نشانی دقیق پس از هماهنگی با آگهی‌دهنده"}</small></div></div>
              <ListingNearbyMetro latitude={listing.showOnMap && listing.latitude !== null && listing.longitude !== null ? (mapCoords?.latitude ?? null) : null} longitude={listing.showOnMap && listing.latitude !== null && listing.longitude !== null ? (mapCoords?.longitude ?? null) : null} />
            </section>

            {(detailFacts.length > 0 || listing.amenities.length > 0) && <section className="hd-panel hd-details-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">✦</span><div><h2>امکانات و مشخصات تکمیلی</h2><p>جزئیات فنی و امکاناتی که برای این ملک ثبت شده‌اند</p></div></div>
              {detailFacts.length > 0 && <dl className="hd-detail-grid">{detailFacts.map((fact) => <div className="hd-detail-item" key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
              {listing.amenities.length > 0 && <div className="hd-amenities"><h3>امکانات رفاهی</h3><ul>{listing.amenities.map((amenity) => <li key={amenity}><span aria-hidden="true">✓</span>{amenityLabels[amenity] ?? amenity.replace(/[_-]/g, " ")}</li>)}</ul></div>}
            </section>}

            <div className="hd-mobile-fact-sections">
              {mobileApartmentFacts.length > 0 && <section className="hd-mobile-panel"><h2>درباره {propertyName}</h2><dl className="hd-mobile-fact-list">{mobileApartmentFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}
              {mobileLegalFacts.length > 0 && <section className="hd-mobile-panel"><h2>ویژگی‌های حقوقی</h2><dl className="hd-mobile-fact-list">{mobileLegalFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}
              {mobileBuildingFacts.length > 0 && <section className="hd-mobile-panel"><h2>درباره ساختمان</h2><dl className="hd-mobile-fact-list">{mobileBuildingFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}
              {mobileOtherFacts.length > 0 && <section className="hd-mobile-panel"><h2>سایر مشخصات</h2><dl className="hd-mobile-fact-list">{mobileOtherFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}
              {listing.amenities.length > 0 && <section className="hd-mobile-panel"><h2>امکانات رفاهی</h2><ul className="hd-mobile-amenities">{listing.amenities.map((amenity) => <li key={amenity}>{amenityLabels[amenity] ?? amenity.replace(/[_-]/g, " ")}</li>)}</ul></section>}
            </div>

            <section className="hd-panel hd-mobile-description-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">≡</span><div><h2>توضیحات ملک</h2><p>جزئیات ثبت‌شده توسط آگهی‌دهنده</p></div></div>
              <div className="hd-description">{listing.description?.trim() || "برای این آگهی توضیحی ثبت نشده است."}</div>
            </section>

            <section className="hd-panel hd-mobile-location-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">⌖</span><div><h2>موقعیت و محله</h2><p>اطلاعات مکانی ثبت‌شده برای این آگهی</p></div></div>
              <div className="hd-location">
                <div className="hd-location-symbol" aria-hidden="true">⌖</div>
                <div className="hd-location-copy"><strong>{listing.city}</strong><p>{listing.showExactLocation && listing.address ? listing.address : "موقعیت تقریبی محله نمایش داده می‌شود؛ نشانی دقیق برای عموم منتشر نمی‌شود."}</p><small>{!listing.showOnMap ? "نمایش موقعیت این آگهی روی نقشه توسط آگهی‌دهنده غیرفعال شده است." : mapUrl ? (listing.showExactLocation ? "نشانگر بر اساس مختصات ثبت‌شده آگهی است." : "نشانگر تقریبی محدودهٔ ملک است؛ برای حفظ حریم خصوصی کمی جابه‌جا شده.") : "برای این شهر هنوز نقطهٔ مرجع نقشه تعریف نشده است."}</small></div>
              </div>
              {mapUrl && mapLink && <div className="hd-map-wrap"><iframe title={`نقشه موقعیت ${listing.title}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" className="hd-map" /><a className="hd-map-link" href={mapLink} target="_blank" rel="noreferrer">مشاهده نقشه بزرگ‌تر ↗</a></div>}
              <p className="hd-privacy-note">برای حفظ حریم خصوصی، پیش از مراجعه حضوری موقعیت و نشانی را با آگهی‌دهنده هماهنگ کنید.</p>
            </section>

            <section className="hd-panel hd-mobile-owner-panel">
              <div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">♙</span><div><h2>درباره آگهی‌دهنده</h2><p>اطلاعات عمومی حساب کاربری</p></div></div>
              <div className="hd-owner-card">
                {listing.owner.avatarUrl ? <Image src={listing.owner.avatarUrl} alt={`تصویر ${ownerName}`} width={58} height={58} unoptimized className="hd-owner-avatar-image" /> : <div className="hd-owner-avatar" aria-hidden="true">{ownerInitial}</div>}
                <div className="hd-owner-details"><strong>{ownerName}</strong><span>{listing.owner.role === "ADMIN" ? "حساب مدیر" : "عضو خانه‌یار"}</span><small>عضویت از {ownerMemberSince}</small></div>
                <span className="hd-owner-contact">آگهی‌دهنده</span>
              </div>
              <p className="hd-owner-disclaimer">اطلاعات بالا از حساب کاربری نمایش داده شده است و به‌تنهایی به معنی احراز هویت یا تأیید مالکیت ملک نیست.</p>
            </section>

            {listing.priceHistory.length > 0 && <section className="hd-panel hd-price-history"><div className="hd-section-heading"><span className="hd-section-icon" aria-hidden="true">↕</span><div><h2>تاریخچه تغییر قیمت</h2><p>تغییرات ثبت‌شدهٔ قیمت این آگهی</p></div></div><ol>{listing.priceHistory.map((item) => <li key={`${item.changedAt.toISOString()}-${item.newPrice.toString()}`}>{formatDate(item.changedAt)}: از {formatNumber(item.oldPrice.toString())} {currencyNames[item.oldCurrency] ?? item.oldCurrency} به {formatNumber(item.newPrice.toString())} {currencyNames[item.newCurrency] ?? item.newCurrency}</li>)}</ol></section>}
            <section className="hd-panel hd-last-updated">
              <span aria-hidden="true">◷</span><div><strong>آخرین به‌روزرسانی اطلاعات</strong><p>{updatedDate}</p></div>
            </section>
          </div>

          <aside className="hd-sidebar" aria-label="اطلاعات امنیت معامله">
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
    </div>
  );
}
