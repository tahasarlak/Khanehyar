import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSiteOrigin } from "@/src/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const origin = getSiteOrigin();
  if (!origin) return [];

  const listings = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50000,
  });

  return [
    {
      url: `${origin}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/search`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...listings.map((listing) => ({
      url: `${origin}/listings/${encodeURIComponent(listing.id)}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}