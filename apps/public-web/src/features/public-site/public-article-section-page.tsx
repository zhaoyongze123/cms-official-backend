"use client";

import type { PublicArticle, PublicArticleSectionConfig } from "../../lib/articles-api";
import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";

export default function PublicArticleSectionPage({
  articles,
  categories,
  selectedCategory,
  searchQuery,
  section,
}: {
  articles: PublicArticle[];
  categories: Array<{ label: string; value: string }>;
  selectedCategory?: string;
  searchQuery?: string;
  section: PublicArticleSectionConfig;
}) {
  return (
    <PublicLayout active={section.key}>
      <SolutionsCMS
        mode="list"
        articles={articles}
        categories={categories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        section={section}
      />
    </PublicLayout>
  );
}
