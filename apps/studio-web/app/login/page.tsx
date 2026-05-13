import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { studioProxyPath } from "../../lib/routes";
import { DJANGO_SESSION_COOKIE } from "../../lib/session";

const djangoSiteOrigin =
  process.env.NEXT_EDITOR_DEV_ORIGIN?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(DJANGO_SESSION_COOKIE)?.value) {
    redirect(studioProxyPath("/studio/articles"));
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Studio Auth</span>
        <h1>请先完成 Django 登录后再进入 AI SEO Studio。</h1>
        <p className="auth-note">
          当前工作台主链路已经切换到 Django 真 Session 校验，不再签发本地 mock cookie。
          如果你是从 Django Admin iframe 进入，本页通常不会出现；若直接访问此路径，请先到 Django Admin 登录。
        </p>

        <div className="auth-grid">
          <div className="auth-actions">
            <a className="cta primary" href={`${djangoSiteOrigin}/django-admin/login/?next=/django-admin/next-editor/studio/articles`}>
              前往 Django Admin 登录
            </a>
            <a className="cta" href={studioProxyPath("/api/articles")} target="_blank" rel="noreferrer">
              查看 Django API
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
