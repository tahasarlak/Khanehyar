import UnreadMessagesLink from "../_components/UnreadMessagesLink";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import PropertyCard from "../_components/PropertyCard";
import "../market.css";

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

  const requestedPage = parsePage(params.page);
  const total = await prisma.listing.count({ where });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const listings = await prisma.listing.findMany({
    where,
    orderBy: sortBy(filters.sort),
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { url: true },
      },
    },
  });

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
              placeholder="مثلاً مسکو"
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
      </aside>

      <section className="hy-advanced-results" aria-label="نتایج جست‌وجو">
        <div className="hy-advanced-summary">
          <div>
            <h2>آگهی‌های املاک</h2>
            <p>
              {total.toLocaleString("fa-IR")} آگهی مطابق فیلترها
            </p>
          </div>
          <span className="hy-results-range">
            نمایش {firstResult.toLocaleString("fa-IR")} تا{" "}
            {lastResult.toLocaleString("fa-IR")}
          </span>
        </div>

        {listings.length ? (
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

        {totalPages > 1 && (
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