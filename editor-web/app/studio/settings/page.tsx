export default function SettingsPlaceholderPage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Settings Placeholder</span>
        <h1>工作台设置入口已预留。</h1>
        <p>
          当前分支只提供 Mock 登录态，不接真实权限与账号资料。后续接 Django Session 时，
          可在这里放入账号信息、环境配置和调试开关。
        </p>
      </section>
    </div>
  );
}
