"use client";

import type { PublicArticle, PublicArticleSectionConfig } from "../../lib/articles-api";
import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";

export default function PublicArticleSectionPage({
  articles,
  searchQuery,
  section,
}: {
  articles: PublicArticle[];
  searchQuery?: string;
  section: PublicArticleSectionConfig;
}) {
  return (
    <PublicLayout active={section.key}>
      <SolutionsCMS
        mode="list"
        articles={articles}
        searchQuery={searchQuery}
        section={section}
      />
    </PublicLayout>
  );
}
