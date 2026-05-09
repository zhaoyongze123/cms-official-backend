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
          当前页面已经进入 A08。保存行为会调用
          <code> PATCH /api/articles/:id </code>
          ，同步生成 TipTap `content_json`、补齐 `blockId`，并缓存可渲染的 `content_html`。
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
