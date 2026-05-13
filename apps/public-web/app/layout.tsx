import type { Metadata } from "next";

import "../src/index.css";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, getSiteSeoContext } from "../src/lib/articles-api";

const siteSeo = getSiteSeoContext();

export const metadata: Metadata = {
  metadataBase: new URL(siteSeo.baseUrl),
  title: siteSeo.defaultTitle,
  description: siteSeo.defaultDescription,
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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebsiteJsonLd()) }} />
        {children}
      </body>
    </html>
  );
}
