import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";
import type { PublicArticle } from "../../lib/articles-api";

export default function PublicSolutionsPage({
  articles,
  categories,
  selectedCategory,
  searchQuery,
}: {
  articles: PublicArticle[];
  categories: Array<{ label: string; value: string }>;
  selectedCategory?: string;
  searchQuery?: string;
}) {
  return (
    <PublicLayout active="solutions">
      <SolutionsCMS
        mode="list"
        articles={articles}
        categories={categories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
      />
    </PublicLayout>
  );
}
