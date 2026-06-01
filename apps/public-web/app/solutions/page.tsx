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
  title: "解决方案 | 云璨科技",
  description: "查看云璨科技公开发布的解决方案、架构实践与行业案例。",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    type: "website",
    title: "解决方案 | 云璨科技",
    description: "查看云璨科技公开发布的解决方案、架构实践与行业案例。",
    url: buildAbsoluteSiteUrl("/solutions"),
    siteName: "云璨科技",
  },
  twitter: {
    card: "summary_large_image",
    title: "解决方案 | 云璨科技",
    description: "查看云璨科技公开发布的解决方案、架构实践与行业案例。",
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
