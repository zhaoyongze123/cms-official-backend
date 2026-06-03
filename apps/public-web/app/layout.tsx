import type { Metadata } from "next";
import Script from "next/script";

import "../src/index.css";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  getPublicSiteSettings,
  getSiteSeoContext,
} from "../src/lib/articles-api";

export const dynamic = "force-dynamic";

const siteSeo = getSiteSeoContext();
const SCRIPT_TAG_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const SCRIPT_ATTR_PATTERN = /([^\s=]+)(?:=(["'])(.*?)\2|=([^\s"'>]+))?/g;

interface ThirdPartyScriptEntry {
  src?: string;
  content?: string;
  attributes: Record<string, string | boolean>;
}

function parseScriptAttributes(rawAttributes: string): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {};
  let match: RegExpExecArray | null = null;

  while ((match = SCRIPT_ATTR_PATTERN.exec(rawAttributes)) !== null) {
    const name = match[1]?.trim();
    if (!name) {
      continue;
    }
    const quotedValue = match[3];
    const unquotedValue = match[4];
    attributes[name] = quotedValue ?? unquotedValue ?? true;
  }

  return attributes;
}

function normalizeThirdPartyScripts(rawCode: string): ThirdPartyScriptEntry[] {
  const trimmed = rawCode.trim();
  if (!trimmed) {
    return [];
  }

  const entries: ThirdPartyScriptEntry[] = [];
  let match: RegExpExecArray | null = null;

  while ((match = SCRIPT_TAG_PATTERN.exec(trimmed)) !== null) {
    const attributes = parseScriptAttributes(match[1] || "");
    const src = typeof attributes.src === "string" ? attributes.src : undefined;
    delete attributes.src;
    entries.push({
      src,
      content: (match[2] || "").trim() || undefined,
      attributes,
    });
  }

  if (!entries.length) {
    entries.push({
      content: trimmed,
      attributes: {},
    });
  }

  return entries;
}

function renderThirdPartyScripts(entries: ThirdPartyScriptEntry[], prefix: string) {
  return entries.map((entry, index) => {
    const key = `${prefix}-${index}`;
    return (
      <Script
        key={key}
        id={entry.src ? undefined : key}
        src={entry.src}
        strategy="afterInteractive"
        {...entry.attributes}
        dangerouslySetInnerHTML={
          entry.content
            ? {
                __html: entry.content,
              }
            : undefined
        }
      />
    );
  });
}

export const metadata: Metadata = {
  metadataBase: new URL(siteSeo.baseUrl),
  title: siteSeo.defaultTitle,
  description: siteSeo.defaultDescription,
  keywords: siteSeo.defaultKeywords,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "1254x1254" },
    ],
    shortcut: ["/favicon.ico"],
  },
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
  const headScripts = normalizeThirdPartyScripts(publicSiteSettings.thirdPartyScripts.head);
  const bodyEndScripts = normalizeThirdPartyScripts(publicSiteSettings.thirdPartyScripts.bodyEnd);

  return (
    <html lang="zh-CN">
      <head>
        {renderThirdPartyScripts(headScripts, "third-party-head")}
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebsiteJsonLd()) }} />
        {children}
        {renderThirdPartyScripts(bodyEndScripts, "third-party-body")}
      </body>
    </html>
  );
}
