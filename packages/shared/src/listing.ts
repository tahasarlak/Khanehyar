export type ListingType = "SALE" | "RENT";

export type PropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "LAND"
  | "COMMERCIAL";

export interface Listing {
  id: string;
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  currency: string;
  area: number;
  rooms: number | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrls: string[];
  createdAt: string;
}
