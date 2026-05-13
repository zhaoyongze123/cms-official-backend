import Link from "next/link";

import { fetchServerDashboardSeoAudit, fetchServerDashboardSeoSummary } from "../../lib/server-analytics";
import { studioProxyPath } from "../../lib/routes";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export async function SeoMonitoringDashboard({ embedded = false }: { embedded?: boolean }) {
  const [summary, auditSummary] = await Promise.all([
    fetchServerDashboardSeoSummary(),
    fetchServerDashboardSeoAudit(),
  ]);

  const diagnosisRows = auditSummary.rows.map((row) => ({
    article: row.article,
    analytics: row.analytics,
    audit: row.audit,
    score: row.audit.score,
    traffic: row.analytics?.latest_snapshot?.sessions ?? 0,
    indexedLabel: row.article.status === "published" && row.analytics?.latest_snapshot ? "是" : "否",
    primaryIssue: row.audit.primary_issue,
  }));

  const sortedRows = [...diagnosisRows].sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return b.audit.issues.length - a.audit.issues.length;
  });

  const averageScore = diagnosisRows.length
    ? Math.round(diagnosisRows.reduce((sum, row) => sum + row.score, 0) / diagnosisRows.length)
    : 0;
  const totalIssues = diagnosisRows.reduce((sum, row) => sum + row.audit.issues.length, 0);
  const positionTop10 = diagnosisRows.filter((row) => row.analytics?.latest_snapshot && row.analytics.latest_snapshot.average_position <= 10).length;
  const selectedRow = sortedRows[0] ?? null;
  const latestTrend = diagnosisRows
    .map((row) => row.analytics)
    .flatMap((item) => item?.snapshots ?? [])
    .reduce<Record<string, number>>((acc, snapshot) => {
      const key = snapshot.snapshot_date.slice(0, 10);
      acc[key] = (acc[key] ?? 0) + snapshot.sessions;
      return acc;
    }, {});
  const trendSeries = Object.entries(latestTrend)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);
  const maxTrendValue = Math.max(...trendSeries.map(([, value]) => value), 1);
  const hasRealAnalytics = summary.totals.articles_with_analytics > 0;

  return (
    <div className={`seo-monitor-page${embedded ? " is-embedded" : ""}`}>
      <section className="seo-monitor-hero">
        <div>
          <span className="eyebrow">CMS SEO Monitor</span>
          <h1>SEO 监控中心</h1>
          <p>仅显示真实接口返回的数据；未接入 Google / 性能监控源时，不再回退展示 mock 快照。</p>
        </div>
        <div className="seo-monitor-toolbar">
          <button className="seo-filter-chip" type="button">默认站点</button>
          <button className="seo-filter-chip" type="button">最近快照</button>
          <a className="seo-filter-chip is-primary" href={studioProxyPath("/api/dashboard/seo-summary/")} target="_blank" rel="noreferrer">
            导出 JSON
          </a>
        </div>
      </section>

      {!hasRealAnalytics ? (
        <section className="seo-panel-card">
          <div className="seo-empty-inline">
            当前未接入真实监控数据源。页面不再使用本地 seed / mock 快照填充，请先接入 GSC、GA4、CrUX / PageSpeed 后再查看监控指标。
          </div>
        </section>
      ) : null}

      <section className="seo-metric-grid">
        <article className="seo-metric-card"><span>SEO 健康分</span><strong>{averageScore} / 100</strong><small>基于标题、摘要、Canonical、H1、正文和监控快照推导</small></article>
        <article className="seo-metric-card"><span>收录页面数</span><strong>{formatNumber(summary.totals.articles_with_analytics)}</strong><small>仅统计存在真实监控快照的页面</small></article>
        <article className="seo-metric-card"><span>自然流量</span><strong>{formatNumber(summary.performance.tracked_sessions)}</strong><small>仅统计真实快照聚合会话数</small></article>
        <article className="seo-metric-card"><span>关键词排名</span><strong>Top10: {formatNumber(positionTop10)}</strong><small>按真实快照平均排名统计</small></article>
        <article className="seo-metric-card"><span>问题数</span><strong>{formatNumber(totalIssues)}</strong><small>基于真实文章字段和真实监控快照推导</small></article>
      </section>

      <section className="seo-monitor-trend-grid">
        <article className="seo-panel-card">
          <div className="seo-panel-head">
            <div>
              <h2>自然搜索流量趋势</h2>
              <p>聚合所有已接入文章快照中的会话数。</p>
            </div>
          </div>
          <div className="seo-trend-chart">
            {trendSeries.length === 0 ? (
              <div className="seo-empty-inline">暂无趋势快照</div>
            ) : (
              trendSeries.map(([date, value]) => (
                <div className="seo-trend-bar" key={date}>
                  <span className="seo-trend-label">{date.slice(5)}</span>
                  <div className="seo-trend-bar-track">
                    <i style={{ height: `${Math.max(12, Math.round((value / maxTrendValue) * 100))}%` }} />
                  </div>
                  <strong>{formatNumber(value)}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="seo-panel-card">
          <div className="seo-panel-head">
            <div>
              <h2>关键词排名分布</h2>
              <p>按每篇文章最新快照的平均排名分桶。</p>
            </div>
          </div>
          <div className="seo-rank-stack">
            <div><span>Top 10</span><strong>{positionTop10}</strong></div>
            <div><span>已接入快照</span><strong>{summary.totals.articles_with_analytics}</strong></div>
            <div><span>平均排名</span><strong>{summary.performance.average_position.toFixed(2)}</strong></div>
            <div><span>平均 CTR</span><strong>{(summary.performance.average_ctr * 100).toFixed(1)}%</strong></div>
          </div>
        </article>
      </section>

      <section className="seo-panel-card">
        <div className="seo-panel-head">
          <div>
            <h2>SEO 异常告警</h2>
            <p>由 Django 后端审计接口统一生成，不再由前端本地推导。</p>
          </div>
        </div>
        <div className="seo-alert-list">
          {auditSummary.alerts.map((alert) => (
            <div className="seo-alert-item" key={alert.code}>
              <span className={`seo-alert-badge severity-${alert.severity}`}>{alert.severity}</span>
              <div className="seo-alert-copy">
                <strong>{alert.title}：{alert.count} 个页面</strong>
                <small>来源于 `/api/dashboard/seo-audit/` 后端审计结果。</small>
              </div>
              <div className="seo-alert-actions">
                <button className="seo-inline-button" type="button">查看</button>
                <button className="seo-inline-button" type="button">{alert.action}</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="seo-diagnosis-layout">
        <article className="seo-panel-card">
          <div className="seo-panel-head">
            <div>
              <h2>页面级 SEO 诊断</h2>
              <p>当前按文章列表全量展示，可直接跳到真实文章编辑页。</p>
            </div>
          </div>

          <div className="seo-diagnosis-toolbar">
            <span className="seo-filter-chip">全部页面</span>
            <span className="seo-filter-chip">全部状态</span>
            <span className="seo-filter-chip">真实数据模式</span>
            <span className="seo-diagnosis-count">{sortedRows.length} 个页面</span>
          </div>

          <div className="seo-table-wrap">
            <table className="seo-table">
              <thead>
                <tr>
                  <th>分数</th>
                  <th>页面 URL</th>
                  <th>收录</th>
                  <th>流量</th>
                  <th>问题数</th>
                  <th>主要问题</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.article.article_id}>
                    <td><span className={`seo-score-pill score-${row.score >= 85 ? "good" : row.score >= 65 ? "mid" : "bad"}`}>{row.score}</span></td>
                    <td>
                      <div className="seo-url-cell">
                        <strong>/articles/{row.article.slug}</strong>
                        <Link href={`/studio/articles/${row.article.article_id}`}>打开文章</Link>
                      </div>
                    </td>
                    <td>{row.indexedLabel}</td>
                    <td>{formatNumber(row.traffic)}</td>
                    <td>{row.audit.issues.length}</td>
                    <td>{row.primaryIssue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="seo-panel-card seo-detail-card">
          <div className="seo-panel-head">
            <div>
              <h2>页面详情</h2>
              <p>默认展示当前风险最高的页面。</p>
            </div>
          </div>
          {selectedRow ? (
            <div className="seo-detail-body">
              <div className="seo-detail-head">
                <strong>/articles/{selectedRow.article.slug}</strong>
                <span className={`seo-score-pill score-${selectedRow.score >= 85 ? "good" : selectedRow.score >= 65 ? "mid" : "bad"}`}>SEO 分数 {selectedRow.score}</span>
              </div>
              <div className="seo-detail-grid">
                <div><span>Title</span><strong>{selectedRow.article.title || "缺失"}</strong></div>
                <div><span>Meta</span><strong>{selectedRow.audit.issues.some((issue) => issue.code === "meta_missing") ? "缺失" : "已配置"}</strong></div>
                <div><span>H1</span><strong>{selectedRow.audit.issues.some((issue) => issue.code === "h1_invalid") ? "结构异常" : "结构正常"}</strong></div>
                <div><span>Canonical</span><strong>{selectedRow.audit.issues.some((issue) => issue.code === "canonical_missing") ? "缺失" : "已配置"}</strong></div>
                <div><span>Index</span><strong>{selectedRow.article.status === "published" ? "可索引" : "未发布"}</strong></div>
                <div><span>监控</span><strong>{selectedRow.analytics?.latest_snapshot ? "已接入" : "未接入"}</strong></div>
              </div>
              <div className="seo-detail-section">
                <h3>修复建议</h3>
                <ol>
                  {selectedRow.audit.recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              <div className="seo-detail-actions">
                <Link className="seo-inline-button is-primary" href={`/studio/articles/${selectedRow.article.article_id}`}>打开编辑器</Link>
                <a className="seo-inline-button" href={studioProxyPath(`/api/articles/${selectedRow.article.article_id}/analytics/`)} target="_blank" rel="noreferrer">查看快照 JSON</a>
                <button className="seo-inline-button" type="button">标记已处理</button>
              </div>
            </div>
          ) : (
            <div className="seo-empty-inline">暂无可诊断页面</div>
          )}
        </aside>
      </section>
    </div>
  );
}
