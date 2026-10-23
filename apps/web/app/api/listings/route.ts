import { NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "../../../src/lib/rate-limit";
import { prisma } from "../../../src/lib/prisma";
import { getCurrentUser } from "../../../src/lib/auth";
import { listingSchema } from "@real-estate/shared";

const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index) => bytes[index] === value);
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  const storedFilePaths: string[] = [];
  let createdListingId: string | null = null;
  const limit = await checkRateLimit("create-listing", getRequestIdentity(request));
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  try {
    // Prevent cross-origin browser submissions.
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return NextResponse.json(
        { error: "مبدأ درخواست معتبر نیست." },
        { status: 403 },
      );
    }

    // Ownership must come from the verified session.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "برای ثبت آگهی ابتدا وارد حساب شوید." },
        { status: 401 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json(
        { error: "فرمت درخواست باید FormData باشد." },
        { status: 415 },
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "اطلاعات ارسال‌شده قابل خواندن نیست." },
        { status: 400 },
      );
    }

    const optionalNumber = (name: string) => { const value = formData.get(name); return value === null || value === "" ? null : Number(value); };
    const optionalBoolean = (name: string) => { const value = String(formData.get(name) ?? ""); return value === "true" ? true : value === "false" ? false : null; };
    const imageEntries = formData.getAll("images");
    const imageFiles = imageEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (imageFiles.length > 8) return NextResponse.json({ error: "حداکثر ۸ تصویر می‌توانی برای هر آگهی ثبت کنی." }, { status: 400 });
    if (imageFiles.some((file) => !imageExtensions[file.type] || file.size > 8 * 1024 * 1024)) return NextResponse.json({ error: "تصاویر باید JPG، PNG یا WebP و هرکدام حداکثر ۸ مگابایت باشند." }, { status: 400 });
    for (const file of imageFiles) if (!(await hasValidImageSignature(file))) return NextResponse.json({ error: "محتوای یکی از تصاویر معتبر نیست." }, { status: 400 });
    if (imageEntries.some((entry) => typeof entry === "string" && entry.trim() !== "")) return NextResponse.json({ error: "فایل تصویر نامعتبر است." }, { status: 400 });

    const rawInput = {
      title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? ""),
      listingType: String(formData.get("listingType") ?? ""), propertyType: String(formData.get("propertyType") ?? ""),
      price: Number(formData.get("price")), currency: String(formData.get("currency") ?? "RUB"), area: Number(formData.get("area")),
      rooms: optionalNumber("rooms"), city: String(formData.get("city") ?? ""), address: String(formData.get("address") ?? "").trim() || null,
      latitude: null, longitude: null, yearBuilt: optionalNumber("yearBuilt"), bathrooms: optionalNumber("bathrooms"), parkingSpaces: optionalNumber("parkingSpaces"),
      hasElevator: optionalBoolean("hasElevator"), hasStorage: optionalBoolean("hasStorage"),
      heatingType: String(formData.get("heatingType") ?? "").trim() || null, coolingType: String(formData.get("coolingType") ?? "").trim() || null,
      documentType: String(formData.get("documentType") ?? "").trim() || null, orientation: String(formData.get("orientation") ?? "").trim() || null,
      naturalLight: String(formData.get("naturalLight") ?? "").trim() || null, furnished: optionalBoolean("furnished"), readyToMove: optionalBoolean("readyToMove"),
      balcony: optionalBoolean("balcony"), terrace: optionalBoolean("terrace"), garden: optionalBoolean("garden"),
      amenities: formData.getAll("amenities").filter((value): value is string => typeof value === "string"),
      monthlyRent: optionalNumber("monthlyRent"), deposit: optionalNumber("deposit"), allowDepositConversion: formData.get("allowDepositConversion") === "true",
      advertiserType: String(formData.get("advertiserType") ?? "UNSPECIFIED"), showExactLocation: formData.get("showExactLocation") === "true", imageUrls: [],
    };

    const validation = listingSchema.safeParse(rawInput);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "اطلاعات فرم معتبر نیست.",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const floorValue = formData.get("floor");
    const totalFloorsValue = formData.get("totalFloors");

    const floor =
      floorValue === null || floorValue === ""
        ? null
        : Number(floorValue);

    const totalFloors =
      totalFloorsValue === null || totalFloorsValue === ""
        ? null
        : Number(totalFloorsValue);

    if (
      (floor !== null && (!Number.isInteger(floor) || floor < 0)) ||
      (totalFloors !== null &&
        (!Number.isInteger(totalFloors) || totalFloors < 1)) ||
      (floor !== null &&
        totalFloors !== null &&
        floor > totalFloors)
    ) {
      return NextResponse.json(
        { error: "اطلاعات طبقه معتبر نیست." },
        { status: 400 },
      );
    }

    const listing = await prisma.listing.create({
      data: {
        title: validation.data.title,
        description: validation.data.description,
        listingType: validation.data.listingType,
        propertyType: validation.data.propertyType,
        price: validation.data.price,
        currency: validation.data.currency,
        area: validation.data.area,
        rooms: validation.data.rooms,
        city: validation.data.city,
        address: validation.data.address,
        latitude: validation.data.latitude,
        longitude: validation.data.longitude,
        floor, totalFloors,
        yearBuilt: validation.data.yearBuilt ?? null, bathrooms: validation.data.bathrooms ?? null, parkingSpaces: validation.data.parkingSpaces ?? null,
        hasElevator: validation.data.hasElevator ?? null, hasStorage: validation.data.hasStorage ?? null,
        heatingType: validation.data.heatingType ?? null, coolingType: validation.data.coolingType ?? null, documentType: validation.data.documentType ?? null,
        orientation: validation.data.orientation ?? null, naturalLight: validation.data.naturalLight ?? null,
        furnished: validation.data.furnished ?? null, readyToMove: validation.data.readyToMove ?? null, balcony: validation.data.balcony ?? null,
        terrace: validation.data.terrace ?? null, garden: validation.data.garden ?? null, amenities: validation.data.amenities,
        monthlyRent: validation.data.monthlyRent ?? null, deposit: validation.data.deposit ?? null,
        allowDepositConversion: validation.data.allowDepositConversion, advertiserType: validation.data.advertiserType, showExactLocation: validation.data.showExactLocation,
        ownerId: user.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        ownerId: true,
        createdAt: true,
      },
    });

    createdListingId = listing.id;
    if (imageFiles.length > 0) {
      const uploadDir = process.env.LISTING_UPLOAD_DIR || path.join(process.cwd(), ".data", "listing-uploads");
      await mkdir(uploadDir, { recursive: true });
      for (const [index, file] of imageFiles.entries()) {
        const extension = imageExtensions[file.type]; const imageId = randomUUID(); const filename = `${imageId}.${extension}`;
        const diskPath = path.join(uploadDir, filename);
        await writeFile(diskPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" }); storedFilePaths.push(diskPath);
        await prisma.listingImage.create({ data: { id: imageId, url: `/api/listing-images/${filename}`, sortOrder: index, altText: validation.data.title.slice(0, 200), listingId: listing.id } });
      }
    }

    return NextResponse.json(
      {
        message: "آگهی ثبت شد و منتظر تأیید مدیر است.",
        listing,
      },
      { status: 201 },
    );
  } catch (error) {
    if (createdListingId) await prisma.listing.deleteMany({ where: { id: createdListingId } }).catch(() => undefined);
    await Promise.all(storedFilePaths.map((filePath) => unlink(filePath).catch(() => undefined)));
    console.error("Create listing failed:", error);

    return NextResponse.json(
      { error: "خطای داخلی هنگام ثبت آگهی." },
      { status: 500 },
    );
  }
}