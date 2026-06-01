import type { MetadataRoute } from "next";

import { buildAbsoluteSiteUrl, getSiteSeoContext } from "../src/lib/articles-api";

export default function robots(): MetadataRoute.Robots {
  const siteSeo = getSiteSeoContext();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: buildAbsoluteSiteUrl("/sitemap.xml"),
    host: siteSeo.baseUrl,
  };
}
