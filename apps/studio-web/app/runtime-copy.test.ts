import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readAppFile(relativePath: string) {
  return readFileSync(resolve(__dirname, relativePath), "utf8");
}

describe("studio runtime copy guards", () => {
  it("keeps the editor-only entry wording", () => {
    const homeSource = readAppFile("./page.tsx");
    const articleListSource = readAppFile("./studio/articles/page.tsx");

    expect(homeSource).toContain("cms-editor-web 现在只保留文章编辑主链路。");
    expect(homeSource).toContain("SEO 监控入口已迁回 Django 管理后台。");
    expect(articleListSource).toContain("不再展示工作台侧边栏");
    expect(articleListSource).toContain("SEO 监控入口已迁回 Django 管理后台");
  });

  it("keeps analytics and django admin copy aligned with the current runtime state", () => {
    const analyticsSource = readAppFile("./django-admin/analytics/page.tsx");
    const adminNewSource = readAppFile("./django-admin/articles/new/page.tsx");

    expect(analyticsSource).toContain("SeoMonitoringDashboard");
    expect(analyticsSource).not.toContain("/studio/analytics");
    expect(adminNewSource).toContain("NewArticleWorkspace");
    expect(adminNewSource).not.toContain("待接入 Django");
  });

  it("keeps login copy aligned with django session guard", () => {
    const homeSource = readAppFile("./page.tsx");
    const loginSource = readAppFile("./login/page.tsx");

    expect(homeSource).toContain("进入文章编辑器");
    expect(loginSource).toContain("请先完成 Django 登录后再进入 AI SEO Studio。");
    expect(loginSource).toContain("不再签发本地 mock cookie");
  });
});
