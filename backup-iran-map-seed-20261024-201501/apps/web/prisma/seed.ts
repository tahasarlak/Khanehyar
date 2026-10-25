import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cities = [
  { name: "Москва", lat: 55.751244, lon: 37.618423, latSpread: 0.19, lonSpread: 0.28 },
  { name: "Санкт-Петербург", lat: 59.9386, lon: 30.3141, latSpread: 0.15, lonSpread: 0.22 },
  { name: "Казань", lat: 55.7961, lon: 49.1064, latSpread: 0.10, lonSpread: 0.14 },
  { name: "Екатеринбург", lat: 56.8389, lon: 60.6057, latSpread: 0.12, lonSpread: 0.16 },
  { name: "Новосибирск", lat: 55.0084, lon: 82.9357, latSpread: 0.12, lonSpread: 0.16 },
  { name: "Нижний Новгород", lat: 56.2965, lon: 43.9361, latSpread: 0.09, lonSpread: 0.12 },
  { name: "Самара", lat: 53.1959, lon: 50.1002, latSpread: 0.10, lonSpread: 0.15 },
  { name: "Сочи", lat: 43.6028, lon: 39.7342, latSpread: 0.10, lonSpread: 0.13 },
  { name: "Краснодар", lat: 45.0355, lon: 38.9753, latSpread: 0.10, lonSpread: 0.14 },
  { name: "Ростов-на-Дону", lat: 47.2357, lon: 39.7015, latSpread: 0.09, lonSpread: 0.13 },
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

const apartmentTitles = ["Светлая квартира с панорамными окнами", "Уютная квартира рядом с парком", "Современная квартира после ремонта", "Квартира с просторной кухней", "Семейная квартира в тихом районе", "Квартира с видом на город", "Компактная квартира для инвестиций", "Квартира рядом с метро"];
const houseTitles = ["Загородный дом с садом", "Семейный дом с террасой", "Дом в спокойном районе", "Современный дом с парковкой"];
const villaTitles = ["Вилла с бассейном и садом", "Загородная вилла с панорамным видом", "Уютная вилла для отдыха"];
const landTitles = ["Участок под строительство", "Земельный участок с удобным подъездом", "Участок для загородного дома"];
const commercialTitles = ["Коммерческое помещение на первой линии", "Офисное пространство с ремонтом", "Помещение для магазина или студии"];
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
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      name: "Khanehyar Demo Owner",
      email: "test@example.com",
      passwordHash: "TEMPORARY_HASH_NOT_FOR_LOGIN",
      role: "USER",
    },
  });

  for (let index = 1; index <= 100; index++) {
    const number = String(index).padStart(3, "0");
    const id = `demo-listing-${number}`;
    const city = cities[(index - 1) % cities.length];
    const propertyType = propertyTypes[(index - 1) % propertyTypes.length];
    const listingType = listingTypes[(Math.floor((index - 1) / 2) + index) % listingTypes.length];
    const title = `DEMO ${number}: ${titleFor(propertyType, index)}`;
    const price = listingType === "RENT"
      ? String(25000 + ((index * 13700) % 180000))
      : String(3500000 + ((index * 917531) % 42000000));
    const area = propertyType === "LAND"
      ? 250 + ((index * 47) % 1800)
      : propertyType === "COMMERCIAL"
        ? 35 + ((index * 13) % 450)
        : 28 + ((index * 7) % 210);
    const latitude = city.lat + deterministicOffset(index, city.latSpread, 1);
    const longitude = city.lon + deterministicOffset(index, city.lonSpread, 2);
    const rooms = propertyType === "LAND" || propertyType === "COMMERCIAL" ? null : 1 + (index % 5);

    await prisma.listing.upsert({
      where: { id },
      update: {
        title,
        description: `ТЕСТОВОЕ ОБЪЯВЛЕНИЕ. Демонстрационные данные для проверки карты и поиска. Не является реальным предложением. Вариант ${number}.`,
        listingType,
        propertyType,
        status: "PUBLISHED",
        deletedAt: null,
        deleteExpiresAt: null,
        price,
        currency: "RUB",
        area,
        rooms,
        city: city.name,
        address: null,
        latitude,
        longitude,
        showExactLocation: false,
        ownerId: user.id,
      },
      create: {
        id,
        title,
        description: `ТЕСТОВОЕ ОБЪЯВЛЕНИЕ. Демонстрационные данные для проверки карты и поиска. Не является реальным предложением. Вариант ${number}.`,
        listingType,
        propertyType,
        status: "PUBLISHED",
        price,
        currency: "RUB",
        area,
        rooms,
        city: city.name,
        latitude,
        longitude,
        showExactLocation: false,
        ownerId: user.id,
      },
    });

    await prisma.listingImage.upsert({
      where: { id: `demo-image-${number}` },
      update: { url: images[(index - 1) % images.length], sortOrder: 0, label: "DEMO", listingId: id },
      create: { id: `demo-image-${number}`, url: images[(index - 1) % images.length], sortOrder: 0, label: "DEMO", listingId: id },
    });
  }

  console.log("Demo seed complete: 100 clearly labelled listings with approximate map coordinates.");
  console.log("Owner account:", user.email, "(seed does not create a usable password)");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
