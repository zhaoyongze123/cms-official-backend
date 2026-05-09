import { getFoundationStatus } from "../../../lib/foundation";

const services = [
  {
    name: "Django CMS",
    role: "内容、权限、发布真相源",
    port: "8001"
  },
  {
    name: "FastAPI AI Service",
    role: "AI / RAG 服务骨架",
    port: "8002"
  },
  {
    name: "Next.js Studio",
    role: "运营工作台壳应用",
    port: "3000"
  }
];

export default function StudioArticlesPage() {
  const status = getFoundationStatus();

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">A00 / Foundation</span>
        <h1>Studio Shell 已就绪，后续模块按 contracts 并行开发。</h1>
        <p>
          当前页面是平台底座验收页。它只确认路由、环境变量、服务边界和后续开发入口，不提前承载
          AI 审核、Diff 编辑器或发布流程逻辑。
        </p>
      </section>

      <section className="grid">
        {services.map((service) => (
          <article className="metric" key={service.name}>
            <span className="metric-label">{service.name}</span>
            <strong className="metric-value">:{service.port}</strong>
            <p className="metric-note">{service.role}</p>
          </article>
        ))}
      </section>

      <section className="sections">
        <article className="panel">
          <h2>当前底座内容</h2>
          <ul className="mono-list">
            <li>docker compose: web / ai-service / editor-web / worker / db / redis</li>
            <li>Django health endpoint: /api/health/</li>
            <li>FastAPI health endpoint: /health</li>
            <li>基础环境变量：内部 Token、Provider、Next 公共地址</li>
            <li>基础认证约定：django-session</li>
          </ul>
        </article>

        <article className="panel">
          <h2>冻结前不做的事</h2>
          <ul className="mono-list">
            <li>不直接实现业务 API</li>
            <li>不让 Next.js 直连 FastAPI</li>
            <li>不在没有 blockId 的情况下做正文 Patch</li>
            <li>不在 contracts 冻结前并行写 AI Suggestion</li>
          </ul>
          <div className="cta-row">
            <a className="cta primary" href={status.djangoBaseUrl} target="_blank" rel="noreferrer">
              Django Front
            </a>
            <a className="cta" href={status.editorBaseUrl} target="_blank" rel="noreferrer">
              Studio Root
            </a>
            <a className="cta" href="http://127.0.0.1:8002/health" target="_blank" rel="noreferrer">
              FastAPI Health
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
