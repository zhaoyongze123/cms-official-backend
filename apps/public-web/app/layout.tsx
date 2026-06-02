import type { Metadata } from "next";

import "../src/index.css";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  getPublicSiteSettings,
  getSiteSeoContext,
} from "../src/lib/articles-api";

export const dynamic = "force-dynamic";

const siteSeo = getSiteSeoContext();

export const metadata: Metadata = {
  metadataBase: new URL(siteSeo.baseUrl),
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
    siteName: siteSeo.siteName,
    url: siteSeo.baseUrl,
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

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publicSiteSettings = await getPublicSiteSettings();
  const headScripts = publicSiteSettings.thirdPartyScripts.head.trim();
  const bodyEndScripts = publicSiteSettings.thirdPartyScripts.bodyEnd.trim();

  return (
    <html lang="zh-CN">
      <head>
        {headScripts ? (
          <script
            dangerouslySetInnerHTML={{
              __html: headScripts,
            }}
          />
        ) : null}
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebsiteJsonLd()) }} />
        {children}
        {bodyEndScripts ? (
          <script
            dangerouslySetInnerHTML={{
              __html: bodyEndScripts,
            }}
          />
        ) : null}
      </body>
    </html>
  );
}
