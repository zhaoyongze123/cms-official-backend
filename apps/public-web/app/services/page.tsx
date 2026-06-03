import type { Metadata } from "next";

import PublicArticleSectionPage from "../../src/features/public-site/public-article-section-page";
import {
  buildAbsoluteSiteUrl,
  fetchPublishedArticles,
  filterArticlesBySection,
  getPublicArticleSectionConfig,
} from "../../src/lib/articles-api";

export const dynamic = "force-dynamic";

const section = getPublicArticleSectionConfig("services");

export const metadata: Metadata = {
  title: "上云服务 - 公有云迁移·私有化实施·AI开发 | 云璨信息",
  description: "云璨信息提供企业上云全流程服务：公有云资源采购与迁移、私有化本地部署实施、AI应用定制开发，涵盖AI助手、智能问答、知识库等场景。阿里云授权合作伙伴，从需求评估到上线交付提供全程技术支持。",
  keywords: [
    "企业上云服务",
    "公有云迁移",
    "私有化实施",
    "AI应用开发",
    "AI助手定制",
    "阿里云代理商",
    "混合云部署",
    "上海云服务商",
  ],
  alternates: {
    canonical: section.route,
  },
  openGraph: {
    type: "website",
    title: "上云服务 - 公有云迁移·私有化实施·AI开发 | 云璨信息",
    description: "云璨信息提供企业上云全流程服务：公有云资源采购与迁移、私有化本地部署实施、AI应用定制开发，涵盖AI助手、智能问答、知识库等场景。阿里云授权合作伙伴，从需求评估到上线交付提供全程技术支持。",
    url: buildAbsoluteSiteUrl(section.route),
    siteName: "云璨信息",
  },
  twitter: {
    card: "summary_large_image",
    title: "上云服务 - 公有云迁移·私有化实施·AI开发 | 云璨信息",
    description: "云璨信息提供企业上云全流程服务：公有云资源采购与迁移、私有化本地部署实施、AI应用定制开发，涵盖AI助手、智能问答、知识库等场景。阿里云授权合作伙伴，从需求评估到上线交付提供全程技术支持。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const articles = await fetchPublishedArticles();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase();
  const sectionArticles = filterArticlesBySection(articles, "services");
  const filteredArticles = sectionArticles.filter((article) => {
    const haystack = [article.title, article.excerpt, article.category, article.contentText, ...article.tags].join(" ").toLowerCase();
    const matchesQuery = searchQuery ? haystack.includes(searchQuery) : true;
    return matchesQuery;
  });

  return (
    <PublicArticleSectionPage
      articles={filteredArticles}
      searchQuery={resolvedSearchParams.q || ""}
      section={section}
    />
  );
}
