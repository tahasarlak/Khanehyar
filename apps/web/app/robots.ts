import type { MetadataRoute } from "next";

function publicSiteUrl(): string | null {
  const raw = process.env.SITE_URL?.trim();

  if (!raw) return null;

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
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();

  if (!site) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/dashboard/",
        "/favorites",
        "/my/",
        "/login",
        "/register",
        "/listings/new",
      ],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}