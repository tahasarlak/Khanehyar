import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/src/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteOrigin();

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