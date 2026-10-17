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

  imageUrls: z.array(z.url()).max(30),
});

export type CreateListingInput = z.infer<typeof listingSchema>;
