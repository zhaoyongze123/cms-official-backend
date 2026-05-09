"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { getMockUser } from "../../lib/session";

type StudioShellProps = {
  children: React.ReactNode;
};

const navigationItems = [
  { href: "/studio" as Route, label: "工作台总览" },
  { href: "/studio/articles" as Route, label: "文章列表" },
  { href: "/studio/analytics" as Route, label: "监控面板" },
  { href: "/studio/settings" as Route, label: "设置占位" }
];

export function StudioShell({ children }: StudioShellProps) {
  const user = getMockUser();
  const pathname = usePathname();

  return (
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <div className="studio-brand">
          <span className="eyebrow">AI SEO Studio</span>
          <strong className="studio-title">运营工作台</strong>
          <span className="studio-subtitle">A11 已接入监控面板 Mock 数据，继续沿用 Studio Shell 工作流。</span>
        </div>

        <div className="studio-user">
          <div>
            <strong>{user.name}</strong>
            <div className="caption">{user.role}</div>
          </div>
          <div className="user-badge">运</div>
        </div>

        <nav className="studio-nav">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={`studio-nav-link${isActive ? " active" : ""}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action="/api/mock/logout" className="logout-form" method="post">
          <button className="ghost-button" type="submit">
            退出 Mock 登录
          </button>
        </form>
      </aside>

      <main className="studio-main">{children}</main>
    </div>
  );
}
