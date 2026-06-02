import type { Metadata } from "next";

import PublicLandingPage from "../src/features/public-site/public-landing-page";
import {
  buildAbsoluteSiteUrl,
  fetchPublishedArticles,
  filterArticlesBySection,
  getSiteSeoContext,
} from "../src/lib/articles-api";

const siteSeo = getSiteSeoContext();

export const metadata: Metadata = {
  title: siteSeo.defaultTitle,
  description: siteSeo.defaultDescription,
  keywords: siteSeo.defaultKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
    url: buildAbsoluteSiteUrl("/"),
    siteName: siteSeo.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  const articles = await fetchPublishedArticles();
  const servicesArticles = filterArticlesBySection(articles, "services");
  const solutionsArticles = filterArticlesBySection(articles, "solutions");
  const casesArticles = filterArticlesBySection(articles, "cases");

  const articleLinks = {
    services: servicesArticles[0] ? `/articles/${servicesArticles[0].slug}?from=services` : "/services",
    solutions: solutionsArticles[0] ? `/articles/${solutionsArticles[0].slug}?from=solutions` : "/solutions",
    cases: casesArticles[0] ? `/articles/${casesArticles[0].slug}?from=cases` : "/cases",
  };

  return <PublicLandingPage articleLinks={articleLinks} />;
}
