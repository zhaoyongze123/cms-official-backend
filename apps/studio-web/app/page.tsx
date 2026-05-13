import Link from "next/link";

import { getFoundationStatus } from "../lib/foundation";

export default function HomePage() {
  const status = getFoundationStatus();

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">CMS Editor</span>
        <h1>cms-editor-web 现在只保留文章编辑主链路。</h1>
        <p>
          当前入口聚焦 Django 真文章数据的列表与编辑能力，不再保留运营工作台侧边栏。
          SEO 监控入口已迁回 Django 管理后台。
        </p>
        <div className="cta-row">
          <Link className="cta primary" href="/studio/articles">
            进入文章编辑器
          </Link>
          <Link className="cta" href="/login">
            进入编辑器登录
          </Link>
          <a className="cta" href={status.djangoBaseUrl} target="_blank" rel="noreferrer">
            打开 Django 前台
          </a>
          <a className="cta" href={`${status.djangoBaseUrl}/django-admin/`} target="_blank" rel="noreferrer">
            打开 Django 管理后台
          </a>
          <a className="cta" href={`${status.djangoBaseUrl}/api/health/`} target="_blank" rel="noreferrer">
            查看 Django Health
          </a>
        </div>
      </section>
    </main>
  );
}
