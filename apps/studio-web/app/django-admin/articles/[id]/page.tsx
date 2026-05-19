import { notFound } from "next/navigation";

import { ArticleEditorWorkspace } from "../../../../components/articles/article-editor-workspace";
import { DjangoApiError, fetchServerArticle } from "../../../../lib/server-articles";

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
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <ArticleEditorWorkspace article={article} embedded />;
}
