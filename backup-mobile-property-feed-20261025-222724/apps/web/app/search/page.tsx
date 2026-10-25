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
  urgent?: RawValue;
  rentPeriod?: RawValue;
  belowAverage?: RawValue;
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
  urgent: boolean;
  rentPeriod: "LONG_TERM" | "DAILY" | "WEEKLY" | "HOURLY" | "";
  belowAverage: boolean;
  sort: "newest" | "price_asc" | "price_desc" | "area_desc";
};

const PAGE_SIZE = 12;

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
    urgent: single(params.urgent) === "1",
    rentPeriod: (["LONG_TERM", "DAILY", "WEEKLY", "HOURLY"].includes(single(params.rentPeriod)) ? single(params.rentPeriod) : "") as SearchFilters["rentPeriod"],
    belowAverage: single(params.belowAverage) === "1",
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
  if (filters.urgent) where.urgentSale = true;
  if (filters.rentPeriod) { where.listingType = "RENT"; where.rentalPeriod = filters.rentPeriod; }

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
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }];
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
    urgent: filters.urgent ? "1" : "",
    rentPeriod: filters.rentPeriod,
    belowAverage: filters.belowAverage ? "1" : "",
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
  const selectedFields = {
    id: true, title: true, city: true, area: true, price: true, currency: true, rooms: true,
    propertyType: true, listingType: true, latitude: true, longitude: true, showExactLocation: true,
    monthlyRent: true, urgentSale: true, rentalPeriod: true, viewCount: true,
    images: { take: 1, orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }], select: { url: true } },
  } satisfies Prisma.ListingSelect;
  let total: number;
  let listings: Prisma.ListingGetPayload<{ select: typeof selectedFields }>[];
  if (filters.belowAverage) {
    const candidates = await prisma.listing.findMany({ where, orderBy: sortBy(filters.sort), take: 1500, select: selectedFields });
    const cache = new Map<string, Promise<{ count: number; avg: number }>>();
    const filtered = [] as typeof candidates;
    for (const item of candidates) {
      const key = `${item.city}|${item.propertyType}|${item.listingType}|${item.currency}`;
      let stats = cache.get(key);
      if (!stats) {
        stats = (async () => {
          const peers = await prisma.listing.findMany({ where: { status: "PUBLISHED", deletedAt: null, city: item.city, propertyType: item.propertyType, listingType: item.listingType, currency: item.currency }, take: 500, select: { area: true, price: true, monthlyRent: true } });
          const rates = peers.map((peer) => Number((item.listingType === "RENT" ? (peer.monthlyRent ?? peer.price) : peer.price).toString()) / Number(peer.area.toString())).filter((rate) => Number.isFinite(rate) && rate > 0);
          return { count: rates.length, avg: rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0 };
        })();
        cache.set(key, stats);
      }
      const avg = await stats;
      const price = Number((item.listingType === "RENT" ? (item.monthlyRent ?? item.price) : item.price).toString());
      if (avg.count >= 5 && Number(item.area) > 0 && price / Number(item.area) < avg.avg * 0.9) filtered.push(item);
    }
    total = filtered.length;
    const totalPagesForFiltered = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(requestedPage, totalPagesForFiltered);
    listings = (view === "map" ? filtered.slice(0, 500) : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)) as typeof listings;
  } else {
    total = await prisma.listing.count({ where });
    const totalPagesForNormal = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(requestedPage, totalPagesForNormal);
    listings = await prisma.listing.findMany({ where, orderBy: sortBy(filters.sort), skip: view === "map" ? 0 : (safePage - 1) * PAGE_SIZE, take: view === "map" ? 500 : PAGE_SIZE, select: selectedFields }) as typeof listings;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

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
            <span>مدت اجاره</span>
            <select name="rentPeriod" defaultValue={filters.rentPeriod}>
              <option value="">همهٔ مدت‌ها</option><option value="LONG_TERM">بلندمدت</option><option value="DAILY">روزانه</option><option value="WEEKLY">هفتگی</option><option value="HOURLY">ساعتی</option>
            </select>
          </label>
          <label className="hy-field"><span>فروش فوری</span><select name="urgent" defaultValue={filters.urgent ? "1" : "0"}><option value="0">فرقی ندارد</option><option value="1">فقط فروش فوری</option></select></label>
          <label className="hy-field"><span>مقایسه قیمت</span><select name="belowAverage" defaultValue={filters.belowAverage ? "1" : "0"}><option value="0">همه قیمت‌ها</option><option value="1">حدود ۱۰٪ پایین‌تر از میانگین آگهی‌های مشابه</option></select></label>
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
            return { id: listing.id, title: listing.title, city: listing.city, price: String(listing.price), currency: listing.currency, latitude: listing.latitude! + offsetLat, longitude: listing.longitude! + offsetLon, imageUrl: listing.images[0]?.url ?? null, listingType: listing.listingType, urgentSale: listing.urgentSale, rentalPeriod: listing.rentalPeriod };
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