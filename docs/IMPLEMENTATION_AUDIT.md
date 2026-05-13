# 实施审计报告

更新时间：2026-05-11  
审计范围：当前仓库工作区实际代码，不包含远端仓库、未拉取分支或未入库部署配置  
审计原则：只记录仓库中真实存在的实现、配置、测试与占位，不推测不存在的 API，不把计划文档当作已实现能力

## 1. 当前应用结构

### 1.1 仓库顶层结构

当前仓库由 3 个主要服务目录和 1 套 Django 站点组成：

| 模块 | 目录 | 当前角色 | 证据 |
| --- | --- | --- | --- |
| Django CMS | `apps/`、`config/`、`templates/` | 当前唯一真实业务站点，承载公开页面、Django Admin、内容模型、SEO 基础渲染 | `config/urls.py`、`apps/simple_cms/models.py`、`apps/simple_cms/views.py` |
| FastAPI AI Service | `ai_service/` | 已有可启动内部服务，提供健康检查、AI 内部接口、RAG 接口 | `ai_service/main.py` |
| Next.js Studio | `editor-web/` | 已有 Studio 壳层、文章列表/编辑页、Mock 登录态、Mock API | `editor-web/app/`、`editor-web/lib/mock-api.ts` |
| Next.js Public Web | 无独立目录 | 当前不存在独立 Public Web 工程；公开页面仍由 Django 模板渲染 | `apps/simple_cms/templates/simple_cms/*.html` |

### 1.2 Django 当前结构

当前 Django 侧主要 App：

| App | 作用 | 当前实现状态 |
| --- | --- | --- |
| `apps/simple_cms` | 文章、分类、标签、SEO 元数据、FAQ、RAG 知识索引、公开页面 | 已实现一部分真实模型与前台页面 |
| `apps/media_library` | 图片/文件资源库 | 已实现，`ImageItem` 支持 `alt_text` |
| `apps/users` | 用户、角色、审计相关 | 已实现基础用户系统 |
| `apps/sys_settings` | 站点配置 | 已实现 |
| `apps/aliyun_monitor` | 阿里云资源与监控快照 | 已实现，但与目标 SEO 监控体系不是一回事 |

### 1.3 FastAPI 当前结构

FastAPI 目前由以下部分组成：

| 目录/文件 | 作用 | 当前状态 |
| --- | --- | --- |
| `ai_service/main.py` | 路由入口 | 已实现 |
| `ai_service/core/providers.py` | AI Provider 层 | `MockProvider` 可用，`SiliconFlowProvider` 为占位 |
| `ai_service/core/graph.py` | LangGraph 审核图 | 仅单节点 `collect_suggestions` |
| `ai_service/core/rag.py` | RAG 检索与 pgvector 后端 | 已实现 mock / pgvector 双路径 |
| `ai_service/worker_stub.py` | Worker 占位进程 | 仅心跳输出，无真实队列消费 |

### 1.4 Next.js 当前结构

当前只有一个 Next.js 工程 `editor-web`，用途偏向 Studio 和 Django Admin 内嵌编辑器：

| 区域 | 目录 | 当前状态 |
| --- | --- | --- |
| 登录与壳层 | `editor-web/app/login`、`editor-web/app/studio/layout.tsx` | 基于 Mock Cookie 的壳层 |
| 文章列表/详情 | `editor-web/app/studio/articles/*` | 读取 Mock 数据 |
| Next.js API Routes | `editor-web/app/api/*` | 仅提供 Mock 文章与 Mock 登录接口 |
| Django Admin 嵌入页 | `editor-web/app/django-admin/*` | 读取 Mock 数据并内嵌到 Admin iframe |
| 编辑组件 | `editor-web/components/articles/article-editor-workspace.tsx` | 非 TipTap，使用文本框和静态建议块演示 |

## 2. 仍在使用 Mock 数据的部分

### 2.1 Next.js Studio 基本依赖 Mock

Studio 当前不是连 Django API，而是连 Next.js 自己的 Mock API：

| 能力 | 当前实现 | 证据 |
| --- | --- | --- |
| 登录态 | `studio_mock_session` Cookie，`/api/mock/session`、`/api/mock/logout` | `editor-web/lib/session.ts`、`editor-web/app/api/mock/*` |
| 文章列表 | `listMockArticles()` | `editor-web/app/studio/articles/page.tsx` |
| 文章详情 | `getMockArticleById()` | `editor-web/app/studio/articles/[id]/page.tsx` |
| 新建文章 | `createMockArticle()` | `editor-web/app/api/articles/route.ts`、`editor-web/app/django-admin/articles/new/page.tsx` |
| 保存草稿 | `PATCH /api/articles/:id` 返回 `updateMockArticlePayload()` 结果 | `editor-web/app/api/articles/[id]/route.ts` |
| 编辑器建议面板 | `STATIC_SUGGESTIONS` 静态数组 | `editor-web/components/articles/article-editor-workspace.tsx` |

### 2.2 FastAPI AI 能力部分仍是 Mock

| 能力 | 当前实现 | 证据 |
| --- | --- | --- |
| AI 审核 | `MockProvider.review_article()` 返回固定 1 条建议 | `ai_service/core/providers.py` |
| Metadata 生成 | `MockProvider.generate_metadata()` 构造 `SeoContext` | `ai_service/core/providers.py` |
| FAQ 生成 | `MockProvider.generate_faq()` 返回固定问答 | `ai_service/core/providers.py` |
| 内链推荐 | 无候选时返回固定 `/articles/{id}/related/` | `ai_service/core/providers.py` |
| 图片 Alt | `MockProvider.generate_alt()` 返回固定建议 | `ai_service/core/providers.py` |
| RAG 检索 | 可走 `_build_mock_chunks()` | `ai_service/core/rag.py` |

### 2.3 SiliconFlow Provider 仍未接入

`SiliconFlowProvider` 除 RAG 相关调用外，AI 业务方法全部抛出 `501 siliconflow_not_implemented`，说明真实 LLM 审核链路尚未完成。

证据：`ai_service/core/providers.py`

### 2.4 Worker 仍为占位

`worker` 服务运行 `python -m ai_service.worker_stub`，仅周期打印心跳，不消费任务、不处理异步审核、不做索引队列。

证据：`docker-compose.yml`、`ai_service/worker_stub.py`

## 3. 所有 Mock 文件、fixture、假 API、localStorage 回退、硬编码数据集、临时占位

### 3.1 Mock 文件与假 API 路由

| 类型 | 文件 | 用途 |
| --- | --- | --- |
| Mock 数据集 | `editor-web/lib/mock-api.ts` | 定义 `MOCK_ARTICLES`、新建/更新 Mock 文章逻辑 |
| 假文章列表 API | `editor-web/app/api/articles/route.ts` | 返回 `listMockArticles()`；POST 新建 Mock 文章 |
| 假文章详情 API | `editor-web/app/api/articles/[id]/route.ts` | GET/PATCH 操作 Mock 文章 |
| 假登录 API | `editor-web/app/api/mock/session/route.ts` | 设置 Mock Session Cookie |
| 假登出 API | `editor-web/app/api/mock/logout/route.ts` | 清理 Mock Session Cookie |
| Mock 会话数据 | `editor-web/lib/session.ts` | 返回固定用户 `ops-demo` |

### 3.2 localStorage 回退与本地缓存

| 文件 | 机制 | 说明 |
| --- | --- | --- |
| `editor-web/components/articles/article-editor-workspace.tsx` | `window.localStorage` | 保存 Studio 草稿副本，键名 `studio.article.{id}` |
| `static/js/admin_article_draft_guard.js` | `window.localStorage` | 保存 Django Admin 旧表单草稿，键名 `article-draft:{pathname}` |

说明：这两套本地缓存都不是服务端持久化真相源，只是浏览器回退机制。

### 3.3 静态建议、硬编码占位与临时文案

| 文件 | 内容 | 性质 |
| --- | --- | --- |
| `editor-web/components/articles/article-editor-workspace.tsx` | `STATIC_SUGGESTIONS`、固定正文示例、固定 AI 建议块 | 硬编码数据 + UI 演示 |
| `editor-web/app/studio/analytics/page.tsx` | “Analytics Placeholder” | 临时占位页 |
| `editor-web/app/studio/settings/page.tsx` | “Settings Placeholder” | 临时占位页 |
| `editor-web/app/studio/page.tsx` | 明确写出 “Mock 登录态保护”、“Mock API” | 壳层说明页 |
| `editor-web/app/login/page.tsx` | 默认邮箱、默认密码、Mock 登录说明 | 演示登录页 |
| `editor-web/app/django-admin/articles/new/page.tsx` | `createMockArticle("2026 年最新 SEO 优化完整指南：从入门到精通")` | 硬编码新建页默认文章 |
| `templates/admin/simple_cms/article_editor_workspace.html` | “Next.js Editor Workspace” iframe 包装页 | 过渡集成壳 |
| `ai_service/worker_stub.py` | Worker 心跳 | 占位进程 |

### 3.4 测试中的 fixture / fake 数据

| 文件 | 内容 |
| --- | --- |
| `ai_service/tests/test_ai_service_contract.py` | 用 `mock` provider 验证契约 |
| `ai_service/tests/test_rag_service.py` | 用 `mock` provider / `mock` rag 验证契约 |
| `apps/simple_cms/tests.py` | 使用 `SimpleUploadedFile("cover.jpg", b"fake-image-bytes", ...)` 构造测试图片 |

## 4. 当前真实存在的 API Endpoint

### 4.1 Django 真实对外 Endpoint

当前 Django 真正存在的 URL 只有以下几类：

| 方法 | 路径 | 作用 | 证据 |
| --- | --- | --- | --- |
| `GET` | `/api/health/` | Django 健康检查 | `config/urls.py` |
| `GET/HEAD` | `/django-admin/next-editor/` 及其子路径 | 反向代理到 Next.js 内部编辑器 | `config/urls.py`、`apps/simple_cms/admin_views.py` |
| `GET` | `/` | 文章列表 | `apps/simple_cms/urls.py` |
| `GET` | `/search/` | 搜索 | `apps/simple_cms/urls.py` |
| `GET` | `/category/<slug>/` | 分类列表 | `apps/simple_cms/urls.py` |
| `GET` | `/id/<pk>/` | 按 ID 查看文章详情 | `apps/simple_cms/urls.py` |
| `GET` | `/<path:slug>/` | 按 slug 查看文章详情 | `apps/simple_cms/urls.py` |

### 4.2 FastAPI 真实存在的 Endpoint

| 方法 | 路径 | 作用 | 证据 |
| --- | --- | --- | --- |
| `GET` | `/health` | 健康检查 | `ai_service/main.py` |
| `POST` | `/internal/ai/review-article` | 文章 AI 审核 | `ai_service/main.py` |
| `POST` | `/internal/ai/generate-metadata` | 生成 Metadata 建议 | `ai_service/main.py` |
| `POST` | `/internal/ai/generate-faq` | 生成 FAQ 建议 | `ai_service/main.py` |
| `POST` | `/internal/ai/recommend-internal-links` | 推荐内链 | `ai_service/main.py` |
| `POST` | `/internal/ai/generate-alt` | 生成图片 Alt 建议 | `ai_service/main.py` |
| `POST` | `/internal/rag/reindex-article` | 重建文章索引 | `ai_service/main.py` |
| `POST` | `/internal/rag/search` | RAG 检索 | `ai_service/main.py` |

### 4.3 Next.js 当前存在的内部 API Route

这些 API Route 真实存在，但它们不是目标架构中的 Django API，而是 Next.js 自己的过渡层：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/articles` | 返回 Mock 文章列表 |
| `POST` | `/api/articles` | 新建 Mock 文章 |
| `GET` | `/api/articles/:id` | 返回 Mock 文章详情 |
| `PATCH` | `/api/articles/:id` | 更新 Mock 文章 |
| `POST` | `/api/mock/session` | 设置 Mock 登录态 |
| `POST` | `/api/mock/logout` | 清除 Mock 登录态 |

## 5. 缺失的 Django Endpoint

以下接口在契约 `contracts/openapi.django.yaml` 和 `docs/INTERFACE_CONTRACTS.md` 中被定义，但当前 Django 仓库没有对应 URL 或视图实现：

| 方法 | 路径 | 当前状态 |
| --- | --- | --- |
| `GET` | `/api/articles/` | 缺失；当前只有 Next.js Mock Route |
| `POST` | `/api/articles/` | 缺失；当前只有 Next.js Mock Route |
| `GET` | `/api/articles/{id}/` | 缺失 |
| `PATCH` | `/api/articles/{id}/` | 缺失 |
| `POST` | `/api/articles/{id}/ai-review/` | 缺失 |
| `GET` | `/api/articles/{id}/ai-review-runs/` | 缺失 |
| `GET` | `/api/ai-review-runs/{run_id}/suggestions/` | 缺失 |
| `POST` | `/api/ai-suggestions/{id}/accept/` | 缺失 |
| `POST` | `/api/ai-suggestions/{id}/reject/` | 缺失 |
| `POST` | `/api/articles/{id}/publish/` | 缺失 |
| `POST` | `/api/articles/{id}/seo-check/` | 缺失 |
| `GET` | `/api/articles/{id}/analytics/` | 缺失 |
| `GET` | `/api/dashboard/seo-summary/` | 缺失 |

补充事实：

1. `config/urls.py` 中没有引入任何面向上述契约的 API URLConf。
2. 仓库中未见 Django REST Framework 或等价 API 层代码。
3. Django Admin 批量动作 `action_publish_now` 不是契约中的发布 API，不能替代 `/api/articles/{id}/publish/`。

## 6. 缺失的 FastAPI Endpoint

对照目标架构和现有契约，FastAPI 契约内接口基本都已建出路由；缺的是“真实能力”和更细粒度功能，而不是主路径本身。

### 6.1 契约内主路径缺失情况

当前未发现 `contracts/openapi.ai-service.yaml` 中声明但在 `ai_service/main.py` 完全不存在的主路径。

### 6.2 目标架构层面的能力缺口

虽然路由在，但以下能力仍未达到目标架构要求：

| 目标能力 | 当前缺口 | 证据 |
| --- | --- | --- |
| 真实 LLM 调用 | `SiliconFlowProvider` 的审核、Metadata、FAQ、内链、Alt 均未实现 | `ai_service/core/providers.py` |
| 复杂 LangGraph 工作流 | 当前只有单节点 `collect_suggestions`，没有多阶段审核、FAQ、Metadata、Patch 协同图 | `ai_service/core/graph.py` |
| 发布前检查专属 AI 支持 | 无对应 FastAPI 端检查接口 | `ai_service/main.py` 未提供 |
| 面向 Django 的监控/分析支持接口 | 无 Analytics 相关内部接口 | `ai_service/main.py` 未提供 |

结论：FastAPI 的“路由壳”较完整，但“真实业务实现”仍不完整。

## 7. 缺失的数据库模型或迁移

### 7.1 Django 侧缺失的目标模型

当前 Django 已有：`Article`、`Category`、`Tag`、`SeoMetadata`、`FaqItem`、`KnowledgeSource`、`KnowledgeChunk`、`ArticleRevision`、`ArticleSlugHistory`。

但目标架构中明确需要、而当前仓库未见 Django 模型定义的包括：

| 模型/能力 | 当前状态 | 依据 |
| --- | --- | --- |
| `AiReviewRun` | 缺失 Django ORM 模型 | 仅在 `ai_service/core/models.py` 存在 dataclass |
| `AiSuggestion` | 缺失 Django ORM 模型 | 同上 |
| `AiPatch` | 缺失 Django ORM 模型 | 同上 |
| `AnalyticsSnapshot` | 缺失 Django ORM 模型 | 全仓未定义，仅文档提到 |
| AI 建议接受/拒绝持久化模型 | 缺失 | 无对应模型/迁移 |
| 发布前 SEO 检查结果持久化模型 | 缺失 | 无对应模型/迁移 |

### 7.2 迁移状态缺口

| 现象 | 说明 |
| --- | --- |
| `apps/simple_cms/migrations/0010_*.py` 缺失 | 当前迁移编号从 `0009` 跳到 `0011`，说明曾有编号占用或删除，仓库现状存在编号空洞 |
| 与 AI 审核相关的迁移不存在 | 因为 Django 侧对应模型不存在 |
| 与 AnalyticsSnapshot 相关的迁移不存在 | 因为模型不存在 |

说明：`0010` 编号空洞本身不一定导致运行失败，但它是当前迁移历史不连续的客观事实。

## 8. 缺失的环境变量

### 8.1 代码中使用、`.env.example` 未声明的变量

| 变量 | 使用位置 | 当前问题 |
| --- | --- | --- |
| `AI_MODEL` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `NEXT_EDITOR_INTERNAL_URL` | `config/settings/base.py` | `.env.example` 未声明 |
| `SERVICE_NAME` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `ENABLE_RESPONSE_HEADERS` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `RAG_DEFAULT_LIMIT` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `RAG_CANDIDATE_LIMIT` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `RAG_INDEX_CHUNK_SIZE` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `RAG_INDEX_CHUNK_OVERLAP` | `ai_service/core/config.py` | `.env.example` 未声明 |
| `RAG_EMBEDDING_DIMENSIONS` | `ai_service/core/config.py` | `.env.example` 只有 `RAG_VECTOR_DIMENSIONS`，命名不一致 |
| `DATABASE_URL` | `ai_service/core/config.py` | 可作为 `RAG_DATABASE_URL` fallback，但 `.env.example` 未声明 |
| `WORKER_HEARTBEAT_SECONDS` | `ai_service/worker_stub.py` | `.env.example` 未声明 |
| `ALIYUN_CMS_ENDPOINT` | `apps/aliyun_monitor/management/commands/sync_aliyun.py` | `.env.example` 未声明 |

### 8.2 文档与实现不一致的变量

| 变量 | 文档/实现差异 |
| --- | --- |
| `NEXT_PUBLIC_AUTH_MODE` | 默认值写成 `django-session`，但实际登录逻辑完全基于 Mock Session，不是真实 Django Session |
| `SILICONFLOW_CHAT_MODEL` / `SILICONFLOW_FAST_MODEL` | `.env.example` 声明了，但 `ai_service/core/config.py` 当前没有读取这两个变量 |

## 9. 当前本地运行方式

### 9.1 基础启动

根据 `README.md` 与 `docker-compose.yml`，当前推荐运行方式：

```bash
cp .env.example .env
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

### 9.2 当前会启动的服务

| 服务 | 端口/访问方式 | 说明 |
| --- | --- | --- |
| `web` | `http://127.0.0.1:8001/` | Django 前台与 Admin |
| `ai-service` | `http://127.0.0.1:8002/health` | FastAPI |
| `editor-web` | 容器内部 `3000`，通过 Django 反向代理访问 | Django Admin iframe / Studio 本地服务 |
| `db` | Docker 内部 PostgreSQL 15 + pgvector | 持久化 |
| `redis` | Docker 内部 Redis 7 | 缓存 |
| `worker` | Docker 内部占位 worker | 心跳，无真实消费 |

### 9.3 当前可访问的关键地址

| 地址 | 当前作用 |
| --- | --- |
| `http://127.0.0.1:8001/` | Django 文章前台 |
| `http://127.0.0.1:8001/api/health/` | Django health |
| `http://127.0.0.1:8001/django-admin/` | Django Admin |
| `http://127.0.0.1:8002/health` | FastAPI health |

补充事实：`editor-web` 没有在主机显式映射端口，主要通过 Django 的 `/django-admin/next-editor/*` 代理访问。

## 10. 当前项目为什么还不能端到端完整工作

### 10.1 Django 不是当前 Studio 的 API 真相源

目标架构要求 Next.js 只能调用 Django API，但当前 Studio 依赖：

1. `editor-web/app/api/articles/*` 的 Mock 路由；
2. `editor-web/lib/mock-api.ts` 的内存数据；
3. `editor-web/lib/session.ts` 的 Mock 用户；
4. `editor-web/app/api/mock/*` 的 Mock 会话。

因此 Studio 没有真正进入 “Next.js -> Django API -> Django 持久化” 链路。

### 10.2 Django 缺少 AI 审核与发布工作流 API

契约要求的文章 CRUD、AI 审核触发、建议接受/拒绝、发布检查、发布动作、SEO 监控 API 均未实现，导致：

1. FastAPI 无法被 Django 工作流真实驱动；
2. Studio 无法消费真实文章编辑接口；
3. 建议无法在 Django 中落库；
4. 发布动作无法按契约闭环。

### 10.3 AI 审核结果没有 Django 持久化模型

FastAPI 只是返回 dataclass 结构，Django 侧没有：

1. `AiReviewRun`
2. `AiSuggestion`
3. `AiPatch`

因此无法满足“AI suggestion persistence”目标，也无法支撑 Accept/Reject、运行历史、冲突处理。

### 10.4 编辑器不是 TipTap，也没有真实 Diff/Accept/Reject

目标要求 TipTap + AI diff + accept/reject。当前 `article-editor-workspace.tsx` 只是：

1. 普通输入框/文本域；
2. 静态建议数组；
3. 固定的绿色/红色建议块演示；
4. 保存时仅调用 Mock PATCH。

因此 A09 `tiptap-diff-editor` 仍未完成。

### 10.5 Public Web 仍是 Django 模板，不是独立 Next.js Public Web

目标架构要求 “Next.js Public Web renders SEO-optimized public pages using real data from Django”。当前公开站仍是：

1. Django `DetailView` / `ListView`
2. Django 模板 `article_detail.html` / `article_list.html`

而且当前详情页 SEO 只做了基础 canonical 和 meta description，并未看到完整 JSON-LD、FAQ Schema、Breadcrumb Schema、OG/Twitter 输出闭环。

### 10.6 Analytics 不是目标中的 SEO Analytics

当前仓库存在 `apps/aliyun_monitor`，记录的是 ECS / DNS / 云监控快照；而目标架构需要：

1. 单篇 SEO 监控；
2. GSC / GA4；
3. SEO Summary；
4. 文章级 AnalyticsSnapshot。

这些当前都未落地。

### 10.7 Worker / 异步链路未真正建成

虽然 Compose 中有 `worker`，但它只是占位程序，没有：

1. 异步任务队列；
2. RAG 重建消费；
3. AI 审核任务调度；
4. 发布后监控同步。

### 10.8 真实 LLM 提供商未接通

`SiliconFlowProvider` 绝大多数方法返回 501，占位未实现。即使配置了真实 Key，也无法完成完整 AI 审核流程。

## 11. 建议的分小 PR 实施计划

以下计划只基于当前仓库现状拆分，小 PR 顺序遵循“先真相源，再接口，再替换 Mock，再做联调”。

### PR-01：补齐 Django API 基础骨架

目标：

1. 建立 `/api/articles/`、`/api/articles/{id}/` 基础读写接口；
2. 明确文章 DTO 与契约字段映射；
3. 让 Studio 不再依赖 Next.js Mock 文章路由。

范围：

- Django URLConf / API views / serializers
- 契约一致性测试
- 不碰 AI 审核和发布

### PR-02：落地 Django AI 审核持久化模型

目标：

1. 新增 `AiReviewRun`、`AiSuggestion`、`AiPatch` Django 模型与迁移；
2. 建立运行历史、建议状态、Patch 结构持久化；
3. 只做落库与查询，不做前端差异渲染。

范围：

- 模型
- 迁移
- Admin/只读调试视图
- 基础 ORM 测试

### PR-03：实现 Django -> FastAPI 审核触发与建议查询接口

目标：

1. 实现 `/api/articles/{id}/ai-review/`
2. 实现 `/api/articles/{id}/ai-review-runs/`
3. 实现 `/api/ai-review-runs/{run_id}/suggestions/`

范围：

- Django internal client 调用 FastAPI
- 将 FastAPI 返回值校验并落库
- API 契约测试

### PR-04：替换 Next.js Mock 文章 API，接入 Django 真接口

目标：

1. 下线 `editor-web/app/api/articles/*` 对业务的主依赖；
2. `fetchArticles` / `fetchArticle` / `updateArticleDraft` 直连 Django；
3. 页面列表和详情改为真实数据。

范围：

- `editor-web/lib/api-client.ts`
- 页面数据加载
- 错误态和空态

### PR-05：替换 Mock 登录，接入 Django Session

目标：

1. 删除 `/api/mock/session`、`/api/mock/logout` 的主路径职责；
2. Studio 鉴权改为真实 Django Session；
3. 保持路由结构不变。

范围：

- Session 代理/校验
- 登录跳转
- 用户信息展示

### PR-06：实现 TipTap 真编辑器与 `content_json` 保存

目标：

1. 以 `Article.content_json` 为编辑真相源；
2. 保存时同步 `content_html` 缓存；
3. blockId 生成和契约校验入库。

范围：

- `editor-web/components/articles/*`
- Django 保存接口
- TipTap 文档结构测试

### PR-07：实现 AI Diff、Accept/Reject 与 Patch 冲突校验

目标：

1. 基于 Django 持久化的 `AiPatch` 渲染 diff；
2. 实现接受/拒绝接口；
3. 校验 `content_hash` 与 `target_block_id`。

范围：

- Next.js diff UI
- Django accept/reject API
- Patch apply 逻辑

### PR-08：实现发布前检查与发布 API

目标：

1. 实现 `/api/articles/{id}/seo-check/`
2. 实现 `/api/articles/{id}/publish/`
3. 支持 Error 阻断、Warning 提示。

范围：

- Django 发布检查服务
- 发布状态与响应结构
- 前端发布面板

### PR-09：补齐 Public Web SEO 结构化输出

目标：

1. 明确是否保留 Django 渲染公开站，还是新增独立 Next.js Public Web；
2. 无论采用哪种方案，都要落地 canonical、OG、Twitter、JSON-LD、FAQ、Breadcrumb、Sitemap 真输出；
3. 用真实 HTTP 响应做验收。

说明：

当前仓库没有独立 Public Web 工程，这一步必须先做架构决策，不能直接假设已有 Next.js Public Web 可改。

### PR-10：实现 AnalyticsSnapshot 与 SEO Summary

目标：

1. 新增 `AnalyticsSnapshot` 等监控模型；
2. 提供 `/api/articles/{id}/analytics/`、`/api/dashboard/seo-summary/`；
3. Next.js Analytics 页从占位切换到真实数据。

范围：

- Django 模型/迁移
- API
- Next.js 监控页

### PR-11：补齐真实 LLM Provider 与异步任务

目标：

1. 补完 `SiliconFlowProvider` 各业务方法；
2. 建立真实异步 worker 能力；
3. 对 RAG 重建、AI 审核、监控同步进行任务化。

范围：

- FastAPI provider
- worker / queue
- 失败重试与 trace

### PR-12：删除剩余 Mock，做 E2E 联调

目标：

1. 清理业务主链路上的 Mock 文章 API、Mock 登录、静态建议；
2. 跑通 “新建文章 -> 编辑 -> AI 审核 -> 接受建议 -> 发布 -> 查看公开页 -> 查看监控”；
3. 补完整体验收记录。

## 结论

当前仓库已经具备：

1. Django 内容模型和前台页面基础；
2. FastAPI 路由骨架与 RAG 基础实现；
3. Next.js Studio 壳层与 Django Admin 嵌入机制；
4. 本地 Docker 底座。

但距离目标架构仍有 4 个核心断点：

1. Django API 真相源尚未建立；
2. AI 审核结果没有 Django 持久化模型；
3. Next.js Studio 仍以 Mock 数据和 Mock 登录运转；
4. Public Web 与 Analytics 目标能力尚未完整落地。

因此，项目当前能“分模块启动并演示壳层”，但还不能“真实端到端完成 AI Native SEO Publishing OS 工作流”。
