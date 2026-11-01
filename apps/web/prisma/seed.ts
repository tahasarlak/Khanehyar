import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// تمام اطلاعات این فایل صرفاً آزمایشی است و برای محیط توسعه ساخته شده است.
const cities = [
  { name: "تهران", lat: 35.7219, lon: 51.3347, latSpread: 0.16, lonSpread: 0.22 },
  { name: "مشهد", lat: 36.2972, lon: 59.6067, latSpread: 0.11, lonSpread: 0.14 },
  { name: "اصفهان", lat: 32.6546, lon: 51.6680, latSpread: 0.10, lonSpread: 0.13 },
  { name: "شیراز", lat: 29.5918, lon: 52.5837, latSpread: 0.10, lonSpread: 0.13 },
  { name: "تبریز", lat: 38.0962, lon: 46.2738, latSpread: 0.10, lonSpread: 0.13 },
  { name: "کرج", lat: 35.8400, lon: 50.9391, latSpread: 0.08, lonSpread: 0.10 },
  { name: "قم", lat: 34.6416, lon: 50.8746, latSpread: 0.07, lonSpread: 0.09 },
  { name: "اهواز", lat: 31.3183, lon: 48.6706, latSpread: 0.09, lonSpread: 0.12 },
  { name: "رشت", lat: 37.2808, lon: 49.5832, latSpread: 0.07, lonSpread: 0.09 },
  { name: "کرمان", lat: 30.2839, lon: 57.0834, latSpread: 0.09, lonSpread: 0.12 },
] as const;

const images = [
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
];

const apartmentTitles = [
  "آپارتمان نورگیر با پنجره‌های بزرگ", "آپارتمان دنج نزدیک پارک", "آپارتمان نوساز با طراحی مدرن",
  "آپارتمان با آشپزخانه جادار", "آپارتمان خانوادگی در محله‌ای آرام", "آپارتمان با چشم‌انداز شهر",
  "آپارتمان مناسب سرمایه‌گذاری", "آپارتمان نزدیک دسترسی‌های اصلی",
];
const houseTitles = ["خانه حیاط‌دار مناسب خانواده", "خانه با تراس و نور طبیعی", "خانه در محله‌ای آرام", "خانه با پارکینگ اختصاصی"];
const villaTitles = ["ویلای باغ‌دار با فضای باز", "ویلای خوش‌نقشه با چشم‌انداز", "ویلای دنج برای تعطیلات"];
const landTitles = ["زمین مناسب ساخت‌وساز", "زمین با دسترسی مناسب", "قطعه زمین مناسب خانه‌سازی"];
const commercialTitles = ["مغازه در موقعیت پرتردد", "فضای اداری آماده استفاده", "واحد تجاری مناسب فروشگاه"];
const propertyTypes = ["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL"] as const;
const listingTypes = ["SALE", "RENT"] as const;

function titleFor(type: (typeof propertyTypes)[number], index: number) {
  const source = type === "APARTMENT" ? apartmentTitles : type === "HOUSE" ? houseTitles : type === "VILLA" ? villaTitles : type === "LAND" ? landTitles : commercialTitles;
  return source[index % source.length];
}

function deterministicOffset(index: number, spread: number, salt: number) {
  const raw = ((index * 7919 + salt * 104729) % 10000) / 9999;
  return (raw - 0.5) * spread;
}

async function main() {
  // حساب نمایشی امکان ورود ندارد؛ فقط برای مالکیت رکوردهای Seed استفاده می‌شود.
  const user = await prisma.user.upsert({
    where: { email: "demo-owner@khanehyar.test" },
    update: { name: "مالک آزمایشی خانه‌یار" },
    create: {
      name: "مالک آزمایشی خانه‌یار",
      email: "demo-owner@khanehyar.test",
      passwordHash: "DEMO_ACCOUNT_CANNOT_LOGIN",
      role: "USER",
    },
  });

  for (let index = 1; index <= 100; index++) {
    const number = String(index).padStart(3, "0");
    const id = `demo-listing-${number}`;
    const city = cities[(index - 1) % cities.length];
    const propertyType = propertyTypes[(index - 1) % propertyTypes.length];
    const listingType = listingTypes[(Math.floor((index - 1) / 2) + index) % listingTypes.length];
    const title = `نمونه آزمایشی ${number}: ${titleFor(propertyType, index)}`;

    // مبالغ برای نمایش آزمایشی و بر حسب تومان هستند؛ آگهی واقعی محسوب نمی‌شوند.
    const price = listingType === "RENT"
      ? String(15_000_000 + ((index * 7_300_000) % 175_000_000))
      : String(2_500_000_000 + ((index * 917_531_000) % 47_000_000_000));
    const area = propertyType === "LAND"
      ? 250 + ((index * 47) % 1800)
      : propertyType === "COMMERCIAL"
        ? 35 + ((index * 13) % 450)
        : 28 + ((index * 7) % 210);
    const latitude = city.lat + deterministicOffset(index, city.latSpread, 1);
    const longitude = city.lon + deterministicOffset(index, city.lonSpread, 2);
    const rooms = propertyType === "LAND" || propertyType === "COMMERCIAL" ? null : 1 + (index % 5);
    const description = `این آگهی صرفاً دادهٔ آزمایشی خانه‌یار برای بررسی فهرست، فیلترها و نقشه است. شماره نمونه: ${number}. پیشنهاد واقعی نیست.`;

    await prisma.listing.upsert({
      where: { id },
      update: {
        title, description, listingType, propertyType, status: "PUBLISHED", rentalPeriod: listingType === "RENT" ? "LONG_TERM" : null, urgentSale: listingType === "SALE" && index % 11 === 0,
        deletedAt: null, deleteExpiresAt: null, price, currency: "IRT", area, rooms,
        city: city.name, address: null, latitude, longitude, showExactLocation: false, monthlyRent: listingType === "RENT" ? price : null, deposit: listingType === "RENT" ? String(Math.round(Number(price) * 2)) : null, floor: propertyType === "APARTMENT" ? 1 + (index % 12) : 0, totalFloors: propertyType === "APARTMENT" ? 4 + (index % 20) : 1, yearBuilt: 1380 + (index % 45), bathrooms: propertyType === "LAND" ? null : 1 + (index % 3), parkingSpaces: propertyType === "LAND" ? null : index % 4, hasElevator: propertyType === "APARTMENT" ? index % 5 !== 0 : false, hasStorage: index % 3 === 0, readyToMove: index % 8 !== 0, balcony: propertyType === "APARTMENT" ? index % 2 === 0 : null, terrace: propertyType === "VILLA" ? true : null, garden: propertyType === "VILLA" ? true : null,
        ceilingHeight: propertyType === "LAND" ? null : Number((2.7 + (index % 7) * 0.1).toFixed(2)),
        architecturalStyle: propertyType === "LAND" ? null : (["مدرن", "کلاسیک", "نئوکلاسیک", "رومی", "مینیمال", "سنتی ایرانی"][index % 6]),
        windowView: propertyType === "LAND" ? null : (["خیابان", "کوچه", "حیاط", "باغ و فضای سبز", "خط آسمان شهر", "کوهستان"][index % 6]),
        furnished: listingType === "RENT" ? index % 3 !== 0 : index % 4 === 0,
        furnishedItems: index % 3 === 0 ? [] : (["مبل و میز پذیرایی", "یخچال", "اجاق گاز", "ماشین لباس‌شویی", "تخت‌خواب"].slice(0, 2 + (index % 4))),
        accessibilitySuitable: index % 4 === 0,
        accessibilityFeatures: index % 4 === 0 ? ["ورودی بدون پله", "آسانسور مناسب ویلچر", "درهای عریض"].slice(0, 1 + (index % 3)) : [],
        buildingType: propertyType === "VILLA" ? "ویلایی" : "آپارتمان کم‌واحد", constructionStatus: index % 9 === 0 ? "نیازمند بازسازی" : "آماده سکونت", structureType: index % 2 ? "بتنی" : "فلزی", facadeType: index % 3 ? "سنگ" : "آجر", elevatorCount: propertyType === "APARTMENT" ? 1 + (index % 3) : 0, unitCount: propertyType === "APARTMENT" ? 6 + (index % 30) : 1, parkingType: index % 4 ? "اختصاصی سندی" : "روباز", serviceCharge: listingType === "RENT" ? 500000 + (index * 25000) : null, commission: null, advancePayment: listingType === "RENT" ? 1000000 + (index * 50000) : null, minimumContractMonths: listingType === "RENT" ? 12 : null, petsAllowed: index % 3 === 0, familyOnly: index % 5 === 0, smokingAllowed: false, priceNegotiable: index % 2 === 0,
        ownerId: user.id,
      },
      create: {
        id, title, description, listingType, propertyType, status: "PUBLISHED", rentalPeriod: listingType === "RENT" ? "LONG_TERM" : null, urgentSale: listingType === "SALE" && index % 11 === 0,
        price, currency: "IRT", area, rooms, city: city.name,
        address: null, latitude, longitude, showExactLocation: false, monthlyRent: listingType === "RENT" ? price : null, deposit: listingType === "RENT" ? String(Math.round(Number(price) * 2)) : null, floor: propertyType === "APARTMENT" ? 1 + (index % 12) : 0, totalFloors: propertyType === "APARTMENT" ? 4 + (index % 20) : 1, yearBuilt: 1380 + (index % 45), bathrooms: propertyType === "LAND" ? null : 1 + (index % 3), parkingSpaces: propertyType === "LAND" ? null : index % 4, hasElevator: propertyType === "APARTMENT" ? index % 5 !== 0 : false, hasStorage: index % 3 === 0, readyToMove: index % 8 !== 0, balcony: propertyType === "APARTMENT" ? index % 2 === 0 : null, terrace: propertyType === "VILLA" ? true : null, garden: propertyType === "VILLA" ? true : null,
        ceilingHeight: propertyType === "LAND" ? null : Number((2.7 + (index % 7) * 0.1).toFixed(2)),
        architecturalStyle: propertyType === "LAND" ? null : (["مدرن", "کلاسیک", "نئوکلاسیک", "رومی", "مینیمال", "سنتی ایرانی"][index % 6]),
        windowView: propertyType === "LAND" ? null : (["خیابان", "کوچه", "حیاط", "باغ و فضای سبز", "خط آسمان شهر", "کوهستان"][index % 6]),
        furnished: listingType === "RENT" ? index % 3 !== 0 : index % 4 === 0,
        furnishedItems: index % 3 === 0 ? [] : (["مبل و میز پذیرایی", "یخچال", "اجاق گاز", "ماشین لباس‌شویی", "تخت‌خواب"].slice(0, 2 + (index % 4))),
        accessibilitySuitable: index % 4 === 0,
        accessibilityFeatures: index % 4 === 0 ? ["ورودی بدون پله", "آسانسور مناسب ویلچر", "درهای عریض"].slice(0, 1 + (index % 3)) : [], buildingType: propertyType === "VILLA" ? "ویلایی" : "آپارتمان کم‌واحد", constructionStatus: index % 9 === 0 ? "نیازمند بازسازی" : "آماده سکونت", structureType: index % 2 ? "بتنی" : "فلزی", facadeType: index % 3 ? "سنگ" : "آجر", elevatorCount: propertyType === "APARTMENT" ? 1 + (index % 3) : 0, unitCount: propertyType === "APARTMENT" ? 6 + (index % 30) : 1, parkingType: index % 4 ? "اختصاصی سندی" : "روباز", serviceCharge: listingType === "RENT" ? 500000 + (index * 25000) : null, commission: null, advancePayment: listingType === "RENT" ? 1000000 + (index * 50000) : null, minimumContractMonths: listingType === "RENT" ? 12 : null, petsAllowed: index % 3 === 0, familyOnly: index % 5 === 0, smokingAllowed: false, priceNegotiable: index % 2 === 0, ownerId: user.id,
      },
    });

    await prisma.listingImage.upsert({
      where: { id: `demo-image-${number}` },
      update: { url: images[(index - 1) % images.length], sortOrder: 0, label: "نمونه آزمایشی", altText: `تصویر نمونه آزمایشی ${number}`, listingId: id },
      create: { id: `demo-image-${number}`, url: images[(index - 1) % images.length], sortOrder: 0, label: "نمونه آزمایشی", altText: `تصویر نمونه آزمایشی ${number}`, listingId: id },
    });
  }

  console.log("۱۰۰ آگهی آزمایشی فارسی برای شهرهای ایران ساخته/به‌روزرسانی شد.");
  console.log("همه آگهی‌ها با شناسه demo-listing-001 تا demo-listing-100، وضعیت منتشرشده و مختصات نقشه هستند.");
  console.log("حساب مالک آزمایشی قابل ورود نیست:", user.email);
}

main()
  .catch((error) => {
    console.error("خطا در ساخت داده‌های آزمایشی:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
