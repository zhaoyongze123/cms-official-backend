import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicArticlePage from "../../../../src/features/public-site/public-article-page";
import { fetchArticlePreviewByToken, resolveArticleSection } from "../../../../src/lib/articles-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "草稿预览 | 云璨科技",
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const article = await fetchArticlePreviewByToken(token);
  if (!article) {
    notFound();
  }

  return (
    <>
      <div className="fixed left-4 top-20 z-[60] rounded-full bg-charcoal px-4 py-2 text-xs font-bold text-white shadow-lg">
        草稿预览 · 仅临时有效
      </div>
      <PublicArticlePage article={article} section={resolveArticleSection(article)} />
    </>
  );
}
