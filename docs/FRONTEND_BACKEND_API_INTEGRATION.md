# 前后端 API 接口对接文档

更新时间：2026-05-09
适用范围：`editor-web/`、Django CMS、FastAPI AI/RAG Service
文档目标：明确“当前真实可对接接口”“契约已定义但未落地接口”“仅有模型无公开 API 的领域”，避免前后端联调基于错误前提推进。

---

## 1. 边界结论

当前项目的接口归属必须按以下边界理解：

1. `Next.js Studio` 只能调用 Django 暴露的公开接口。
2. `FastAPI AI/RAG Service` 的业务接口属于内部接口，应该由 Django 服务端调用。
3. `editor-web/app/api/*` 目前是前端本地 Mock 层，不是后端真实业务接口。
4. 当前后端代码并未实现 `contracts/openapi.django.yaml` 中的大多数业务 API。

---

## 2. 当前真实可对接的接口

### 2.1 Django 当前真实可访问入口

| 方法 | 路径 | 类型 | 用途 | 前端是否可直接依赖 |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health/` | JSON | Django 健康检查 | 可以，但仅用于连通性检查 |
| `GET` | `/django-admin/next-editor/*` | 代理入口 | 在 Django Admin 中嵌入 Next.js | 可以，但仅用于嵌入，不是业务 API |
| `GET` | `/` | HTML | 文章列表页 | 可以访问，但不是 Studio 业务 API |
| `GET` | `/search/` | HTML | 搜索结果页 | 可以访问，但不是 Studio 业务 API |
| `GET` | `/category/<slug>/` | HTML | 分类文章页 | 可以访问，但不是 Studio 业务 API |
| `GET` | `/id/<pk>/` | HTML | 按 ID 查看文章详情 | 可以访问，但不是 Studio 业务 API |
| `GET` | `/<slug>/` | HTML | 按 slug 查看文章详情 | 可以访问，但不是 Studio 业务 API |

说明：

- 上表来自 `config/urls.py` 与 `apps/simple_cms/urls.py`。
- 当前没有看到 `api/articles`、`api/dashboard`、`api/media`、`api/settings` 等公开 JSON 业务 API 注册。

### 2.2 FastAPI 当前真实可访问入口

| 方法 | 路径 | 类型 | 用途 | 前端是否可直接依赖 |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | JSON | AI 服务健康检查 | 可以访问，但不属于 Studio 业务接口 |
| `GET` | `/docs` | 文档页 | FastAPI Swagger 文档 | 技术上可访问，不应作为业务对接接口 |
| `GET` | `/redoc` | 文档页 | FastAPI ReDoc 文档 | 技术上可访问，不应作为业务对接接口 |

### 2.3 FastAPI 仅内部可调接口

以下接口统一位于 `/internal/*`，并要求 `X-Internal-Token`，前端浏览器不应直连：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/internal/ai/review-article` | 完整文章 AI 审核 |
| `POST` | `/internal/ai/generate-metadata` | 生成 SEO Metadata 建议 |
| `POST` | `/internal/ai/generate-faq` | 生成 FAQ 建议 |
| `POST` | `/internal/ai/recommend-internal-links` | 推荐内链 |
| `POST` | `/internal/ai/generate-alt` | 生成图片 Alt 建议 |
| `POST` | `/internal/rag/reindex-article` | 重建文章 RAG 索引 |
| `POST` | `/internal/rag/search` | RAG 检索 |

---

## 3. 当前前端本地 Mock 接口

以下接口存在于 `editor-web/app/api/`，只服务于前端本地演示，不应误认为 Django 后端接口：

| 方法 | 路径 | 来源文件 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/articles` | `editor-web/app/api/articles/route.ts` | 返回 Mock 文章列表 |
| `POST` | `/api/articles` | `editor-web/app/api/articles/route.ts` | 新建 Mock 文章 |
| `GET` | `/api/articles/[id]` | `editor-web/app/api/articles/[id]/route.ts` | 返回单篇 Mock 文章 |
| `PATCH` | `/api/articles/[id]` | `editor-web/app/api/articles/[id]/route.ts` | 更新 Mock 草稿 |
| `POST` | `/api/mock/session` | `editor-web/app/api/mock/session/route.ts` | 设置 Mock 登录态 |
| `POST` | `/api/mock/logout` | `editor-web/app/api/mock/logout/route.ts` | 清除 Mock 登录态 |

说明：

- 当前 `editor-web/lib/api-client.ts` 访问的就是这些本地 `/api/*` 路由。
- 这套接口只适合支撑前端开发与演示，不能作为后端联调完成的证据。

---

## 4. Django 目标契约接口（已定义但当前未落地）

以下接口来自 `contracts/openapi.django.yaml`，属于“目标公开 API 契约”，不是当前分支已实现事实。

| 方法 | 路径 | 契约用途 | 当前实现状态 |
| --- | --- | --- | --- |
| `GET` | `/api/articles/` | 获取文章列表 | 未在 Django 路由注册 |
| `POST` | `/api/articles/` | 新建文章 | 未在 Django 路由注册 |
| `GET` | `/api/articles/{id}/` | 获取文章详情 | 未在 Django 路由注册 |
| `PATCH` | `/api/articles/{id}/` | 更新文章 | 未在 Django 路由注册 |
| `POST` | `/api/articles/{id}/ai-review/` | 触发 AI 审核 | 未在 Django 路由注册 |
| `GET` | `/api/ai-review-runs/{run_id}/suggestions/` | 获取 AI 建议 | 未在 Django 路由注册 |
| `POST` | `/api/ai-suggestions/{id}/accept/` | 接受建议 | 未在 Django 路由注册 |
| `POST` | `/api/ai-suggestions/{id}/reject/` | 拒绝建议 | 未在 Django 路由注册 |
| `POST` | `/api/articles/{id}/publish/` | 发布文章 | 未在 Django 路由注册 |
| `POST` | `/api/articles/{id}/seo-check/` | 发布前 SEO 检查 | 未在 Django 路由注册 |
| `GET` | `/api/articles/{id}/analytics/` | 获取单篇监控数据 | 未在 Django 路由注册 |
| `GET` | `/api/dashboard/seo-summary/` | 获取 SEO 总览 | 未在 Django 路由注册 |

补充说明：

- 这些接口是前端 Mock 字段与后端未来联调的目标基线。
- 进入联调前，必须先在 Django 中补齐路由注册和视图实现。

---

## 5. 当前文档与代码的不一致点

已核对出的明确不一致如下：

1. 旧版前端规范把文章 CRUD、AI 审核、发布、SEO 监控写成了“当前可联调能力”，但当前 Django 路由中并不存在这些 API。
2. 旧版前端规范把媒体库、分类标签、设置、用户、审计、云监控写成了“必须页面且默认可对接”，但当前后端只有模型或 Admin，没有公开 JSON API。
3. 旧版前端规范写了 `GET /api/articles/{id}/ai-review-runs/`，但该接口当前既不在 `contracts/openapi.django.yaml`，也不在 Django 路由注册中。
4. 当前 `editor-web` 的文章接口来自 Next.js 本地 Mock，不是 Django。

---

## 6. 当前有模型但无公开 API 的领域

| 领域 | 当前模型 / 代码支撑 | 当前缺失 |
| --- | --- | --- |
| 文章内容域 | `Article`、`Category`、`Tag`、`SeoMetadata`、`FaqItem` | 面向 Studio 的公开 JSON API |
| 媒体库 | `ImageItem`、`FileItem` | 列表、上传、选择、Alt 编辑 API |
| 系统设置 | `SiteSetting` | 设置读取、更新 API |
| 用户资料 | `User` | 当前用户信息 API、真实登录态 API |
| 审计日志 | `AuditLog` | 列表、筛选 API |
| 云资源监控 | `EcsInstanceSnapshot`、`DnsDomainStat`、`EcsMetricPoint` | 指标聚合、列表、趋势 API |

---

## 7. 前端与后端的当前对齐说明

### 7.1 当前前端页面现状

当前 `editor-web` 已存在：

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

对齐结论：

- `/studio/articles`、`/studio/articles/new`、`/studio/articles/[id]` 当前依赖 Mock 数据，可以继续推进 UI、交互和状态流。
- `/studio/analytics`、`/studio/settings` 当前是占位页，不应写成真实联调页面。
- `/django-admin/articles/*` 是嵌入式演示入口，不代表 Django 文章后台 API 已齐备。

### 7.2 当前后端对接建议

- 前端开发阶段继续使用 Mock，但必须按目标契约字段组织数据。
- 后端联调阶段先替换文章主流程接口，再逐步替换 AI 审核、发布、监控。
- 在 Django API 未落地前，不要让前端绕过 Django 直接访问 FastAPI。

---

## 8. 联调优先级建议

建议按以下顺序推进真实接口对接：

1. 文章列表、详情、新建、更新。
2. AI 审核触发、建议列表、建议接受/拒绝。
3. 发布、发布前 SEO 检查。
4. SEO 总览、单篇文章监控。
5. 媒体库、分类标签、FAQ 独立接口。
6. 设置、用户、审计日志、云资源监控。

这个顺序的原因很直接：

- 文章主流程是 Studio 的核心路径。
- AI 审核、发布、监控依赖文章主流程稳定存在。
- 媒体、设置、审计、云资源属于扩展域，优先级应低于文章主流程闭环。

---

## 9. 对接纪律

联调时必须遵守以下规则：

1. 前端只对接 Django 公开接口。
2. FastAPI `/internal/*` 仅允许 Django 服务端调用。
3. `SiteSetting` 中的敏感配置不得直接暴露到前端。
4. 任何新增公开 API，都应先更新或核对 `contracts/openapi.django.yaml`。
5. 文档中的“已实现接口”必须以真实路由注册和可调用结果为准，而不是以页面设计或目标规划为准。
