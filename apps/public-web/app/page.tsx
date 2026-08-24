import type { Metadata } from "next";

import PublicLandingPage from "../src/features/public-site/public-landing-page";
import {
  buildAbsoluteSiteUrl,
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
  const publicSiteSettings = await getPublicSiteSettings();
  const homepageSolutionArticles = publicSiteSettings.homepageSolutionArticles.length >= 4
    ? publicSiteSettings.homepageSolutionArticles
    : [];

  return (
    <PublicLandingPage
      solutionArticles={homepageSolutionArticles}
      caseLogoWallImageUrl={publicSiteSettings.homepageCaseLogoWallImageUrl}
      aiDriveDemos={publicSiteSettings.homepageAiDriveDemos}
    />
  );
}
