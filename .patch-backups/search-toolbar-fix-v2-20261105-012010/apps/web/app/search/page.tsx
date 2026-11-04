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
  city?: RawValue; address?: RawValue; hasPhotos?: RawValue;
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
  floorMin?: RawValue; floorMax?: RawValue; furnished?: RawValue; elevator?: RawValue; parking?: RawValue; urgent?: RawValue; pets?: RawValue; buildingType?: RawValue; constructionStatus?: RawValue; architecturalStyle?: RawValue; windowView?: RawValue; rentalPeriod?: RawValue;
  minDeposit?: RawValue; maxDeposit?: RawValue; bathrooms?: RawValue; yearFrom?: RawValue; yearTo?: RawValue; totalFloorsMin?: RawValue; totalFloorsMax?: RawValue; storage?: RawValue; balcony?: RawValue; terrace?: RawValue; garden?: RawValue; readyToMove?: RawValue; documentType?: RawValue; orientation?: RawValue; naturalLight?: RawValue; heatingType?: RawValue; coolingType?: RawValue; ceilingMin?: RawValue; ceilingMax?: RawValue; advertiserType?: RawValue; negotiable?: RawValue;
};

type SearchFilters = {
  city: string; address: string; hasPhotos: string;
  deal: "SALE" | "RENT" | "";
  property: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "COMMERCIAL" | "";
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  rooms: string;
  sort: "newest" | "price_asc" | "price_desc" | "area_desc" | "popular";
  floorMin: string; floorMax: string; furnished: string; elevator: string; parking: string; urgent: string; pets: string; buildingType: string; constructionStatus: string; architecturalStyle: string; windowView: string; rentalPeriod: string;
  minDeposit: string; maxDeposit: string; bathrooms: string; yearFrom: string; yearTo: string; totalFloorsMin: string; totalFloorsMax: string; storage: string; balcony: string; terrace: string; garden: string; readyToMove: string; documentType: string; orientation: string; naturalLight: string; heatingType: string; coolingType: string; ceilingMin: string; ceilingMax: string; advertiserType: string; negotiable: string;
};

const PAGE_SIZE = 6;

const propertyTypes = [
  "APARTMENT",
  "HOUSE",
  "VILLA",
  "LAND",
  "COMMERCIAL",
] as const;

const sortOptions = ["newest", "price_asc", "price_desc", "area_desc", "popular"] as const;

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
    city: single(params.city).slice(0, 100), address: single(params.address).slice(0, 150), hasPhotos: single(params.hasPhotos) === "true" ? "true" : "",
    deal,
    property,
    minPrice: moneyInput(params.minPrice),
    maxPrice: moneyInput(params.maxPrice),
    minArea: areaInput(params.minArea),
    maxArea: areaInput(params.maxArea),
    rooms: roomInput(params.rooms),
    sort,
    floorMin: moneyInput(params.floorMin), floorMax: moneyInput(params.floorMax), furnished: ["true","false"].includes(single(params.furnished)) ? single(params.furnished) : "", elevator: ["true","false"].includes(single(params.elevator)) ? single(params.elevator) : "", parking: ["true","false"].includes(single(params.parking)) ? single(params.parking) : "", urgent: single(params.urgent) === "true" ? "true" : "", pets: ["true","false"].includes(single(params.pets)) ? single(params.pets) : "", buildingType: single(params.buildingType).slice(0,80), constructionStatus: single(params.constructionStatus).slice(0,80), architecturalStyle: single(params.architecturalStyle).slice(0,80), windowView: single(params.windowView).slice(0,80), rentalPeriod: ["LONG_TERM","DAILY","WEEKLY","HOURLY"].includes(single(params.rentalPeriod)) ? single(params.rentalPeriod) : "",
    minDeposit: moneyInput(params.minDeposit), maxDeposit: moneyInput(params.maxDeposit), bathrooms: roomInput(params.bathrooms), yearFrom: moneyInput(params.yearFrom), yearTo: moneyInput(params.yearTo), totalFloorsMin: moneyInput(params.totalFloorsMin), totalFloorsMax: moneyInput(params.totalFloorsMax), storage: ["true","false"].includes(single(params.storage)) ? single(params.storage) : "", balcony: ["true","false"].includes(single(params.balcony)) ? single(params.balcony) : "", terrace: ["true","false"].includes(single(params.terrace)) ? single(params.terrace) : "", garden: ["true","false"].includes(single(params.garden)) ? single(params.garden) : "", readyToMove: ["true","false"].includes(single(params.readyToMove)) ? single(params.readyToMove) : "", documentType: single(params.documentType).slice(0,100), orientation: single(params.orientation).slice(0,50), naturalLight: single(params.naturalLight).slice(0,50), heatingType: single(params.heatingType).slice(0,80), coolingType: single(params.coolingType).slice(0,80), ceilingMin: single(params.ceilingMin).match(/^\d{1,2}(?:\.\d{1,2})?$/) ? single(params.ceilingMin) : "", ceilingMax: single(params.ceilingMax).match(/^\d{1,2}(?:\.\d{1,2})?$/) ? single(params.ceilingMax) : "", advertiserType: ["OWNER","AGENT","AGENCY","BUILDER"].includes(single(params.advertiserType)) ? single(params.advertiserType) : "", negotiable: ["true","false"].includes(single(params.negotiable)) ? single(params.negotiable) : "",
  };
}

function buildWhere(filters: SearchFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters.address) where.address = { contains: filters.address, mode: "insensitive" };
  if (filters.hasPhotos === "true") where.images = { some: {} };

  if (filters.deal) {
    where.listingType = filters.deal;
  }

  if (filters.property) {
    where.propertyType = filters.property;
  }

  if (filters.minPrice || filters.maxPrice) {
    const range = { ...(filters.minPrice ? { gte: filters.minPrice } : {}), ...(filters.maxPrice ? { lte: filters.maxPrice } : {}) };
    if (filters.deal === "RENT") where.monthlyRent = range;
    else if (filters.deal === "SALE") where.price = range;
    else where.OR = [{ listingType: "SALE", price: range }, { listingType: "RENT", monthlyRent: range }];
  }

  if (filters.minArea || filters.maxArea) {
    where.area = {
      ...(filters.minArea ? { gte: filters.minArea } : {}),
      ...(filters.maxArea ? { lte: filters.maxArea } : {}),
    };
  }

  if (filters.rooms) where.rooms = { gte: Number(filters.rooms) };
  if (filters.floorMin || filters.floorMax) where.floor = { ...(filters.floorMin ? { gte: Number(filters.floorMin) } : {}), ...(filters.floorMax ? { lte: Number(filters.floorMax) } : {}) };
  if (filters.furnished) where.furnished = filters.furnished === "true";
  if (filters.elevator) where.hasElevator = filters.elevator === "true";
  if (filters.parking === "true") where.parkingSpaces = { gt: 0 };
  if (filters.parking === "false") where.parkingSpaces = 0;
  if (filters.urgent === "true") where.urgentSale = true;
  if (filters.pets) where.petsAllowed = filters.pets === "true";
  if (filters.buildingType) where.buildingType = filters.buildingType;
  if (filters.constructionStatus) where.constructionStatus = filters.constructionStatus;
  if (filters.architecturalStyle) where.architecturalStyle = filters.architecturalStyle;
  if (filters.windowView) where.windowView = filters.windowView;
  if (filters.rentalPeriod) where.rentalPeriod = filters.rentalPeriod as "LONG_TERM" | "DAILY" | "WEEKLY" | "HOURLY";
  if (filters.minDeposit || filters.maxDeposit) where.deposit = { ...(filters.minDeposit ? { gte: filters.minDeposit } : {}), ...(filters.maxDeposit ? { lte: filters.maxDeposit } : {}) };
  if (filters.bathrooms) where.bathrooms = { gte: Number(filters.bathrooms) };
  if (filters.yearFrom || filters.yearTo) where.yearBuilt = { ...(filters.yearFrom ? { gte: Number(filters.yearFrom) } : {}), ...(filters.yearTo ? { lte: Number(filters.yearTo) } : {}) };
  if (filters.totalFloorsMin || filters.totalFloorsMax) where.totalFloors = { ...(filters.totalFloorsMin ? { gte: Number(filters.totalFloorsMin) } : {}), ...(filters.totalFloorsMax ? { lte: Number(filters.totalFloorsMax) } : {}) };
  if (filters.storage) where.hasStorage = filters.storage === "true";
  if (filters.balcony) where.balcony = filters.balcony === "true";
  if (filters.terrace) where.terrace = filters.terrace === "true";
  if (filters.garden) where.garden = filters.garden === "true";
  if (filters.readyToMove) where.readyToMove = filters.readyToMove === "true";
  if (filters.documentType) where.documentType = filters.documentType;
  if (filters.orientation) where.orientation = filters.orientation;
  if (filters.naturalLight) where.naturalLight = filters.naturalLight;
  if (filters.heatingType) where.heatingType = filters.heatingType;
  if (filters.coolingType) where.coolingType = filters.coolingType;
  if (filters.ceilingMin || filters.ceilingMax) where.ceilingHeight = { ...(filters.ceilingMin ? { gte: filters.ceilingMin } : {}), ...(filters.ceilingMax ? { lte: filters.ceilingMax } : {}) };
  if (filters.advertiserType) where.advertiserType = filters.advertiserType;
  if (filters.negotiable) where.priceNegotiable = filters.negotiable === "true";

  return where;
}

function sortBy(value: SearchFilters["sort"], deal: SearchFilters["deal"]): Prisma.ListingOrderByWithRelationInput[] {
  switch (value) {
    case "price_asc":
      return deal === "RENT" ? [{ monthlyRent: "asc" }, { id: "desc" }] : [{ price: "asc" }, { id: "desc" }];
    case "price_desc":
      return deal === "RENT" ? [{ monthlyRent: "desc" }, { id: "desc" }] : [{ price: "desc" }, { id: "desc" }];
    case "area_desc":
      return [{ area: "desc" }, { id: "desc" }];
    case "popular": return [{ viewCount: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

function pageUrl(filters: SearchFilters, page: number): string {
  const query = new URLSearchParams();

  const values: Record<string, string> = {
    city: filters.city, address: filters.address, hasPhotos: filters.hasPhotos,
    deal: filters.deal,
    property: filters.property,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minArea: filters.minArea,
    maxArea: filters.maxArea,
    rooms: filters.rooms,
    sort: filters.sort === "newest" ? "" : filters.sort, floorMin: filters.floorMin, floorMax: filters.floorMax, furnished: filters.furnished, elevator: filters.elevator, parking: filters.parking, urgent: filters.urgent, pets: filters.pets, buildingType: filters.buildingType, constructionStatus: filters.constructionStatus, architecturalStyle: filters.architecturalStyle, windowView: filters.windowView, rentalPeriod: filters.rentalPeriod,
    minDeposit: filters.minDeposit, maxDeposit: filters.maxDeposit, bathrooms: filters.bathrooms, yearFrom: filters.yearFrom, yearTo: filters.yearTo, totalFloorsMin: filters.totalFloorsMin, totalFloorsMax: filters.totalFloorsMax, storage: filters.storage, balcony: filters.balcony, terrace: filters.terrace, garden: filters.garden, readyToMove: filters.readyToMove, documentType: filters.documentType, orientation: filters.orientation, naturalLight: filters.naturalLight, heatingType: filters.heatingType, coolingType: filters.coolingType, ceilingMin: filters.ceilingMin, ceilingMax: filters.ceilingMax, advertiserType: filters.advertiserType, negotiable: filters.negotiable,
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
    orderBy: sortBy(filters.sort, filters.deal),
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
      urgentSale: true, rentalPeriod: true, viewCount: true, monthlyRent: true, deposit: true, priceNegotiable: true,
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
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && value !== "").length;

  return (
    <div className="hy-advanced-layout">
      <div className="hy-search-filter-toolbar">
        <form action="/search" method="get" className="hy-search-box" role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
          <input name="city" type="search" defaultValue={filters.city} maxLength={100} placeholder="جست‌وجو بر اساس شهر..." aria-label="جست‌وجوی شهر، محله یا نشانی" />
          <button type="submit">جست‌وجو</button>
        </form>
        <details className="hy-advanced-sidebar hy-mobile-filter-panel">
          <summary className="hy-mobile-filter-summary" aria-label="باز کردن فیلترهای پیشرفته">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.1v5.1l-3.6 1.8v-6.9L4 5Z"/></svg>
            <span className="hy-filter-trigger-label">فیلترهای بیشتر</span>
            {activeFilterCount > 0 && <span className="hy-filter-count">{activeFilterCount.toLocaleString("fa-IR")}</span>}
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

          <label className="hy-field"><span>محله، خیابان یا نشانی</span><input name="address" type="search" maxLength={150} defaultValue={filters.address} placeholder="مثلاً سعادت‌آباد، خیابان فرشته" /></label>
          <label className="hy-field"><span>وجود تصویر</span><select name="hasPhotos" defaultValue={filters.hasPhotos}><option value="">همه آگهی‌ها</option><option value="true">فقط آگهی‌های دارای عکس</option></select></label>

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

          <label className="hy-field"><span>مدت اجاره</span><select name="rentalPeriod" defaultValue={filters.rentalPeriod}><option value="">همه مدت‌ها</option><option value="LONG_TERM">بلندمدت</option><option value="DAILY">روزانه</option><option value="WEEKLY">هفتگی</option><option value="HOURLY">ساعتی</option></select></label>

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

          <fieldset className="hy-filter-group"><legend>طبقه</legend><div className="hy-filter-pair"><label className="hy-field"><span>از طبقه</span><input name="floorMin" type="number" min="0" max="200" defaultValue={filters.floorMin} placeholder="حداقل"/></label><label className="hy-field"><span>تا طبقه</span><input name="floorMax" type="number" min="0" max="200" defaultValue={filters.floorMax} placeholder="حداکثر"/></label></div></fieldset>
          <label className="hy-field"><span>مبله</span><select name="furnished" defaultValue={filters.furnished}><option value="">فرقی ندارد</option><option value="true">فقط مبله</option><option value="false">غیرمبله</option></select></label>
          <label className="hy-field"><span>آسانسور</span><select name="elevator" defaultValue={filters.elevator}><option value="">فرقی ندارد</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>
          <label className="hy-field"><span>پارکینگ</span><select name="parking" defaultValue={filters.parking}><option value="">فرقی ندارد</option><option value="true">دارای پارکینگ</option><option value="false">بدون پارکینگ</option></select></label>
          <label className="hy-field"><span>حیوان خانگی</span><select name="pets" defaultValue={filters.pets}><option value="">فرقی ندارد</option><option value="true">مجاز</option><option value="false">غیرمجاز</option></select></label>
          <label className="hy-field"><span>فروش فوری</span><select name="urgent" defaultValue={filters.urgent}><option value="">همه</option><option value="true">فقط فروش فوری</option></select></label>
          <label className="hy-field"><span>نوع ساختمان</span><select name="buildingType" defaultValue={filters.buildingType}><option value="">همه</option>{["آپارتمان کم‌واحد","مجتمع مسکونی","برج مسکونی","خانه مستقل","ویلایی","ساختمان اداری-تجاری"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>وضعیت ساخت</span><select name="constructionStatus" defaultValue={filters.constructionStatus}><option value="">همه</option>{["آماده سکونت","در حال ساخت","پیش‌فروش","نیازمند بازسازی","کلنگی و آماده تخریب"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>سبک معماری</span><select name="architecturalStyle" defaultValue={filters.architecturalStyle}><option value="">همه</option>{["مدرن","کلاسیک","نئوکلاسیک","رومی","مینیمال","اسکاندیناوی","سنتی ایرانی","صنعتی","روستیک","لوکس"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>منظره پنجره</span><select name="windowView" defaultValue={filters.windowView}><option value="">همه</option>{["خیابان","کوچه","حیاط","باغ و فضای سبز","جنگل","کوهستان","دریا","خط آسمان شهر","بدون منظرهٔ خاص"].map(x=><option key={x}>{x}</option>)}</select></label>

          <div className="hy-filter-section-title"><strong>جزئیات تکمیلی ملک</strong><span>برای رسیدن به نتیجه دقیق‌تر</span></div>
          <fieldset className="hy-filter-group"><legend>ودیعه / رهن (ویژه اجاره)</legend><div className="hy-filter-pair"><label className="hy-field"><span>حداقل</span><input name="minDeposit" type="number" min="0" defaultValue={filters.minDeposit} placeholder="از" /></label><label className="hy-field"><span>حداکثر</span><input name="maxDeposit" type="number" min="0" defaultValue={filters.maxDeposit} placeholder="تا" /></label></div></fieldset>
          <label className="hy-field"><span>تعداد سرویس بهداشتی</span><select name="bathrooms" defaultValue={filters.bathrooms}><option value="">فرقی ندارد</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} و بیشتر</option>)}</select></label>
          <fieldset className="hy-filter-group"><legend>سال ساخت</legend><div className="hy-filter-pair"><label className="hy-field"><span>از سال</span><input name="yearFrom" type="number" min="1300" max="1500" defaultValue={filters.yearFrom} placeholder="مثلاً ۱۳۹۵" /></label><label className="hy-field"><span>تا سال</span><input name="yearTo" type="number" min="1300" max="1500" defaultValue={filters.yearTo} placeholder="مثلاً ۱۴۰۵" /></label></div></fieldset>
          <fieldset className="hy-filter-group"><legend>تعداد طبقات ساختمان</legend><div className="hy-filter-pair"><label className="hy-field"><span>حداقل</span><input name="totalFloorsMin" type="number" min="1" max="200" defaultValue={filters.totalFloorsMin} /></label><label className="hy-field"><span>حداکثر</span><input name="totalFloorsMax" type="number" min="1" max="200" defaultValue={filters.totalFloorsMax} /></label></div></fieldset>
          <label className="hy-field"><span>انباری</span><select name="storage" defaultValue={filters.storage}><option value="">فرقی ندارد</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>
          <label className="hy-field"><span>بالکن</span><select name="balcony" defaultValue={filters.balcony}><option value="">فرقی ندارد</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>
          <label className="hy-field"><span>تراس</span><select name="terrace" defaultValue={filters.terrace}><option value="">فرقی ندارد</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>
          <label className="hy-field"><span>حیاط / باغ</span><select name="garden" defaultValue={filters.garden}><option value="">فرقی ندارد</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>
          <label className="hy-field"><span>آماده تحویل</span><select name="readyToMove" defaultValue={filters.readyToMove}><option value="">فرقی ندارد</option><option value="true">بله</option><option value="false">خیر</option></select></label>
          <label className="hy-field"><span>نوع سند</span><select name="documentType" defaultValue={filters.documentType}><option value="">همه انواع</option>{["شش‌دانگ","تک‌برگ","منگوله‌دار","قولنامه‌ای","سند تعاونی","اوقافی","در حال اخذ سند"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>جهت ملک</span><select name="orientation" defaultValue={filters.orientation}><option value="">فرقی ندارد</option>{["شمالی","جنوبی","شرقی","غربی","دو نبش","سه نبش"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>نور طبیعی</span><select name="naturalLight" defaultValue={filters.naturalLight}><option value="">فرقی ندارد</option>{["زیاد","متوسط","کم","نورگیر از دو طرف"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>سیستم گرمایش</span><select name="heatingType" defaultValue={filters.heatingType}><option value="">همه</option>{["پکیج","شوفاژ","موتورخانه","بخاری","گرمایش از کف","اسپلیت"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="hy-field"><span>سیستم سرمایش</span><select name="coolingType" defaultValue={filters.coolingType}><option value="">همه</option>{["کولر آبی","کولر گازی","اسپلیت","چیلر","داکت اسپلیت","بدون سیستم سرمایش"].map(x=><option key={x}>{x}</option>)}</select></label>
          <fieldset className="hy-filter-group"><legend>ارتفاع سقف (متر)</legend><div className="hy-filter-pair"><label className="hy-field"><span>از</span><input name="ceilingMin" type="number" min="1" max="10" step="0.1" defaultValue={filters.ceilingMin}/></label><label className="hy-field"><span>تا</span><input name="ceilingMax" type="number" min="1" max="10" step="0.1" defaultValue={filters.ceilingMax}/></label></div></fieldset>
          <label className="hy-field"><span>آگهی‌دهنده</span><select name="advertiserType" defaultValue={filters.advertiserType}><option value="">همه</option><option value="OWNER">مالک</option><option value="AGENT">مشاور املاک</option><option value="AGENCY">آژانس</option><option value="BUILDER">سازنده</option></select></label>
          <label className="hy-field"><span>قیمت</span><select name="negotiable" defaultValue={filters.negotiable}><option value="">فرقی ندارد</option><option value="true">قابل مذاکره</option><option value="false">قطعی</option></select></label>

          <label className="hy-field">
            <span>مرتب‌سازی</span>
            <select name="sort" defaultValue={filters.sort}>
              <option value="newest">جدیدترین آگهی‌ها</option>
              <option value="price_asc">ارزان‌ترین</option>
              <option value="price_desc">گران‌ترین</option>
              <option value="area_desc">بیشترین متراژ</option><option value="popular">پربازدیدترین</option>
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
            return { id: listing.id, title: listing.title, city: listing.city, price: String(listing.listingType === "RENT" && listing.monthlyRent !== null ? listing.monthlyRent : listing.price), currency: listing.currency, latitude: base.latitude + offsetLat, longitude: base.longitude + offsetLon, imageUrl: listing.images[0]?.url ?? null, listingType: listing.listingType, urgentSale: listing.urgentSale, rentalPeriod: listing.rentalPeriod };
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