import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MOCK_SESSION_COOKIE } from "../../lib/session";

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(MOCK_SESSION_COOKIE)?.value === "authenticated") {
    redirect("/studio/articles");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Mock Auth</span>
        <h1>登录后进入 AI SEO Studio。</h1>
        <p className="auth-note">
          A07 只实现 Mock 登录态，用于保护 `/studio/*` 路由并验证工作台壳层体验。
          后续接真实 Django Session 时，将保持 Studio 路由结构不变。
        </p>

        <form action="/api/mock/session" className="auth-grid" method="post">
          <div className="field">
            <label className="field-label" htmlFor="email">
              邮箱
            </label>
            <input defaultValue="ops-demo@cms.local" id="email" name="email" />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              密码
            </label>
            <input defaultValue="mock-password" id="password" name="password" type="password" />
          </div>

          <div className="auth-actions">
            <button className="cta primary" type="submit">
              使用 Mock Session 登录
            </button>
            <a className="cta" href="/api/articles" target="_blank" rel="noreferrer">
              查看 Mock API
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}
