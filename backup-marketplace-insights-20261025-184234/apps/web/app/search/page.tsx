import UnreadMessagesLink from "../_components/UnreadMessagesLink";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import PropertyCard from "../_components/PropertyCard";
import ListingMap from "../_components/ListingMap";
import "../market.css";
import "./map-view.css";

type RawValue = string | string[] | undefined;

type SearchParams = {
  city?: RawValue;
  deal?: RawValue;
  property?: RawValue;
  minPrice?: RawValue;
  maxPrice?: RawValue;
  minArea?: RawValue;
  maxArea?: RawValue;
  rooms?: RawValue;
  sort?: RawValue;
  page?: RawValue;
  view?: RawValue;
  furnished?: RawValue;
  interiorStyle?: RawValue;
  windowView?: RawValue;
  rentalDurationMonths?: RawValue;
  nearbyPlace?: RawValue;
  rentalPaymentType?: RawValue;
  architecturalStyle?: RawValue;
  wheelchairAccessible?: RawValue;
  floorMin?: RawValue;
  floorMax?: RawValue;
  floorPosition?: RawValue;
  minCeilingHeight?: RawValue;
  maxCeilingHeight?: RawValue;
};

type SearchFilters = {
  city: string;
  deal: "SALE" | "RENT" | "";
  property: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "COMMERCIAL" | "CLUNKER" | "";
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  rooms: string;
  furnished: "true" | "false" | "";
  interiorStyle: string;
  windowView: string;
  rentalDurationMonths: string;
  nearbyPlace: string;
  rentalPaymentType: string;
  architecturalStyle: string;
  wheelchairAccessible: "true" | "false" | "";
  floorMin: string;
  floorMax: string;
  floorPosition: "ANY" | "FIRST" | "LAST" | "NOT_FIRST_LAST";
  minCeilingHeight: string;
  maxCeilingHeight: string;
  sort: "newest" | "price_asc" | "price_desc" | "area_desc";
};

const PAGE_SIZE = 12;

const propertyTypes = [
  "APARTMENT",
  "HOUSE",
  "VILLA",
  "LAND",
  "COMMERCIAL",
  "CLUNKER",
] as const;

const sortOptions = [
  "newest",
  "price_asc",
  "price_desc",
  "area_desc",
] as const;

function single(value: RawValue): string {
  return typeof value === "string" ? value.trim() : "";
}

function moneyInput(value: RawValue): string {
  const raw = single(value);
  if (!/^\d{1,12}$/.test(raw)) return "";
  return String(Number(raw));
}

function areaInput(value: RawValue): string {
  const raw = single(value);
  if (!/^\d{1,8}$/.test(raw)) return "";
  return String(Number(raw));
}

function ceilingHeightInput(value: RawValue): string {
  const raw = single(value);
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(raw)) return "";
  const n = Number(raw);
  return n >= 1 && n <= 10 ? String(n) : "";
}

function roomInput(value: RawValue): string {
  const raw = single(value);
  if (!/^\d{1,2}$/.test(raw)) return "";
  const number = Number(raw);
  return number <= 30 ? String(number) : "";
}

function parsePage(value: RawValue): number {
  const raw = single(value);

  if (!/^[1-9]\d{0,6}$/.test(raw)) {
    return 1;
  }

  return Number(raw);
}

function parseFilters(params: SearchParams): SearchFilters {
  const dealValue = single(params.deal);
  const propertyValue = single(params.property);
  const sortValue = single(params.sort);

  const deal =
    dealValue === "SALE" || dealValue === "RENT"
      ? dealValue
      : "";

  const property =
    propertyTypes.find((item) => item === propertyValue) ?? "";

  const sort =
    sortOptions.find((item) => item === sortValue) ?? "newest";

  return {
    city: single(params.city).slice(0, 100),
    deal,
    property,
    minPrice: moneyInput(params.minPrice),
    maxPrice: moneyInput(params.maxPrice),
    minArea: areaInput(params.minArea),
    maxArea: areaInput(params.maxArea),
    rooms: roomInput(params.rooms),
    furnished: single(params.furnished) === "true" || single(params.furnished) === "false" ? single(params.furnished) as "true" | "false" : "",
    interiorStyle: ["مدرن","کلاسیک","نئوکلاسیک","مینیمال","اسکاندیناوی","صنعتی","سنتی ایرانی","روستیک","لوکس","ترکیبی","سایر"].includes(single(params.interiorStyle)) ? single(params.interiorStyle) : "",
    windowView: ["خیابان","کوچه","حیاط داخلی","باغ و فضای سبز","جنگل","کوهستان","دریا","خط آسمان شهر","ساختمان‌های اطراف","بدون مانع و باز","سایر"].includes(single(params.windowView)) ? single(params.windowView) : "",
    rentalDurationMonths: /^[1-9]\d?$/.test(single(params.rentalDurationMonths)) && Number(single(params.rentalDurationMonths)) <= 120 ? single(params.rentalDurationMonths) : "",
    rentalPaymentType: ["WITH_DEPOSIT", "WITHOUT_DEPOSIT", "CONVERTIBLE"].includes(single(params.rentalPaymentType)) ? single(params.rentalPaymentType) : "",
    architecturalStyle: ["رومی","مدرن","کلاسیک","نئوکلاسیک","سنتی ایرانی","مینیمال","آجرنما","سنگی","ترکیبی","سایر"].includes(single(params.architecturalStyle)) ? single(params.architecturalStyle) : "",
    wheelchairAccessible: single(params.wheelchairAccessible) === "true" || single(params.wheelchairAccessible) === "false" ? single(params.wheelchairAccessible) as "true" | "false" : "",
    floorMin: /^(0|[1-9]\d{0,2})$/.test(single(params.floorMin)) ? single(params.floorMin) : "",
    floorMax: /^(0|[1-9]\d{0,2})$/.test(single(params.floorMax)) ? single(params.floorMax) : "",
    floorPosition: ["ANY","FIRST","LAST","NOT_FIRST_LAST"].includes(single(params.floorPosition)) ? single(params.floorPosition) as SearchFilters["floorPosition"] : "ANY",
    minCeilingHeight: ceilingHeightInput(params.minCeilingHeight),
    maxCeilingHeight: ceilingHeightInput(params.maxCeilingHeight),
    nearbyPlace: ["سوپرمارکت و فروشگاه","مدرسه","مهدکودک","دانشگاه","درمانگاه","بیمارستان","داروخانه","ایستگاه اتوبوس","مترو","تاکسی","پارک و فضای سبز","مرکز خرید","بانک و خودپرداز","رستوران و کافه","باشگاه ورزشی","مراکز اداری","مکان مذهبی","مسیر دوچرخه‌سواری"].includes(single(params.nearbyPlace)) ? single(params.nearbyPlace) : "",
    sort,
  };
}

function buildWhere(filters: SearchFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (filters.city) {
    where.city = {
      contains: filters.city,
      mode: "insensitive",
    };
  }

  if (filters.deal) {
    where.listingType = filters.deal;
  }

  if (filters.property) {
    where.propertyType = filters.property;
  }

  if (filters.minPrice || filters.maxPrice) {
    where.price = {
      ...(filters.minPrice ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.minArea || filters.maxArea) {
    where.area = {
      ...(filters.minArea ? { gte: filters.minArea } : {}),
      ...(filters.maxArea ? { lte: filters.maxArea } : {}),
    };
  }

  if (filters.rooms) {
    where.rooms = { gte: Number(filters.rooms) };
  }
  if (filters.furnished) where.furnished = filters.furnished === "true";
  if (filters.interiorStyle) where.interiorStyle = filters.interiorStyle;
  if (filters.windowView) where.windowView = filters.windowView;
  if (filters.rentalDurationMonths) where.rentalDurationMonths = Number(filters.rentalDurationMonths);
  if (filters.nearbyPlace) where.nearbyPlaces = { has: filters.nearbyPlace };
  if (filters.rentalPaymentType) where.rentalPaymentType = filters.rentalPaymentType;
  if (filters.architecturalStyle) where.architecturalStyle = filters.architecturalStyle;
  if (filters.wheelchairAccessible) where.wheelchairAccessible = filters.wheelchairAccessible === "true";
  if (filters.minCeilingHeight || filters.maxCeilingHeight) where.ceilingHeight = { ...(filters.minCeilingHeight ? { gte: Number(filters.minCeilingHeight) } : {}), ...(filters.maxCeilingHeight ? { lte: Number(filters.maxCeilingHeight) } : {}) };
  if (filters.floorMin || filters.floorMax) where.floor = { ...(filters.floorMin ? { gte: Number(filters.floorMin) } : {}), ...(filters.floorMax ? { lte: Number(filters.floorMax) } : {}) };

  return where;
}

function sortBy(value: SearchFilters["sort"]): Prisma.ListingOrderByWithRelationInput[] {
  switch (value) {
    case "price_asc":
      return [{ price: "asc" }, { id: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "area_desc":
      return [{ area: "desc" }, { id: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

function pageUrl(filters: SearchFilters, page: number): string {
  const query = new URLSearchParams();

  const values: Record<string, string> = {
    city: filters.city,
    deal: filters.deal,
    property: filters.property,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minArea: filters.minArea,
    maxArea: filters.maxArea,
    rooms: filters.rooms,
    furnished: filters.furnished,
    interiorStyle: filters.interiorStyle,
    windowView: filters.windowView,
    rentalDurationMonths: filters.rentalDurationMonths,
    nearbyPlace: filters.nearbyPlace,
    rentalPaymentType: filters.rentalPaymentType, architecturalStyle: filters.architecturalStyle, wheelchairAccessible: filters.wheelchairAccessible, floorMin: filters.floorMin, floorMax: filters.floorMax, floorPosition: filters.floorPosition === "ANY" ? "" : filters.floorPosition, minCeilingHeight: filters.minCeilingHeight, maxCeilingHeight: filters.maxCeilingHeight,
    sort: filters.sort === "newest" ? "" : filters.sort,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") {
      query.set(key, value);
    }
  }

  if (page > 1) {
    query.set("page", String(page));
  }

  const encoded = query.toString();
  return encoded ? `/search?${encoded}` : "/search";
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const where = buildWhere(filters);
  if (filters.floorPosition !== "ANY") {
    const minFloor = filters.floorMin === "" ? null : Number(filters.floorMin);
    const maxFloor = filters.floorMax === "" ? null : Number(filters.floorMax);
    let ids: { id: string }[] = [];
    if (filters.floorPosition === "FIRST") {
      ids = await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Listing" WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL AND "floor" = 1 AND (${minFloor}::int IS NULL OR "floor" >= ${minFloor}) AND (${maxFloor}::int IS NULL OR "floor" <= ${maxFloor})`;
    } else if (filters.floorPosition === "LAST") {
      ids = await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Listing" WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL AND "floor" IS NOT NULL AND "totalFloors" IS NOT NULL AND "floor" = "totalFloors" AND (${minFloor}::int IS NULL OR "floor" >= ${minFloor}) AND (${maxFloor}::int IS NULL OR "floor" <= ${maxFloor})`;
    } else {
      ids = await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Listing" WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL AND "floor" IS NOT NULL AND "totalFloors" IS NOT NULL AND "floor" > 1 AND "floor" < "totalFloors" AND (${minFloor}::int IS NULL OR "floor" >= ${minFloor}) AND (${maxFloor}::int IS NULL OR "floor" <= ${maxFloor})`;
    }
    where.id = { in: ids.map((row) => row.id) };
  }

  const view = single(params.view) === "map" ? "map" : "list";
  const requestedPage = parsePage(params.page);
  const total = await prisma.listing.count({ where });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const listings = await prisma.listing.findMany({
    where,
    orderBy: sortBy(filters.sort),
    skip: view === "map" ? 0 : (currentPage - 1) * PAGE_SIZE,
    take: view === "map" ? 500 : PAGE_SIZE,
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
      latitude: true,
      longitude: true,
      showExactLocation: true,
      images: {
        take: 1,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { url: true },
      },
    },
  });

  const mappedListings = listings.filter((listing) => listing.latitude !== null && listing.longitude !== null);

  const firstResult =
    total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const lastResult =
    total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="hy-advanced-layout">
      <aside className="hy-advanced-sidebar">
        <div className="hy-filter-header">
          <h2>فیلترهای جست‌وجو</h2>
          <Link href="/search">پاک کردن فیلترها</Link>
        </div>

        <form action="/search" method="get" className="hy-filter-form">
          <label className="hy-field">
            <span>شهر</span>
            <input
              name="city"
              type="search"
              defaultValue={filters.city}
              maxLength={100}
              placeholder="مثلاً تهران"
            />
          </label>

          <label className="hy-field">
            <span>نوع معامله</span>
            <select name="deal" defaultValue={filters.deal}>
              <option value="">خرید و اجاره</option>
              <option value="SALE">خرید</option>
              <option value="RENT">اجاره</option>
            </select>
          </label>

          <label className="hy-field">
            <span>نوع ملک</span>
            <select name="property" defaultValue={filters.property}>
              <option value="">همه املاک</option>
              <option value="APARTMENT">آپارتمان</option>
              <option value="HOUSE">خانه</option>
              <option value="VILLA">ویلا</option>
              <option value="LAND">زمین</option>
              <option value="COMMERCIAL">تجاری</option><option value="CLUNKER">خانهٔ کلنگی</option>
            </select>
          </label>

          <fieldset className="hy-filter-group">
            <legend>محدوده قیمت</legend>
            <div className="hy-filter-pair">
              <label className="hy-field">
                <span>از</span>
                <input
                  name="minPrice"
                  type="number"
                  min="0"
                  max="999999999999"
                  step="1"
                  inputMode="numeric"
                  defaultValue={filters.minPrice}
                  placeholder="حداقل"
                />
              </label>

              <label className="hy-field">
                <span>تا</span>
                <input
                  name="maxPrice"
                  type="number"
                  min="0"
                  max="999999999999"
                  step="1"
                  inputMode="numeric"
                  defaultValue={filters.maxPrice}
                  placeholder="حداکثر"
                />
              </label>
            </div>
            <p className="hy-filter-hint">
              مبلغ را با واحد پول درج‌شده در آگهی وارد کنید.
              آگهی‌ها ممکن است ارزهای متفاوتی داشته باشند.
            </p>
          </fieldset>

          <fieldset className="hy-filter-group">
            <legend>متراژ ملک (متر مربع)</legend>
            <div className="hy-filter-pair">
              <label className="hy-field">
                <span>از</span>
                <input
                  name="minArea"
                  type="number"
                  min="0"
                  max="99999999"
                  step="1"
                  defaultValue={filters.minArea}
                  placeholder="حداقل"
                />
              </label>

              <label className="hy-field">
                <span>تا</span>
                <input
                  name="maxArea"
                  type="number"
                  min="0"
                  max="99999999"
                  step="1"
                  defaultValue={filters.maxArea}
                  placeholder="حداکثر"
                />
              </label>
            </div>
          </fieldset>

          <label className="hy-field">
            <span>حداقل تعداد اتاق</span>
            <select name="rooms" defaultValue={filters.rooms}>
              <option value="">فرقی ندارد</option>
              <option value="1">۱ اتاق</option>
              <option value="2">۲ اتاق</option>
              <option value="3">۳ اتاق</option>
              <option value="4">۴ اتاق</option>
              <option value="5">۵ اتاق یا بیشتر</option>
            </select>
          </label>

          <fieldset className="hy-filter-group"><legend>ارتفاع سقف (متر)</legend><div className="hy-filter-pair"><label className="hy-field"><span>حداقل</span><input name="minCeilingHeight" type="number" min="1" max="10" step="0.1" defaultValue={filters.minCeilingHeight} /></label><label className="hy-field"><span>حداکثر</span><input name="maxCeilingHeight" type="number" min="1" max="10" step="0.1" defaultValue={filters.maxCeilingHeight} /></label></div></fieldset>
          <fieldset className="hy-filter-group"><legend>طبقه</legend><div className="hy-filter-pair"><label className="hy-field"><span>از طبقه</span><input name="floorMin" type="number" min="0" max="100" defaultValue={filters.floorMin} /></label><label className="hy-field"><span>تا طبقه</span><input name="floorMax" type="number" min="0" max="100" defaultValue={filters.floorMax} /></label></div><label className="hy-field"><span>موقعیت طبقه</span><select name="floorPosition" defaultValue={filters.floorPosition}><option value="ANY">فرقی ندارد</option><option value="FIRST">فقط طبقهٔ اول</option><option value="LAST">فقط طبقهٔ آخر</option><option value="NOT_FIRST_LAST">نه اول و نه آخر</option></select></label></fieldset>
          <label className="hy-field"><span>نوع رهن و اجاره</span><select name="rentalPaymentType" defaultValue={filters.rentalPaymentType}><option value="">فرقی ندارد</option><option value="WITH_DEPOSIT">با رهن و اجاره</option><option value="WITHOUT_DEPOSIT">بدون رهن</option><option value="CONVERTIBLE">قابل تبدیل</option></select></label>
          <label className="hy-field"><span>سبک معماری / نما</span><select name="architecturalStyle" defaultValue={filters.architecturalStyle}><option value="">همهٔ سبک‌ها</option>{["رومی","مدرن","کلاسیک","نئوکلاسیک","سنتی ایرانی","مینیمال","آجرنما","سنگی","ترکیبی","سایر"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label className="hy-field"><span>دسترسی برای افراد دارای معلولیت</span><select name="wheelchairAccessible" defaultValue={filters.wheelchairAccessible}><option value="">فرقی ندارد</option><option value="true">مناسب / دسترس‌پذیر</option><option value="false">مناسب نیست</option></select></label>
          <label className="hy-field">
            <span>وضعیت مبله</span>
            <select name="furnished" defaultValue={filters.furnished}>
              <option value="">فرقی ندارد</option><option value="true">مبله</option><option value="false">غیرمبله</option>
            </select>
          </label>
          <label className="hy-field"><span>سبک طراحی داخلی</span><select name="interiorStyle" defaultValue={filters.interiorStyle}><option value="">همه سبک‌ها</option>{["مدرن","کلاسیک","نئوکلاسیک","مینیمال","اسکاندیناوی","صنعتی","سنتی ایرانی","روستیک","لوکس","ترکیبی","سایر"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label className="hy-field"><span>منظرهٔ پنجره</span><select name="windowView" defaultValue={filters.windowView}><option value="">همه منظره‌ها</option>{["خیابان","کوچه","حیاط داخلی","باغ و فضای سبز","جنگل","کوهستان","دریا","خط آسمان شهر","ساختمان‌های اطراف","بدون مانع و باز","سایر"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label className="hy-field"><span>مدت اجاره (ماه)</span><select name="rentalDurationMonths" defaultValue={filters.rentalDurationMonths}><option value="">فرقی ندارد</option>{[1,3,6,12,24,36].map((v) => <option key={v} value={v}>{v.toLocaleString("fa-IR")} ماه</option>)}</select></label>
          <label className="hy-field"><span>دسترسی نزدیک</span><select name="nearbyPlace" defaultValue={filters.nearbyPlace}><option value="">همه</option>{["سوپرمارکت و فروشگاه","مدرسه","مهدکودک","دانشگاه","درمانگاه","بیمارستان","داروخانه","ایستگاه اتوبوس","مترو","تاکسی","پارک و فضای سبز","مرکز خرید","بانک و خودپرداز","رستوران و کافه","باشگاه ورزشی","مراکز اداری","مکان مذهبی","مسیر دوچرخه‌سواری"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>

          <label className="hy-field">
            <span>مرتب‌سازی</span>
            <select name="sort" defaultValue={filters.sort}>
              <option value="newest">جدیدترین آگهی‌ها</option>
              <option value="price_asc">ارزان‌ترین</option>
              <option value="price_desc">گران‌ترین</option>
              <option value="area_desc">بیشترین متراژ</option>
            </select>
          </label>

          <button
            type="submit"
            className="hy-button hy-button-primary hy-filter-submit"
          >
            نمایش نتایج
          </button>
        </form>
      </aside>

      <section className="hy-advanced-results" aria-label="نتایج جست‌وجو">
        <div className="hy-advanced-summary">
          <div>
            <h2>آگهی‌های املاک</h2>
            <p>
              {total.toLocaleString("fa-IR")} آگهی مطابق فیلترها
            </p>
          </div>
          <div className="hy-results-actions">
            <span className="hy-results-range">
              {view === "map" ? "نمایش همهٔ نتایج روی نقشه" : <>نمایش {firstResult.toLocaleString("fa-IR")} تا {lastResult.toLocaleString("fa-IR")}</>}
            </span>
            <div className="hy-view-switch" aria-label="حالت نمایش نتایج">
              <Link href={pageUrl(filters, 1)} aria-current={view === "list" ? "page" : undefined} className={view === "list" ? "is-active" : ""}>فهرست</Link>
              <Link href={`${pageUrl(filters, 1)}${pageUrl(filters, 1).includes("?") ? "&" : "?"}view=map`} aria-current={view === "map" ? "page" : undefined} className={view === "map" ? "is-active" : ""}>نقشه</Link>
            </div>
          </div>
        </div>

        {view === "map" ? (
          mappedListings.length ? <ListingMap points={mappedListings.map((listing) => {
            // Never send exact coordinates to the public map unless the owner explicitly enabled them.
            const hash = [...listing.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
            const offsetLat = listing.showExactLocation ? 0 : (((hash % 1000) / 1000) - 0.5) * 0.012;
            const offsetLon = listing.showExactLocation ? 0 : ((((hash >>> 4) % 1000) / 1000) - 0.5) * 0.016;
            return { id: listing.id, title: listing.title, city: listing.city, price: String(listing.price), currency: listing.currency, latitude: listing.latitude! + offsetLat, longitude: listing.longitude! + offsetLon, imageUrl: listing.images[0]?.url ?? null, listingType: listing.listingType };
          })} /> : <div className="hy-empty"><h3>برای این فیلترها مختصاتی ثبت نشده</h3><p>فهرست را ببین یا فیلترها را تغییر بده.</p><Link href={pageUrl(filters, 1)} className="hy-button hy-button-primary">نمایش فهرست</Link></div>
        ) : listings.length ? (
          <div className="hy-advanced-property-grid">
            {listings.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="hy-empty">
            <span aria-hidden="true">⌕</span>
            <h3>آگهی مناسبی پیدا نشد</h3>
            <p>محدوده قیمت، شهر یا دیگر فیلترها را تغییر بده.</p>
            <Link
              href="/search"
              className="hy-button hy-button-primary"
            >
              نمایش همه آگهی‌ها
            </Link>
          </div>
        )}

        {view === "list" && totalPages > 1 && (
          <nav
            className="hy-pagination"
            aria-label="صفحه‌بندی آگهی‌ها"
          >
            {currentPage > 1 ? (
              <Link href={pageUrl(filters, currentPage - 1)}>
                صفحه قبلی
              </Link>
            ) : (
              <span className="hy-page-disabled">صفحه قبلی</span>
            )}

            <span className="hy-page-current">
              صفحه {currentPage.toLocaleString("fa-IR")} از{" "}
              {totalPages.toLocaleString("fa-IR")}
            </span>

            {currentPage < totalPages ? (
              <Link href={pageUrl(filters, currentPage + 1)}>
                صفحه بعدی
              </Link>
            ) : (
              <span className="hy-page-disabled">صفحه بعدی</span>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="hy-site hy-search-page" dir="rtl">


      <main className="hy-wrap hy-advanced-main">
        <Suspense
          fallback={
            <div className="hy-results-loading" role="status">
              در حال جست‌وجوی آگهی‌ها...
            </div>
          }
        >
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </main>


    </div>
  );
}