import { notFound } from "next/navigation";

import { ArticleEditorWorkspace } from "../../../../components/articles/article-editor-workspace";
import { fetchServerArticle } from "../../../../lib/server-articles";

type Params = Promise<{
  id: string;
}>;

export default async function DjangoAdminArticlePage({
  params,
}: {
  params: Params;
}) {
  const resolvedParams = await params;
  const articleId = Number(resolvedParams.id);

  if (!Number.isInteger(articleId)) {
    notFound();
  }

  let article;
  try {
    article = await fetchServerArticle(articleId);
  } catch {
    notFound();
  }

  return <ArticleEditorWorkspace article={article} embedded />;
}
