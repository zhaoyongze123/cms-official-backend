import { buildAnalyticsMetrics, getMockArticleAnalytics, getMockSeoSummary } from "../../../lib/mock-api";

export default function AnalyticsDashboardPage() {
  const summary = getMockSeoSummary();
  const leadArticle = summary.top_articles[0] ? getMockArticleAnalytics(summary.top_articles[0].article_id) : null;
  const metrics = buildAnalyticsMetrics(summary);

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Studio / Analytics</span>
        <h1>A11 监控面板已接入首版 Mock 数据。</h1>
        <p>
          当前页面消费 Django 约定的 `SEO Summary` 与 `Article Analytics` 形状，
          用本地 mock 数据验证 GSC、GA4、站内事件和 AI 采纳率的展示闭环。
        </p>
      </section>

      <section className="grid">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">
              {metric.value}
              {metric.unit ?? ""}
            </strong>
            <p className="metric-note">较上一周期 {metric.trend > 0 ? "+" : ""}{metric.trend}%</p>
          </article>
        ))}
      </section>

      <section className="overview-grid analytics-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>来源健康度</h2>
              <p>当前监控页只展示聚合后的来源状态，不直接暴露外部 Provider 细节。</p>
            </div>
            <span className="caption">`GET /api/dashboard/seo-summary/`</span>
          </div>
          <div className="source-health-list">
            {summary.source_health.map((item) => (
              <article className="source-health-card" key={item.source}>
                <div className="article-card-head">
                  <span className="status-pill status-published">{item.source.toUpperCase()}</span>
                  <span className="caption">{item.latest_snapshot_date ?? "无快照"}</span>
                </div>
                <strong>{item.article_count} 篇文章已追踪</strong>
                <p>累计快照 {item.snapshot_count} 条，最新同步日期 {item.latest_snapshot_date ?? "待接入"}。</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>监控范围</h2>
              <p>首版面板覆盖发布量、搜索曝光、浏览行为和 AI 建议采纳结果。</p>
            </div>
          </div>
          <ul className="helper-list">
            <li>GSC Stub：展示、点击、CTR、平均排名。</li>
            <li>GA4 Stub：浏览量、停留时长、转化。</li>
            <li>站内事件 Stub：内链点击、FAQ 展开、CTA 触发。</li>
            <li>AI 指标：建议采纳率随时间线展示。</li>
          </ul>
        </article>
      </section>

      <section className="panel article-list-panel">
        <div className="panel-heading">
          <div>
            <h2>Top 文章</h2>
            <p>按浏览量、点击和展示组合排序，便于后续接入真实监控排名。</p>
          </div>
          <span className="caption">聚合文章表现</span>
        </div>
        <div className="article-list">
          {summary.top_articles.map((article) => (
            <article className="article-card" key={article.article_id}>
              <div className="article-card-head">
                <span className="status-pill status-published">Top</span>
                <span className="caption">#{article.article_id}</span>
              </div>
              <h3>{article.title}</h3>
              <p>{article.slug}</p>
              <dl className="meta-grid">
                <div>
                  <dt>浏览量</dt>
                  <dd>{article.pageviews}</dd>
                </div>
                <div>
                  <dt>点击</dt>
                  <dd>{article.clicks}</dd>
                </div>
                <div>
                  <dt>展示</dt>
                  <dd>{article.impressions}</dd>
                </div>
                <div>
                  <dt>AI 采纳率</dt>
                  <dd>{Math.round(article.ai_acceptance_rate * 100)}%</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {leadArticle ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>重点文章趋势</h2>
              <p>{leadArticle.article_title} 的最近三天聚合趋势。</p>
            </div>
            <span className="caption">`GET /api/articles/{'{id}'}/analytics/`</span>
          </div>
          <div className="analytics-timeline">
            {leadArticle.timeline.map((point) => (
              <article className="timeline-card" key={point.snapshot_date}>
                <strong>{point.snapshot_date}</strong>
                <dl className="meta-grid">
                  <div>
                    <dt>展示</dt>
                    <dd>{point.impressions}</dd>
                  </div>
                  <div>
                    <dt>点击</dt>
                    <dd>{point.clicks}</dd>
                  </div>
                  <div>
                    <dt>浏览量</dt>
                    <dd>{point.pageviews}</dd>
                  </div>
                  <div>
                    <dt>内链点击</dt>
                    <dd>{point.internal_clicks}</dd>
                  </div>
                  <div>
                    <dt>平均排名</dt>
                    <dd>{point.average_position}</dd>
                  </div>
                  <div>
                    <dt>AI 采纳率</dt>
                    <dd>{Math.round(point.ai_acceptance_rate * 100)}%</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
