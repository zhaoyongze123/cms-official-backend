import type { Metadata } from "next";

import PublicArticleSectionPage from "../../src/features/public-site/public-article-section-page";
import {
  buildAbsoluteSiteUrl,
  fetchPublishedArticles,
  filterArticlesBySection,
  getPublicArticleSectionConfig,
} from "../../src/lib/articles-api";

export const dynamic = "force-dynamic";

const section = getPublicArticleSectionConfig("cases");

export const metadata: Metadata = {
  title: "客户案例 - 真实行业云服务落地实践 | 云璨信息",
  description: "查看云璨信息真实客户案例，涵盖AI助手、智能问答、企业知识库、私有网盘、邮件系统等项目完整实施记录，已服务制造、工程、法律等行业企业。每个案例包含痛点分析、解决方案与上线效果，可作为同类项目参考。",
  keywords: [
    "企业云服务案例",
    "AI知识库案例",
    "私有化部署案例",
    "企业网盘案例",
    "云服务落地",
    "行业解决方案案例",
  ],
  alternates: {
    canonical: section.route,
  },
  openGraph: {
    type: "website",
    title: "客户案例 - 真实行业云服务落地实践 | 云璨信息",
    description: "查看云璨信息真实客户案例，涵盖AI助手、智能问答、企业知识库、私有网盘、邮件系统等项目完整实施记录，已服务制造、工程、法律等行业企业。每个案例包含痛点分析、解决方案与上线效果，可作为同类项目参考。",
    url: buildAbsoluteSiteUrl(section.route),
    siteName: "云璨信息",
  },
  twitter: {
    card: "summary_large_image",
    title: "客户案例 - 真实行业云服务落地实践 | 云璨信息",
    description: "查看云璨信息真实客户案例，涵盖AI助手、智能问答、企业知识库、私有网盘、邮件系统等项目完整实施记录，已服务制造、工程、法律等行业企业。每个案例包含痛点分析、解决方案与上线效果，可作为同类项目参考。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function CasesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const articles = await fetchPublishedArticles();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase();
  const sectionArticles = filterArticlesBySection(articles, "cases");
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
