import type { MetadataRoute } from "next";

import { getSiteSeoContext } from "../src/lib/articles-api";

export default function robots(): MetadataRoute.Robots {
  const siteSeo = getSiteSeoContext();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteSeo.baseUrl}/sitemap.xml`,
    host: siteSeo.baseUrl,
  };
}
