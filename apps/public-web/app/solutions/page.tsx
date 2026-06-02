import type { Metadata } from "next";

import PublicArticleSectionPage from "../../src/features/public-site/public-article-section-page";
import {
  buildAbsoluteSiteUrl,
  fetchPublishedArticles,
  filterArticlesBySection,
  getPublicArticleSectionConfig,
} from "../../src/lib/articles-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "解决方案 - 公有云·私有化部署·AI应用 | 云璨信息",
  description: "云璨信息解决方案中心，提供公有云资源、私有化本地部署及AI应用定制开发方案，涵盖企业网盘、邮件系统、AI助手、智能问答、知识库等场景，支持云上与本地灵活选择。含真实行业落地案例与完整技术文档，欢迎查看或咨询。",
  keywords: [
    "企业云解决方案",
    "私有化部署方案",
    "AI助手定制",
    "AI知识库搭建",
    "智能问答系统",
    "企业网盘部署",
    "邮件系统解决方案",
    "邮件归档解决方案",
    "邮件安全网关解决方案",
    "公有云方案",
    "本地化部署",
  ],
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    type: "website",
    title: "解决方案 - 公有云·私有化部署·AI应用 | 云璨信息",
    description: "云璨信息解决方案中心，提供公有云资源、私有化本地部署及AI应用定制开发方案，涵盖企业网盘、邮件系统、AI助手、智能问答、知识库等场景，支持云上与本地灵活选择。含真实行业落地案例与完整技术文档，欢迎查看或咨询。",
    url: buildAbsoluteSiteUrl("/solutions"),
    siteName: "云璨信息",
  },
  twitter: {
    card: "summary_large_image",
    title: "解决方案 - 公有云·私有化部署·AI应用 | 云璨信息",
    description: "云璨信息解决方案中心，提供公有云资源、私有化本地部署及AI应用定制开发方案，涵盖企业网盘、邮件系统、AI助手、智能问答、知识库等场景，支持云上与本地灵活选择。含真实行业落地案例与完整技术文档，欢迎查看或咨询。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string }>;
}) {
  const articles = await fetchPublishedArticles();
  const section = getPublicArticleSectionConfig("solutions");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedCategory = (resolvedSearchParams.category || "").trim();
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase();
  const sectionArticles = filterArticlesBySection(articles, "solutions");
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
    const haystack = [
      article.title,
      article.excerpt,
      article.category,
      article.contentText,
      ...article.tags,
    ]
      .join(" ")
      .toLowerCase();
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
