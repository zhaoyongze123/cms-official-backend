export default function SettingsPlaceholderPage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">Studio Settings</span>
        <h1>工作台设置页已切到 Django Session 运行态。</h1>
        <p>
          当前页面保留账号信息、环境配置和调试开关的后续落点。
          登录态已经复用 Django Session，权限与资料面板仍待后续模块接入。
        </p>
      </section>
    </div>
  );
}
