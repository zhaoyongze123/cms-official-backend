import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";
import type { PublicArticle, PublicArticleSectionConfig } from "../../lib/articles-api";

export default function PublicArticlePage({
  article,
  section,
}: {
  article: PublicArticle;
  section: PublicArticleSectionConfig;
}) {
  return (
    <PublicLayout active={section.key}>
      <SolutionsCMS mode="detail" article={article} section={section} />
    </PublicLayout>
  );
}
