# Next.js 前端重写开发规范（现状对齐版）

更新时间：2026-05-09
适用对象：前端工程师、前端负责人、联调负责人
目标读者：负责 `editor-web/` 与 Django / FastAPI 联调的工程师
当前结论：旧版文档把大量“目标能力”写成了“当前已可联调能力”。按当前仓库代码核对，Django 面向 Next.js 的公开业务 API 尚未落地，`editor-web` 目前仍以本地 Mock API 与 Mock Session 为主。

---

## 1. 文档目标

本文档只做两件事：

1. 把前端重写范围与当前仓库代码对齐。
2. 明确区分“当前已具备支撑”“只有模型或 Admin 支撑”“仅是目标契约”。

本文档不是视觉稿，也不是功能许愿单。任何页面、接口、字段的表述，都必须能回指到当前仓库中的真实文件。

---

## 2. 当前真实架构边界

当前架构原则仍然成立：

- `Django CMS` 是业务真相源。
- `FastAPI AI/RAG Service` 是内部 AI 能力服务。
- `Next.js Studio` 是运营工作台。

但“边界成立”不等于“接口已经全部实现”。按当前代码核对，现状如下。

### 2.1 当前真实可访问入口

#### Django

- `GET /api/health/`
  - 来源：`config/urls.py`
  - 用途：健康检查
  - 类型：JSON

- `GET /django-admin/next-editor/*`
  - 来源：`config/urls.py` + `apps/simple_cms/admin_views.py`
  - 用途：把 Next.js 页面代理进 Django Admin
  - 类型：代理入口，不是业务 JSON API

- 前台 HTML 页面
  - `/`
  - `/search/`
  - `/category/<slug>/`
  - `/id/<pk>/`
  - `/<slug>/`
  - 来源：`apps/simple_cms/urls.py`
  - 用途：官网前台列表、搜索、分类、详情页
  - 类型：HTML 页面，不是 Studio 业务 API

#### FastAPI

- `GET /health`
  - 来源：`ai_service/main.py`
  - 用途：AI 服务健康检查
  - 类型：JSON

- `POST /internal/*`
  - 来源：`ai_service/main.py`
  - 用途：Django 内部调用 AI / RAG
  - 特征：统一走 `/internal/...`，并依赖 `validate_internal_token`
  - 结论：前端浏览器不应直连

#### Next.js 本地 Mock

以下接口存在于 `editor-web/app/api/`，用于本地演示，不是后端真实业务 API：

- `GET /api/articles`
- `POST /api/articles`
- `GET /api/articles/[id]`
- `PATCH /api/articles/[id]`
- `POST /api/mock/session`
- `POST /api/mock/logout`

### 2.2 当前前端真实实现

当前 `editor-web` 已存在的能力：

- `Mock Session` 登录壳：`/login`
- Studio 壳层：`/studio`
- 文章列表：`/studio/articles`
- 新建文章占位：`/studio/articles/new`
- 编辑文章页：`/studio/articles/[id]`
- 监控页占位：`/studio/analytics`
- 设置页占位：`/studio/settings`
- Django Admin 嵌入页：
  - `/django-admin/articles/new`
  - `/django-admin/articles/[id]`

当前前端尚未完成的事实：

- 没有接入 Django Session。
- 没有接入 Django 文章 CRUD API。
- 没有接入 Django AI 审核、发布、SEO 检查、Analytics API。
- 当前编辑页数据来自 `editor-web/lib/mock-api.ts`，不是 Django 返回值。
- 当前嵌入式编辑器是实验入口，不代表后端 API 已完成。

---

## 3. 功能支撑分层

### 3.1 当前已具备的基础支撑

| 领域 | 当前事实 | 证据文件 |
| --- | --- | --- |
| 健康检查 | Django 有 `GET /api/health/`，FastAPI 有 `GET /health` | `config/urls.py`、`ai_service/main.py` |
| 官网文章前台 | 已有文章列表、搜索、分类、详情 HTML 路由 | `apps/simple_cms/urls.py`、`apps/simple_cms/views.py` |
| CMS 文章数据模型 | 已有 `Article`、`Category`、`Tag`、`SeoMetadata`、`FaqItem`、`ArticleRevision` 等模型 | `apps/simple_cms/models.py` |
| 媒体模型 | 已有 `ImageItem`、`FileItem` | `apps/media_library/models.py` |
| 设置模型 | 已有 `SiteSetting` | `apps/sys_settings/models.py` |
| 用户与审计模型 | 已有 `User`、`ProxyGroup`、`AuditLog` | `apps/users/models.py` |
| 云监控模型 | 已有 `EcsInstanceSnapshot`、`DnsDomainStat`、`EcsMetricPoint` | `apps/aliyun_monitor/models.py` |
| Studio 演示壳层 | 已有登录壳、工作台壳、文章列表/编辑占位、Mock API | `editor-web/app/`、`editor-web/lib/mock-api.ts` |

### 3.2 当前只有模型或 Admin 支撑，尚无公开 JSON API

以下功能域可以先做 UI 壳或 Mock，但当前不能写成“后端已经可联调”：

| 功能域 | 当前真实后端支撑 | 当前缺失 |
| --- | --- | --- |
| 分类管理 | `Category` 模型、Django Admin | 对前端的分类管理 JSON API |
| 标签管理 | `Tag` 模型、Django Admin | 对前端的标签管理 JSON API |
| FAQ 编辑 | `FaqItem` 模型、Django Admin Inline | FAQ 列表/保存/排序 JSON API |
| SEO 信息编辑 | `SeoMetadata` 模型、Django Admin Inline | SEO 字段读写 API、发布前检查 API |
| 媒体库 | `ImageItem`、`FileItem` 模型 | 媒体列表、上传、选择、Alt 编辑 API |
| 全局设置 | `SiteSetting` 模型、Django Admin | 设置读取/保存 API |
| 用户信息 | `User` 模型 | 当前用户资料 API、真实登录态 API |
| 审计日志 | `AuditLog` 模型、Django Admin | 审计日志列表/筛选 API |
| 云资源监控 | 阿里云监控模型与 Admin 页面 | 云资源监控 JSON API |

### 3.3 当前只有目标契约，尚未落地到 Django 路由

`contracts/openapi.django.yaml` 当前定义了以下目标接口：

1. `GET /api/articles/`
2. `POST /api/articles/`
3. `GET /api/articles/{id}/`
4. `PATCH /api/articles/{id}/`
5. `POST /api/articles/{id}/ai-review/`
6. `GET /api/ai-review-runs/{run_id}/suggestions/`
7. `POST /api/ai-suggestions/{id}/accept/`
8. `POST /api/ai-suggestions/{id}/reject/`
9. `POST /api/articles/{id}/publish/`
10. `POST /api/articles/{id}/seo-check/`
11. `GET /api/articles/{id}/analytics/`
12. `GET /api/dashboard/seo-summary/`

这些接口当前的真实状态：

- 已在契约文件中定义。
- 当前未在 `config/urls.py` 注册。
- 当前仓库中未看到对应公开 Django API 视图实现。

必须特别修正文档中的一个不一致点：

- 旧版文档写了 `GET /api/articles/{id}/ai-review-runs/`。
- 该路径当前既不在 `config/urls.py`，也不在 `contracts/openapi.django.yaml`。
- 因此它不能再被写成“当前已有接口”或“当前冻结契约接口”。

---

## 4. 页面范围与文案修正建议

下表用于指导前端文档改写时的口径。

| 页面 / 模块 | 当前应如何描述 | 不应再如何描述 |
| --- | --- | --- |
| 登录页 | 已有 Mock 登录壳，待接 Django Session | 已有真实登录能力 |
| 工作台首页 | 已有壳层和占位指标，真实运营指标待后端 API | 已有真实全局运营数据 |
| 文章列表页 | 可继续用 Mock 字段开发，待 Django 文章列表 API 落地联调 | 已可直接联调 Django 文章列表 |
| 新建 / 编辑文章页 | 可继续围绕 `content_json` 目标契约建设 UI 与编辑体验 | 已完成 Django 落库与发布闭环 |
| AI 审核建议面板 | 当前只能做 fixture / mock 演示 | 已可真实触发 AI 审核与接收建议 |
| 发布前检查 | 当前只能做 UI 壳和 mock 结果 | 已接 `seo-check` 并可真实阻断发布 |
| SEO 监控总览 / 单篇监控 | 当前最多做占位页或 mock 图表 | 已接入真实 Analytics 数据 |
| 媒体库 | 当前只能基于模型字段设计 UI | 已有图片/文件管理 API |
| 分类 / 标签 | 当前只能基于模型字段设计 UI | 已有分类标签管理 API |
| FAQ 编辑 | 当前可按 `FaqItem` 字段设计表单 | 已有 FAQ 独立读写排序 API |
| 全局设置 | 当前可按 `SiteSetting` 字段设计页面 | 已有设置读写 API |
| 用户信息 | 当前只适合保留账号页壳层 | 已有真实用户资料接口 |
| 审计日志 | 当前只适合保留只读表格壳层 | 已有审计日志 API |
| 云资源监控 | 当前只适合保留入口和结构设计 | 已有云资源监控 API |

---

## 5. 路由策略

### 5.1 当前已存在的 Next.js 页面

当前代码里真实存在的页面路由如下：

```text
/login
/studio
/studio/articles
/studio/articles/new
/studio/articles/[id]
/studio/analytics
/studio/settings
/django-admin/articles/new
/django-admin/articles/[id]
```

### 5.2 后续建议保留的目标路由

以下仍可作为目标路由结构，但必须写成“目标”而不是“当前已实现”：

```text
/login
/studio
/studio/articles
/studio/articles/new
/studio/articles/[id]
/studio/articles/[id]/preview
/studio/articles/[id]/analytics
/studio/articles/[id]/publish-check
/studio/media
/studio/categories
/studio/tags
/studio/settings
/studio/audit-logs
/studio/cloud
```

---

## 6. 技术与契约要求

以下要求仍然有效：

- 前端主框架使用 `Next.js App Router`
- 开启 `TypeScript` 严格模式
- 样式系统以 `Tailwind CSS` 为主
- 关键状态流必须统一抽象
- 页面不得直接调用 FastAPI 内部接口

以下要求要改成“目标契约原则”：

- `contracts/article.schema.json`
- `contracts/ai-review.schema.json`
- `contracts/ai-suggestion.schema.json`
- `contracts/ai-patch.schema.json`
- `contracts/rag-search.schema.json`
- `contracts/seo-context.schema.json`
- `contracts/tiptap-document.schema.json`

说明：

1. 这些契约文件依然是前端字段设计与 Mock 数据的依据。
2. 契约存在不代表 Django 公开接口已经实现。
3. 当前 `editor-web/lib/api-client.ts` 调用的是 Next.js 本地 `/api/*` Mock 路由，不是 Django。
4. `content_json` 仍应被视为编辑真相，`content_html` 仍应被视为渲染缓存目标，但当前分支尚未打通后端持久化闭环。

---

## 7. 推荐联调顺序

按当前代码现状，联调优先级建议如下：

1. 先落地 Django 文章列表、详情、新建、更新 API。
2. 再落地 AI 审核触发、建议列表、接受/拒绝。
3. 再落地发布与发布前 SEO 检查。
4. 再落地单篇监控与总览监控。
5. 最后补媒体库、分类标签、设置、用户、审计日志、云监控。

不建议的顺序：

- 先做复杂监控页面，再回头补文章主流程接口。
- 先让前端直调 FastAPI，再事后补 Django 边界。

---

## 8. 验收口径

文档与代码一致，至少满足以下标准：

1. 当前实现、目标契约、仅有模型支撑三类内容必须分开写。
2. 未在 Django 路由中注册的 API，不能写成“当前可联调接口”。
3. `/internal/*` 接口必须明确标注为仅内部调用。
4. 占位页、Mock 登录、Mock API 必须明确标注为演示或过渡实现。
5. 前端联调文档必须和 `config/urls.py`、`ai_service/main.py`、`contracts/openapi.django.yaml` 保持一致。

---

## 9. 一句话给前端工程师的任务定义

```text
请基于当前已经存在的 Studio 壳层和契约文件继续建设前端，但必须把“当前真实可联调能力”和“未来目标接口”严格区分开写。
现阶段可以继续使用 Mock 数据推进 UI、状态流和编辑体验；真正进入联调时，只能替换为 Django 已实际注册并实现的公开 API，禁止直连 FastAPI 内部接口。
```
