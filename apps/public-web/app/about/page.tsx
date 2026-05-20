import type { Metadata } from "next";

import PublicAboutPage from "../../src/features/public-site/public-about-page";
import { getSiteSeoContext } from "../../src/lib/articles-api";

const siteSeo = getSiteSeoContext();

export const metadata: Metadata = {
  title: "关于我们 | 云璨科技",
  description: "了解上海云璨信息技术有限公司的企业背景、服务方向与技术能力。",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "website",
    title: "关于我们 | 云璨科技",
    description: "了解上海云璨信息技术有限公司的企业背景、服务方向与技术能力。",
    url: `${siteSeo.baseUrl}/about`,
    siteName: siteSeo.siteName,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  return <PublicAboutPage />;
}
