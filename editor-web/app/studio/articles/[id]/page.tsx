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
          当前页面使用 Next.js 本地 Mock API 演示编辑、AI 建议、发布前检查和发布动作。
          Django 公开业务 API 未落地前，这里不直连 FastAPI，也不把 Mock 结果当成真实联调完成。
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
