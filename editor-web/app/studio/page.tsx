import Link from "next/link";

import { listMockArticles } from "../../lib/mock-api";

export default function StudioPage() {
  const articles = listMockArticles();
  const draftCount = articles.filter((article) => article.status === "draft").length;
  const publishedCount = articles.filter((article) => article.status === "published").length;

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Studio Overview</span>
        <h1>面向运营的 AI SEO 内容工作台。</h1>
        <p>
          当前版本严格按文档使用本地 Mock API：文章编辑、AI 建议、发布检查和监控可以演示完整前端状态流；
          未落地公开 JSON API 的模块只提供清晰入口和边界说明。
        </p>
        <div className="cta-row">
          <Link className="cta primary" href="/studio/articles">
            进入文章列表
          </Link>
          <Link className="cta" href="/studio/articles/new">
            新建文章占位
          </Link>
        </div>
      </section>

      <section className="overview-grid">
        <article className="panel">
          <h2>当前真实能力</h2>
          <ul className="mono-list">
            <li>Mock Session 保护 `/studio/*` 路由</li>
            <li>Next.js 本地 `/api/*` Mock 支撑文章主流程</li>
            <li>TipTap `content_json`、`blockId`、`content_hash` 演示</li>
            <li>AI Diff、发布检查、监控均为前端 Mock 演示</li>
          </ul>
        </article>

        <article className="panel">
          <h2>当前工作量快照</h2>
          <div className="grid">
            <article className="metric">
              <span className="metric-label">文章样本</span>
              <strong className="metric-value">{articles.length}</strong>
            </article>
            <article className="metric">
              <span className="metric-label">待编辑草稿</span>
              <strong className="metric-value">{draftCount}</strong>
            </article>
            <article className="metric">
              <span className="metric-label">已发布样本</span>
              <strong className="metric-value">{publishedCount}</strong>
            </article>
          </div>
        </article>
      </section>
    </div>
  );
}
