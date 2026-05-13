import Link from "next/link";

import { studioProxyPath } from "../../../lib/routes";
import { fetchServerArticles } from "../../../lib/server-articles";

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
  const {
    items: articles,
    totals: { totalCount, draftCount, publishedCount },
  } = await fetchServerArticles(query, status);

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">CMS / Articles</span>
        <h1>文章列表与编辑入口已切换到 Django 真文章 API 主链路。</h1>
        <p>
          当前列表数据直接来自 Django `GET /api/articles/`。
          `cms-editor-web` 现在只保留文章列表与正文编辑，不再展示工作台侧边栏。
        </p>
        <div className="toolbar">
          <form className="search-form" action={studioProxyPath("/studio/articles")}>
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
            新建文章
          </Link>
        </div>
      </section>

      <section className="grid">
        <article className="metric">
          <span className="metric-label">文章总数</span>
          <strong className="metric-value">{totalCount}</strong>
          <p className="metric-note">Django `GET /api/articles/`</p>
        </article>
        <article className="metric">
          <span className="metric-label">草稿文章</span>
          <strong className="metric-value">{draftCount}</strong>
          <p className="metric-note">待进入 TipTap 编辑与 AI 审核</p>
        </article>
        <article className="metric">
          <span className="metric-label">已发布文章</span>
          <strong className="metric-value">{publishedCount}</strong>
          <p className="metric-note">SEO 监控入口已迁回 Django 管理后台</p>
        </article>
      </section>

      <section className="panel article-list-panel">
        <div className="panel-heading">
          <div>
            <h2>文章列表</h2>
            <p>点击任意文章进入编辑页。保存行为会调用 Django `PATCH /api/articles/:id/`，当前编辑器登录态直接复用 Django Session。</p>
          </div>
          <span className="caption">`GET /api/articles/`</span>
        </div>

        <div className="article-list">
          {articles.length === 0 ? (
            <div className="empty-state">
              <h3>没有符合条件的文章</h3>
              <p>调整筛选条件，或者创建一篇文章继续验证 Studio 流程。</p>
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
                  <a
                    className="cta"
                    href={studioProxyPath(`/api/articles/${article.article_id}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看 Django JSON
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
