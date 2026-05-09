import Link from "next/link";

import { listMockArticles } from "../../lib/mock-api";

export default function StudioPage() {
  const articles = listMockArticles();
  const draftCount = articles.filter((article) => article.status === "draft").length;

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Studio Overview</span>
        <h1>工作台壳层已经具备继续接入业务模块的固定骨架。</h1>
        <p>
          当前导航、登录态和路由边界已经固定。后续分支只需要在既有页面内填充 TipTap、AI Review、
          Publish 和 Analytics 能力，不需要再改工作台基础结构。
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
          <h2>A07 已固定的内容</h2>
          <ul className="mono-list">
            <li>Mock 登录态保护 `/studio/*` 路由</li>
            <li>统一侧边导航与工作台布局</li>
            <li>文章列表、详情编辑、新建占位</li>
            <li>Mock API：`/api/articles` 与 `/api/mock/session`</li>
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
          </div>
        </article>
      </section>
    </div>
  );
}
