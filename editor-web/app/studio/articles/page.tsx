import Link from "next/link";
import { listMockArticles } from "../../../lib/mock-api";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

export default async function StudioArticlesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q ?? "";
  const status = resolvedSearchParams.status ?? "all";
  const articles = listMockArticles({
    query,
    status
  });
  const totalCount = listMockArticles().length;
  const draftCount = listMockArticles({ status: "draft" }).length;
  const publishedCount = listMockArticles({ status: "published" }).length;

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Studio / Articles</span>
        <h1>文章列表与编辑入口已切换到 A07 Mock 工作流。</h1>
        <p>
          当前列表数据来自 Next.js 内部 Mock API，字段遵循 `Article v1` 契约，
          以便后续 A08 TipTap、A09 Diff 和 A11 Analytics 在同一路由骨架上继续接入。
        </p>
        <div className="toolbar">
          <form className="search-form" action="/studio/articles">
            <input defaultValue={query} name="q" placeholder="搜索标题、slug 或摘要" />
            <select defaultValue={status} name="status">
              <option value="all">全部状态</option>
              <option value="draft">仅草稿</option>
              <option value="published">仅已发布</option>
              <option value="archived">仅已归档</option>
            </select>
            <button className="cta" type="submit">
              筛选
            </button>
          </form>
          <Link className="cta primary" href="/studio/articles/new">
            新建 Mock 文章
          </Link>
        </div>
      </section>

      <section className="grid">
        <article className="metric">
          <span className="metric-label">文章总数</span>
          <strong className="metric-value">{totalCount}</strong>
          <p className="metric-note">Mock API `GET /api/articles/`</p>
        </article>
        <article className="metric">
          <span className="metric-label">草稿文章</span>
          <strong className="metric-value">{draftCount}</strong>
          <p className="metric-note">待进入 TipTap 编辑与 AI 审核</p>
        </article>
        <article className="metric">
          <span className="metric-label">已发布文章</span>
          <strong className="metric-value">{publishedCount}</strong>
          <p className="metric-note">为监控面板和 SEO 检查预留数据源</p>
        </article>
      </section>

      <section className="panel article-list-panel">
        <div className="panel-heading">
          <div>
            <h2>文章列表</h2>
            <p>点击任意文章进入基础编辑页。当前保存会写入本地浏览器草稿，并通过 Mock API 返回契约响应。</p>
          </div>
          <span className="caption">`GET /api/articles/`</span>
        </div>

        <div className="article-list">
          {articles.length === 0 ? (
            <div className="empty-state">
              <h3>没有符合条件的文章</h3>
              <p>调整筛选条件，或者创建一篇新的 Mock 文章继续验证 Studio 流程。</p>
            </div>
          ) : (
            articles.map((article) => (
              <article className="article-card" key={article.article_id}>
                <div className="article-card-head">
                  <span className={`status-pill status-${article.status}`}>{article.status}</span>
                  <span className="caption">#{article.article_id}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <dl className="meta-grid">
                  <div>
                    <dt>Slug</dt>
                    <dd>{article.slug}</dd>
                  </div>
                  <div>
                    <dt>更新时间</dt>
                    <dd>{new Date(article.updated_at).toLocaleString("zh-CN")}</dd>
                  </div>
                </dl>
                <div className="cta-row">
                  <Link className="cta primary" href={`/studio/articles/${article.article_id}`}>
                    打开编辑页
                  </Link>
                  <a className="cta" href={`/api/articles/${article.article_id}`} target="_blank" rel="noreferrer">
                    查看 Mock JSON
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
