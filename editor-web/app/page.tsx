import Link from "next/link";

import { getFoundationStatus } from "../lib/foundation";

export default function HomePage() {
  const status = getFoundationStatus();

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Platform Foundation</span>
        <h1>AI SEO Studio 已完成三端底座接线。</h1>
        <p>
          当前页面只负责证明 Next.js Studio、Django CMS 和 FastAPI AI Service 已经进入同一个运行环境。
          业务功能要在 contracts 冻结后继续分支开发。
        </p>
        <div className="cta-row">
          <Link className="cta primary" href="/studio/articles">
            进入文章工作台
          </Link>
          <a className="cta" href={status.djangoBaseUrl} target="_blank" rel="noreferrer">
            打开 Django 前台
          </a>
          <a className="cta" href={`${status.djangoBaseUrl}/api/health/`} target="_blank" rel="noreferrer">
            查看 Django Health
          </a>
        </div>
      </section>
    </main>
  );
}
