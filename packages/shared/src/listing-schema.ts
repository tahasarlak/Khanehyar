import { z } from "zod";

export const listingSchema = z.object({
  title: z.string().trim().min(5, "عنوان باید حداقل ۵ کاراکتر باشد").max(120),
  description: z.string().trim().min(20, "توضیحات باید حداقل ۲۰ کاراکتر باشد").max(5000),

  listingType: z.enum(["SALE", "RENT"]),
  propertyType: z.enum([
    "APARTMENT",
    "HOUSE",
    "VILLA",
    "LAND",
    "COMMERCIAL",
  ]),

  price: z.number().positive("قیمت باید بیشتر از صفر باشد"),
  currency: z.string().trim().length(3),

  area: z.number().positive("مساحت باید بیشتر از صفر باشد"),
  rooms: z.number().int().nonnegative().nullable(),

  city: z.string().trim().min(2).max(100),
  address: z.string().trim().max(300).nullable(),

  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),

  yearBuilt: z.number().int().min(1000).max(2200).nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  parkingSpaces: z.number().int().nonnegative().nullable().optional(),
  hasElevator: z.boolean().nullable().optional(),
  hasStorage: z.boolean().nullable().optional(),
  heatingType: z.string().trim().max(80).nullable().optional(),
  coolingType: z.string().trim().max(80).nullable().optional(),
  documentType: z.string().trim().max(100).nullable().optional(),
  orientation: z.string().trim().max(50).nullable().optional(),
  naturalLight: z.string().trim().max(50).nullable().optional(),
  furnished: z.boolean().nullable().optional(),
  readyToMove: z.boolean().nullable().optional(),
  balcony: z.boolean().nullable().optional(),
  terrace: z.boolean().nullable().optional(),
  garden: z.boolean().nullable().optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  monthlyRent: z.number().positive().nullable().optional(),
  deposit: z.number().nonnegative().nullable().optional(),
  allowDepositConversion: z.boolean().default(false),
  advertiserType: z.enum(["UNSPECIFIED", "OWNER", "AGENT", "BUILDER"]).default("UNSPECIFIED"),
  showExactLocation: z.boolean().default(false),
  imageUrls: z.array(z.url()).max(30).default([]),
});

export type CreateListingInput = z.infer<typeof listingSchema>;
