import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const raw = process.env.SITE_URL?.trim();

  if (!raw) return [];

  let origin: string;

  try {
    const url = new URL(raw);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return [];
    }

    origin = url.origin;
  } catch {
    return [];
  }

  return [
    {
      url: origin,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/search`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}