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
};

type SearchFilters = {
  city: string;
  deal: "SALE" | "RENT" | "";
  property: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "COMMERCIAL" | "";
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  rooms: string;
  sort: "newest" | "price_asc" | "price_desc" | "area_desc";
};

const PAGE_SIZE = 6;

const propertyTypes = [
  "APARTMENT",
  "HOUSE",
  "VILLA",
  "LAND",
  "COMMERCIAL",
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

  const view = single(params.view) === "map" ? "map" : "list";
  const requestedPage = parsePage(params.page);
  const total = await prisma.listing.count({ where });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const listings = await prisma.listing.findMany({
    where,
    orderBy: sortBy(filters.sort),
    skip: view === "map" ? 0 : (currentPage - 1) * PAGE_SIZE,
    take: view === "map" ? Math.min(total, 3000) : PAGE_SIZE,
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
      showOnMap: true,
      images: {
        take: 1,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { url: true },
      },
    },
  });

  const mappedListings = listings.filter((listing) => listing.showOnMap);
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

  const firstResult =
    total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const lastResult =
    total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="hy-advanced-layout">
      <details className="hy-advanced-sidebar hy-mobile-filter-panel">
        <summary className="hy-mobile-filter-summary">
          <span>فیلترهای جست‌وجو</span>
          <span className="hy-mobile-filter-summary-hint">برای محدودکردن نتایج باز کن</span>
        </summary>
        <div className="hy-mobile-filter-content">
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
              <option value="COMMERCIAL">تجاری</option>
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
        </div>
      </details>

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
            // Public maps use exact coordinates only when the owner has explicitly enabled them.
            const base = listing.latitude !== null && listing.longitude !== null
              ? { latitude: listing.latitude, longitude: listing.longitude }
              : cityCoordinates[listing.city] ?? { latitude: 32.4279, longitude: 53.6880 };
            const hash = [...listing.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
            const hasExactCoordinates = listing.latitude !== null && listing.longitude !== null;
            const exactAllowed = listing.showExactLocation && hasExactCoordinates;
            const offsetLat = exactAllowed ? 0 : (((hash % 1000) / 1000) - 0.5) * (hasExactCoordinates ? 0.012 : 0.04);
            const offsetLon = exactAllowed ? 0 : ((((hash >>> 4) % 1000) / 1000) - 0.5) * (hasExactCoordinates ? 0.016 : 0.05);
            return { id: listing.id, title: listing.title, city: listing.city, price: String(listing.price), currency: listing.currency, latitude: base.latitude + offsetLat, longitude: base.longitude + offsetLon, imageUrl: listing.images[0]?.url ?? null, listingType: listing.listingType };
          })} /> : <div className="hy-empty"><h3>آگهی قابل نمایش روی نقشه وجود ندارد</h3><p>ممکن است آگهی‌دهنده نمایش روی نقشه را غیرفعال کرده باشد یا شهر ملک هنوز نقطهٔ مرجع نداشته باشد.</p><Link href={pageUrl(filters, 1)} className="hy-button hy-button-primary">نمایش فهرست</Link></div>
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