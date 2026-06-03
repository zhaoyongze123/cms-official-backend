import type { Metadata } from "next";

import PublicLandingPage from "../src/features/public-site/public-landing-page";
import {
  buildAbsoluteSiteUrl,
  fetchPublishedArticles,
  filterArticlesBySection,
  getPublicSiteSettings,
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
  const publicSiteSettings = await getPublicSiteSettings();
  const servicesArticles = filterArticlesBySection(articles, "services");
  const solutionsArticles = filterArticlesBySection(articles, "solutions");
  const casesArticles = filterArticlesBySection(articles, "cases");
  const featuredArticles = publicSiteSettings.homepageFeaturedArticles.length >= 3
    ? publicSiteSettings.homepageFeaturedArticles
    : [
        servicesArticles[0],
        solutionsArticles[0],
        casesArticles[0],
      ].filter((article): article is NonNullable<typeof article> => Boolean(article));
  const homepageSolutionArticles = publicSiteSettings.homepageSolutionArticles.length >= 4
    ? publicSiteSettings.homepageSolutionArticles
    : [];

  return <PublicLandingPage featuredArticles={featuredArticles} solutionArticles={homepageSolutionArticles} />;
}
