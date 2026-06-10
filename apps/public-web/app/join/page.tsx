import type { Metadata } from "next";

import PublicJoinPage from "../../src/features/public-site/public-join-page";
import { buildAbsoluteSiteUrl } from "../../src/lib/articles-api";

export const metadata: Metadata = {
  title: "阿里云关联注册享折扣 | 云璨信息",
  description:
    "通过云璨完成阿里云关联注册，获取企业专属折扣、注册全程辅助、合规票据与后续跟进服务。提供企业全称即可启动渠道报备。",
  keywords: [
    "阿里云关联注册",
    "阿里云折扣",
    "阿里云合作伙伴",
    "企业上云注册",
    "云璨信息",
  ],
  alternates: {
    canonical: "/join",
  },
  openGraph: {
    type: "website",
    title: "阿里云关联注册享折扣 | 云璨信息",
    description:
      "通过云璨完成阿里云关联注册，获取企业专属折扣、注册全程辅助、合规票据与后续跟进服务。",
    url: buildAbsoluteSiteUrl("/join"),
    siteName: "云璨信息",
  },
  twitter: {
    card: "summary_large_image",
    title: "阿里云关联注册享折扣 | 云璨信息",
    description:
      "通过云璨完成阿里云关联注册，获取企业专属折扣、注册全程辅助、合规票据与后续跟进服务。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function JoinPage() {
  return <PublicJoinPage />;
}
