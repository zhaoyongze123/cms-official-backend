import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";
import type { PublicArticle, PublicArticleSectionConfig } from "../../lib/articles-api";

export default function PublicSolutionsPage({
  articles,
  searchQuery,
  section,
}: {
  articles: PublicArticle[];
  searchQuery?: string;
  section: PublicArticleSectionConfig;
}) {
  return (
    <PublicLayout active="solutions">
      <SolutionsCMS
        mode="list"
        articles={articles}
        searchQuery={searchQuery}
        section={section}
      />
    </PublicLayout>
  );
}
