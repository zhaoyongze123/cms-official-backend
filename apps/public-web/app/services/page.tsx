import type { Metadata } from "next";

import PublicArticleSectionPage from "../../src/features/public-site/public-article-section-page";
import {
  fetchPublishedArticles,
  filterArticlesBySection,
  getPublicArticleSectionConfig,
  getSiteSeoContext,
} from "../../src/lib/articles-api";

export const dynamic = "force-dynamic";

const siteSeo = getSiteSeoContext();
const section = getPublicArticleSectionConfig("services");

export const metadata: Metadata = {
  title: `${section.title} | 云璨科技`,
  description: section.description,
  alternates: {
    canonical: section.route,
  },
  openGraph: {
    type: "website",
    title: `${section.title} | 云璨科技`,
    description: section.description,
    url: `${siteSeo.baseUrl}${section.route}`,
    siteName: siteSeo.siteName,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string }>;
}) {
  const articles = await fetchPublishedArticles();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedCategory = (resolvedSearchParams.category || "").trim();
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase();
  const sectionArticles = filterArticlesBySection(articles, "services");
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
