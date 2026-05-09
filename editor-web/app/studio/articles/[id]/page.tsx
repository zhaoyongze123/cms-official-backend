import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleEditor } from "../../../../components/articles/article-editor";
import { getFoundationStatus } from "../../../../lib/foundation";
import type { ArticleRecord } from "../../../../lib/mock-api";

type Params = Promise<{
  id: string;
}>;

export default async function ArticleDetailPage({
  params
}: {
  params: Params;
}) {
  const resolvedParams = await params;
  const articleId = Number(resolvedParams.id);

  if (!Number.isInteger(articleId)) {
    notFound();
  }

  let article: ArticleRecord | null = null;
  try {
    const upstream = new URL(`/api/articles/${articleId}/`, getFoundationStatus().djangoBaseUrl);
    const response = await fetch(upstream, { cache: "no-store" });
    if (response.ok) {
      article = (await response.json()) as ArticleRecord;
    }
  } catch {
    article = null;
  }
  if (!article) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Article Editor</span>
        <h1>{article.title}</h1>
        <p>
          当前页面已经进入 A09/A10 收口阶段。保存行为会调用
          <code> PATCH /api/articles/:id </code>
          ，并继续串联 AI 审核、Patch 接受、SEO 检查与发布流程。
        </p>
        <div className="cta-row">
          <Link className="cta" href="/studio/articles">
            返回列表
          </Link>
          <a className="cta" href={`/api/articles/${article.article_id}`} target="_blank" rel="noreferrer">
            查看文章 JSON
          </a>
        </div>
      </section>

      <ArticleEditor article={article} />
    </div>
  );
}
