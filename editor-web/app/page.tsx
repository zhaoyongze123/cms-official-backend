import Link from "next/link";

import { getFoundationStatus } from "../lib/foundation";

export default function HomePage() {
  const status = getFoundationStatus();

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">A07 / Next.js Studio Shell</span>
        <h1>AI SEO Studio 已进入工作台壳层开发阶段。</h1>
        <p>
          当前分支提供登录态、受保护的 Studio Shell、文章列表、文章编辑基础页和 Mock API，
          用于在不依赖 Django 实现的情况下推进运营工作台开发。
        </p>
        <div className="cta-row">
          <Link className="cta primary" href="/studio/articles">
            进入文章工作台
          </Link>
          <Link className="cta" href="/login">
            进入 Mock 登录
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
