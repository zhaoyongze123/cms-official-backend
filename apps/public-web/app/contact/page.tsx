import type { Metadata } from "next";

import PublicContactPage from "../../src/features/public-site/public-contact-page";
import { buildAbsoluteSiteUrl } from "../../src/lib/articles-api";

export const metadata: Metadata = {
  title: "预约产品演示 | 云璨信息",
  description: "预约云璨私有化 AI 网盘产品演示，了解企业文件问答、智能体和 RAG 检索能力。",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: "预约产品演示 | 云璨信息",
    description: "预约云璨私有化 AI 网盘产品演示。",
    url: buildAbsoluteSiteUrl("/contact"),
    siteName: "云璨信息",
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return <PublicContactPage />;
}
