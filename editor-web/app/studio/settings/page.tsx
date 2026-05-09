export default function SettingsPlaceholderPage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Settings Placeholder</span>
        <h1>设置入口只保留账号与系统配置壳层。</h1>
        <p>
          当前分支只提供 Mock 登录态，不接真实权限、账号资料或 SiteSetting 公开 API。
          敏感配置不得暴露到前端。
        </p>
      </section>
      <section className="overview-grid">
        <article className="panel">
          <h2>当前可展示</h2>
          <ul className="mono-list">
            <li>Mock 登录身份</li>
            <li>前端 Mock API 模式说明</li>
            <li>后续 Django Session 接入位置</li>
          </ul>
        </article>
        <article className="panel">
          <h2>当前缺失</h2>
          <ul className="mono-list">
            <li>当前用户资料 API</li>
            <li>SiteSetting 读取/保存 API</li>
            <li>真实权限策略 API</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
