import type { Metadata } from "next";

import PublicAboutPage from "../../src/features/public-site/public-about-page";
import { buildAbsoluteSiteUrl } from "../../src/lib/articles-api";

export const metadata: Metadata = {
  title: "关于云璨信息 - 上海阿里云授权合作伙伴 | 云璨信息",
  description: "云璨信息是上海专业云服务商，阿里云授权合作伙伴，专注企业公有云、私有化部署及AI应用解决方案，涵盖AI助手、智能问答、知识库等定制开发，服务制造、工程、法律等行业。从选型咨询到开发交付全程支持。",
  keywords: [
    "上海云服务商",
    "阿里云合作伙伴",
    "AI应用定制",
    "私有化部署服务商",
    "企业云服务",
  ],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "website",
    title: "关于云璨信息 - 上海阿里云授权合作伙伴 | 云璨信息",
    description: "云璨信息是上海专业云服务商，阿里云授权合作伙伴，专注企业公有云、私有化部署及AI应用解决方案，涵盖AI助手、智能问答、知识库等定制开发，服务制造、工程、法律等行业。从选型咨询到开发交付全程支持。",
    url: buildAbsoluteSiteUrl("/about"),
    siteName: "云璨信息",
  },
  twitter: {
    card: "summary_large_image",
    title: "关于云璨信息 - 上海阿里云授权合作伙伴 | 云璨信息",
    description: "云璨信息是上海专业云服务商，阿里云授权合作伙伴，专注企业公有云、私有化部署及AI应用解决方案，涵盖AI助手、智能问答、知识库等定制开发，服务制造、工程、法律等行业。从选型咨询到开发交付全程支持。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  return <PublicAboutPage />;
}
