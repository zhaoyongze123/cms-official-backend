"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { getCurrentStudioUser } from "../../lib/session";

const djangoSiteOrigin =
  process.env.NEXT_EDITOR_DEV_ORIGIN?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

type StudioShellProps = {
  children: React.ReactNode;
};

const navigationItems = [
  { href: "/studio" as Route, label: "工作台总览" },
  { href: "/studio/articles" as Route, label: "文章列表" },
  { href: "/studio/ai-settings" as Route, label: "模型管理" },
  { href: "/studio/settings" as Route, label: "工作台设置" }
];

export function StudioShell({ children }: StudioShellProps) {
  const user = getCurrentStudioUser();
  const pathname = usePathname();

  return (
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <div className="studio-brand">
          <span className="eyebrow">AI SEO Studio</span>
          <strong className="studio-title">运营工作台</strong>
          <span className="studio-subtitle">文章、编辑、审核与监控主链路已接入 Django，当前登录态复用 Django Session。</span>
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
            const isRootStudioItem = item.href === "/studio";
            const isActive = isRootStudioItem
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
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

        <a className="ghost-button logout-form" href={`${djangoSiteOrigin}/django-admin/logout/`}>
          退出 Django 登录
        </a>
      </aside>

      <main className="studio-main">{children}</main>
    </div>
  );
}
