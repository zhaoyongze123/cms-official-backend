import type { MetadataRoute } from "next";

import { buildAbsoluteSiteUrl, fetchPublishedArticles } from "../src/lib/articles-api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await fetchPublishedArticles();
  const staticRoutes = [
    "/",
    "/services",
    "/solutions",
    "/cases",
    "/products",
    "/about",
    "/legal/service-agreement",
    "/legal/privacy-policy",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: buildAbsoluteSiteUrl(route),
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: article.seo.canonicalUrl,
  }));

  return [...staticEntries, ...articleEntries];
}
