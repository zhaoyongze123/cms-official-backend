import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleEditor } from "../../../../components/articles/article-editor";
import { getMockArticleById } from "../../../../lib/mock-api";

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

  const article = getMockArticleById(articleId);
  if (!article) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Article Editor</span>
        <h1>{article.title}</h1>
        <p>
          这是 A07 的基础编辑页。当前保存行为会调用
          <code> PATCH /api/articles/:id </code>
          ，
          同时把草稿缓存到浏览器本地，为 A08 的 `content_json` 持久化流程预留入口。
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
