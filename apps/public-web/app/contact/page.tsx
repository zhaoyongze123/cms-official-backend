import type { Metadata } from "next";

import PublicContactPage from "../../src/features/public-site/public-contact-page";
import { buildAbsoluteSiteUrl } from "../../src/lib/articles-api";

export const metadata: Metadata = {
  title: "申请免费体验 | 云璨信息",
  description: "留下联系方式，云璨信息将在 1 个工作日内与您联系。",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: "申请免费体验 | 云璨信息",
    description: "留下联系方式，云璨信息将在 1 个工作日内与您联系。",
    url: buildAbsoluteSiteUrl("/contact"),
    siteName: "云璨信息",
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return <PublicContactPage />;
}
