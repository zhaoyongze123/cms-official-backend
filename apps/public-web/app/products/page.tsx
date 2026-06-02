import type { Metadata } from "next";

import PublicArticleSectionPage from "../../src/features/public-site/public-article-section-page";
import {
  buildAbsoluteSiteUrl,
  fetchPublishedArticles,
  filterArticlesBySection,
  getPublicArticleSectionConfig,
} from "../../src/lib/articles-api";

export const dynamic = "force-dynamic";

const section = getPublicArticleSectionConfig("products");

export const metadata: Metadata = {
  title: "产品中心 - 企业云产品与AI应用解决方案 | 云璨信息",
  description: "云璨信息代理及合作产品涵盖企业邮件、邮件归档、私有网盘、AI应用开发等方向，提供公有云与私有化本地部署两种交付模式。所有产品均提供中文技术支持与本地化实施服务，可根据企业实际需求灵活组合方案。",
  keywords: [
    "企业云产品",
    "AI应用开发",
    "企业邮件系统",
    "邮件归档",
    "私有网盘",
    "私有化部署产品",
    "公有云产品",
    "上海云服务商",
  ],
  alternates: {
    canonical: section.route,
  },
  openGraph: {
    type: "website",
    title: "产品中心 - 企业云产品与AI应用解决方案 | 云璨信息",
    description: "云璨信息代理及合作产品涵盖企业邮件、邮件归档、私有网盘、AI应用开发等方向，提供公有云与私有化本地部署两种交付模式。所有产品均提供中文技术支持与本地化实施服务，可根据企业实际需求灵活组合方案。",
    url: buildAbsoluteSiteUrl(section.route),
    siteName: "云璨信息",
  },
  twitter: {
    card: "summary_large_image",
    title: "产品中心 - 企业云产品与AI应用解决方案 | 云璨信息",
    description: "云璨信息代理及合作产品涵盖企业邮件、邮件归档、私有网盘、AI应用开发等方向，提供公有云与私有化本地部署两种交付模式。所有产品均提供中文技术支持与本地化实施服务，可根据企业实际需求灵活组合方案。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string }>;
}) {
  const articles = await fetchPublishedArticles();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedCategory = (resolvedSearchParams.category || "").trim();
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase();
  const sectionArticles = filterArticlesBySection(articles, "products");
  const categories = [
    { label: "全部", value: "" },
    ...Array.from(
      new Map(
        sectionArticles
          .filter((article) => article.categorySlug)
          .map((article) => [article.categorySlug, { label: article.category, value: article.categorySlug }]),
      ).values(),
    ),
  ];
  const filteredArticles = sectionArticles.filter((article) => {
    const matchesCategory = selectedCategory ? article.categorySlug === selectedCategory : true;
    const haystack = [article.title, article.excerpt, article.category, article.contentText, ...article.tags].join(" ").toLowerCase();
    const matchesQuery = searchQuery ? haystack.includes(searchQuery) : true;
    return matchesCategory && matchesQuery;
  });

  return (
    <PublicArticleSectionPage
      articles={filteredArticles}
      categories={categories}
      selectedCategory={selectedCategory}
      searchQuery={resolvedSearchParams.q || ""}
      section={section}
    />
  );
}
