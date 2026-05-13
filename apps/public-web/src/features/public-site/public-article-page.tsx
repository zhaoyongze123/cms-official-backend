import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";
import type { PublicArticle } from "../../lib/articles-api";

export default function PublicArticlePage({ article }: { article: PublicArticle }) {
  return (
    <PublicLayout active="article">
      <SolutionsCMS mode="detail" article={article} />
    </PublicLayout>
  );
}
