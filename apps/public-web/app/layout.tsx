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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?89f24b4516d0d355ef517486ac72aa96";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`,
          }}
        />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebsiteJsonLd()) }} />
        {children}
      </body>
    </html>
  );
}
