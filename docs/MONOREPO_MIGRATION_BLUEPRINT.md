# Monorepo 架构迁移蓝图

更新时间：2026-05-11  
适用范围：当前仓库 `/Users/mac/项目/cms官网后台`  
目标：把当前仓库分阶段迁移为可生产演进的 `AI Native SEO Publishing Platform` Monorepo  
约束：本蓝图只定义迁移设计与执行规范，不直接实施业务代码迁移

---

## 1. 文档用途

本文档不是概念说明，而是后续 Code Agent / Codex 可直接执行的迁移规范。

后续实施时，必须把迁移工作拆成一组小 PR，按本文档顺序推进，而不是一次性大重构。

本文档解决 5 个问题：

1. 当前仓库应该迁移成什么结构。
2. 当前每个目录、模块、模型、接口应该落到目标结构的哪里。
3. 哪些代码可以平移，哪些必须重写。
4. 迁移必须分成多少个 PR，每个 PR 的边界是什么。
5. 后续 Codex 如何按文档逐步完成迁移并保持系统可运行。

---

## 2. 输入依据

本蓝图基于以下真实输入整理：

1. 项目规则：`AGENTS.md`
2. 现状审计：[docs/IMPLEMENTATION_AUDIT.md](/Users/mac/项目/cms官网后台/docs/IMPLEMENTATION_AUDIT.md)
3. 架构边界：`docs/ARCHITECTURE_BOUNDARIES.md`
4. 接口契约：`docs/INTERFACE_CONTRACTS.md`
5. 前后端对接事实：`docs/FRONTEND_BACKEND_API_INTEGRATION.md`
6. Next.js 现状规格：`docs/NEXTJS_FRONTEND_REBUILD_SPEC.md`
7. 用户提供的目标 Monorepo 建议

本蓝图中的所有迁移判断，必须以当前仓库真实代码为准，不以“理想状态”替代“当前事实”。

---

## 3. 当前现状摘要

当前仓库真实情况：

| 领域 | 当前状态 |
| --- | --- |
| Django | 是当前唯一真实业务站点，公开前台仍是 Django 模板 |
| FastAPI | 已有内部 AI / RAG 路由骨架，但真实 Provider 未完成 |
| Next.js | 只有一个 `editor-web` 工程，主要承载 Studio 壳层与 Django Admin 嵌入页 |
| Public Web | 当前不存在独立 `public-web` 工程 |
| Mock | Studio 主链路仍依赖 Mock API、Mock Session、localStorage |
| AI 持久化 | Django 缺少 `AiReviewRun`、`AiSuggestion`、`AiPatch` ORM 模型 |
| Analytics | 当前没有目标中的 `AnalyticsSnapshot` 和 SEO Summary 体系 |

结论：

- 当前仓库适合“分阶段迁移到 Monorepo”
- 不适合“先搬目录再补能力”
- 必须先冻结协议和边界，再迁移实现

---

## 4. 目标 Monorepo 结构

目标目录如下：

```text
ai-seo-publishing-os/
├── apps/
│   ├── cms-api/
│   ├── ai-service/
│   ├── studio-web/
│   └── public-web/
├── packages/
│   ├── shared-types/
│   ├── seo-schema/
│   ├── editor-protocol/
│   ├── api-client/
│   └── ui/
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── terraform/
│   ├── k8s/
│   └── monitoring/
├── scripts/
├── docs/
├── .github/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

### 4.1 目标职责

| 目录 | 职责 |
| --- | --- |
| `apps/cms-api` | Django CMS 真相源，负责内容、权限、发布、SEO 元数据、AI 建议持久化、公开 API |
| `apps/ai-service` | FastAPI AI Runtime，负责 RAG、LLM、LangGraph、Patch 生成 |
| `apps/studio-web` | Next.js 内部工作台，负责文章编辑、AI diff、审核与发布流程 |
| `apps/public-web` | Next.js 公开 SEO 站点，负责 SEO 页面渲染、缓存、ISR |
| `packages/editor-protocol` | Patch、Suggestion、Editor schema、blockId 相关协议 |
| `packages/shared-types` | Article、FAQ、SEO、Analytics 等共享类型 |
| `packages/seo-schema` | Article/FAQ/Breadcrumb 等结构化数据构造与校验 |
| `packages/api-client` | Studio/Public Web 共享 API client |
| `packages/ui` | 跨站点复用的 UI primitives |
| `infra/*` | 运行时与部署基础设施 |

---

## 5. 迁移总原则

### 5.1 不允许的做法

以下做法禁止：

1. 一次性移动全部目录后再修复 import。
2. 在 Django API 未补齐前，直接删掉 Next.js Mock 主链路。
3. 在 `editor-protocol` 未冻结前，同时改 TipTap、FastAPI Patch、Django 持久化模型。
4. 让 `studio-web` 直接调用 FastAPI 内部接口。
5. 先建 `public-web` 大量页面，再回头补 CMS API。

### 5.2 允许的做法

以下做法允许且推荐：

1. 先创建目标目录与兼容层，再逐模块迁移。
2. 先搬“共享协议”，再搬“业务实现”。
3. 新旧目录并存一段时间，但必须有明确删除计划。
4. 每个 PR 都保持主干可运行。
5. 每个 PR 都必须说明“兼容保留项”和“后续删除项”。

### 5.3 迁移执行顺序

固定顺序如下：

```text
先冻结协议
再整理目录
再拆 Django 业务边界
再接通 Django API 真相源
再替换 Studio Mock 主链路
再引入 public-web
最后做 infra 与最终清理
```

---

## 6. 当前目录到目标目录映射

### 6.1 顶层目录映射

| 当前路径 | 目标路径 | 处理方式 |
| --- | --- | --- |
| `apps/` | `apps/cms-api/apps/` | 部分平移 + 业务拆分 |
| `config/` | `apps/cms-api/config/` | 可平移 |
| `templates/` | `apps/cms-api/templates/` | 可平移 |
| `static/` | `apps/cms-api/static/` | 可平移 |
| `manage.py` | `apps/cms-api/manage.py` | 可平移 |
| `requirements.txt` | `apps/cms-api/requirements/base.txt` 或同级 requirements 结构 | 需要重组 |
| `ai_service/` | `apps/ai-service/app/` + `apps/ai-service/tests/` | 部分重组，不是原样平移 |
| `editor-web/` | `apps/studio-web/` | 可先整体平移，再内部重构 |
| `contracts/` | `packages/editor-protocol/`、`packages/shared-types/`、`packages/seo-schema/`、保留 `contracts/` 作为服务契约层 | 不能简单移动，需拆分 |
| `docker/` | `infra/docker/` | 可平移 |
| `docs/` | `docs/` | 保持 |

### 6.2 当前 Django app 到目标 Django app 映射

| 当前模块 | 目标模块 | 处理方式 |
| --- | --- | --- |
| `apps/simple_cms` | `articles`、`seo`、`faq`、`knowledge`、`publishing`、`common` | 必须拆分，不能原样保留 |
| `apps/media_library` | `media` | 可平移后整理 |
| `apps/users` | `users` | 可平移 |
| `apps/sys_settings` | `common` 或 `publishing` 下 settings 域，视职责再拆 | 需要重构 |
| `apps/aliyun_monitor` | `analytics` 的一部分或独立 `ops_monitoring` | 不应直接并入 SEO analytics，需要先边界澄清 |

### 6.3 当前 FastAPI 到目标 FastAPI 映射

| 当前模块 | 目标模块 | 处理方式 |
| --- | --- | --- |
| `ai_service/main.py` | `apps/ai-service/app/api/main.py` 或 `app/main.py` | 可重组 |
| `ai_service/core/graph.py` | `apps/ai-service/app/graphs/` | 需要拆分 |
| `ai_service/core/providers.py` | `apps/ai-service/app/providers/` | 需要拆分 |
| `ai_service/core/rag.py` | `apps/ai-service/app/rag/` | 需要拆分 |
| `ai_service/core/models.py` | `apps/ai-service/app/schemas/` | 可重组 |
| `ai_service/tests/` | `apps/ai-service/tests/` | 可平移 |

### 6.4 当前 Next.js 到目标 Studio/Public Web 映射

| 当前模块 | 目标模块 | 处理方式 |
| --- | --- | --- |
| `editor-web/app/studio/*` | `apps/studio-web/app/*` | 可平移 |
| `editor-web/app/django-admin/*` | `apps/studio-web/app/django-admin/*` | 可平移，后续可能下线 |
| `editor-web/components/*` | `apps/studio-web/features/*`、`entities/*`、`widgets/*` | 需要重构 |
| `editor-web/lib/mock-api.ts` | 临时保留在 `studio-web/shared/mocks/`，最终删除 | 仅临时迁移 |
| Django 模板公开页 | `apps/public-web` | 不是平移，是重建 |

---

## 7. 哪些可以平移，哪些必须重写

### 7.1 可平移模块

以下模块可以基本按目录迁移，再做小规模 import 修复：

| 模块 | 理由 |
| --- | --- |
| Django 配置文件 `config/` | 结构已接近标准 Django project |
| `apps/users` | 相对独立 |
| `apps/media_library` | 相对独立 |
| FastAPI tests | 与目标结构兼容度较高 |
| `editor-web/app/studio/*` 路由壳层 | 页面层级可保留 |
| `docker/` | 可以归入 `infra/docker/` |

### 7.2 必须重写或深度重构的模块

| 模块 | 原因 |
| --- | --- |
| `apps/simple_cms/models.py` | 当前是聚合式大模型文件，不适合目标多 app 边界 |
| `editor-web/components/articles/article-editor-workspace.tsx` | 当前不是 TipTap 真编辑器，含静态建议和 Mock 行为 |
| `editor-web/lib/mock-api.ts` | 仅演示用途，必须删除主链路职责 |
| FastAPI `SiliconFlowProvider` | 当前为 501 占位，不是可迁移生产实现 |
| 当前 Django 公开前台模板 | 目标是 `public-web`，不能直接平移当生产形态 |
| `contracts/` 当前组织方式 | 需要拆分为服务契约和共享协议包 |

### 7.3 必须先做兼容层再迁移的模块

| 模块 | 兼容策略 |
| --- | --- |
| Django 文章 API | 先新增真实 Django API，再替换 Studio 调用 |
| AI Suggestion 持久化 | 先新增 ORM 模型与 API，再接 FastAPI 和前端 |
| Next.js 登录 | 先补 Django Session 接口或代理，再删 Mock Session |
| Public Web | 先补 CMS API 和 SEO schema，再新增 `public-web` |

---

## 8. 目标 Django 结构

目标 `apps/cms-api/`：

```text
apps/cms-api/
├── manage.py
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── local.py
│   │   ├── production.py
│   │   └── test.py
│   ├── urls.py
│   ├── celery.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── articles/
│   ├── seo/
│   ├── ai_reviews/
│   ├── faq/
│   ├── media/
│   ├── analytics/
│   ├── knowledge/
│   ├── publishing/
│   ├── users/
│   └── common/
├── services/
├── tests/
├── requirements/
└── static/
```

### 8.1 Django app 领域边界

| 目标 app | 负责 |
| --- | --- |
| `articles` | `Article`、`Category`、`Tag`、`ArticleRevision`、slug history |
| `seo` | `SeoMetadata`、SEO Context、canonical、OG、Schema、sitemap |
| `ai_reviews` | `AiReviewRun`、`AiSuggestion`、`AiPatch`、接受/拒绝逻辑、FastAPI client |
| `faq` | FAQ 条目及 FAQ 相关输出 |
| `media` | 图片、文件、Alt 文本 |
| `analytics` | `AnalyticsSnapshot`、SEO Summary、GSC/GA4 聚合 |
| `knowledge` | `KnowledgeSource`、`KnowledgeChunk`、索引和查询 |
| `publishing` | 发布检查、发布动作、状态流、任务编排 |
| `users` | 用户、角色、权限、审计 |
| `common` | 共享基类、枚举、工具、站点配置 |

### 8.2 Django 内部代码结构

每个业务 app 推荐：

```text
<app>/
├── models/
├── api/
│   ├── serializers/
│   ├── views/
│   └── urls.py
├── services/
├── selectors/
├── tasks/
├── admin/
└── tests/
```

固定规则：

- `selectors/` 只负责读取数据库
- `services/` 负责业务逻辑
- `api/` 不直接塞复杂业务逻辑
- 新 app 建立后，不再往单个大 `models.py` 追加新领域模型

---

## 9. 目标 Studio 结构

目标 `apps/studio-web/`：

```text
apps/studio-web/
├── app/
├── features/
├── entities/
├── shared/
├── widgets/
├── processes/
├── lib/
├── stores/
└── styles/
```

### 9.1 Feature-Sliced 拆分规则

| 层级 | 职责 |
| --- | --- |
| `entities` | article、faq、suggestion、patch 等核心实体 |
| `features` | save-draft、run-ai-review、accept-suggestion、publish-article |
| `widgets` | editor、seo-panel、publish-checklist、analytics-chart |
| `processes` | 编辑流、发布流、AI 审核流 |
| `shared` | UI primitives、hooks、mocks、config、utils |

### 9.2 编辑器目标结构

```text
features/editor/
├── components/
├── hooks/
├── stores/
├── utils/
├── schemas/
└── types/
```

重点能力：

1. TipTap 真编辑器
2. diff decoration
3. patch apply / validate / merge
4. blockId 稳定性维护
5. suggestion sidebar

---

## 10. 目标 FastAPI 结构

目标 `apps/ai-service/`：

```text
apps/ai-service/
├── app/
│   ├── api/
│   ├── graphs/
│   ├── nodes/
│   ├── rag/
│   ├── prompts/
│   ├── providers/
│   ├── evaluators/
│   ├── schemas/
│   ├── services/
│   ├── workflows/
│   └── utils/
├── tests/
└── requirements/
```

固定规则：

- prompt 文件版本化，禁止长期写死在代码里
- `graphs/` 与 `nodes/` 分开
- `schemas/` 承担 API 结构和内部协议结构
- Provider 层不得混杂路由逻辑

---

## 11. 共享包拆分方案

### 11.1 `packages/editor-protocol`

职责：

- Patch 协议
- Suggestion 协议
- Editor schema
- blockId / validators / constants

建议内容：

```text
packages/editor-protocol/
├── patch.schema.ts
├── suggestion.schema.ts
├── editor.schema.ts
├── validators.ts
└── constants.ts
```

### 11.2 `packages/shared-types`

职责：

- Article
- FAQ
- SEO
- Analytics
- API response DTO

### 11.3 `packages/seo-schema`

职责：

- Article schema builder
- FAQ schema builder
- Breadcrumb schema builder
- JSON-LD validator

### 11.4 `packages/api-client`

职责：

- Studio / Public Web 共用 HTTP client
- 请求封装
- 鉴权处理
- Trace id / error 归一化

### 11.5 `packages/ui`

职责：

- Button / Field / Modal / Panel / Table 等基础组件
- 不放业务逻辑

---

## 12. 协议冻结要求

这是整个迁移最关键的前置步骤。

在迁移 PR 进入“替换主链路”之前，以下协议必须先冻结：

1. Patch 协议
2. blockId 生成与稳定规则
3. Suggestion 生命周期
4. TipTap editor schema
5. SEO metadata schema
6. Django API DTO
7. Django -> FastAPI 内部接口 DTO

### 12.1 Suggestion 生命周期固定状态

建议至少固定为：

```text
pending
accepted
rejected
edited
expired
failed
```

### 12.2 blockId 规则

固定要求：

1. 所有可被 Patch 命中的 block 必须持有稳定 `blockId`
2. blockId 不能依赖渲染顺序临时生成
3. Patch apply 前必须校验 `content_hash`
4. `editor-protocol` 是 blockId 规则唯一真相源

---

## 13. 分阶段迁移策略

迁移采用 4 个阶段：

| 阶段 | 目标 |
| --- | --- |
| Phase 0 | 冻结协议与迁移骨架 |
| Phase 1 | 建立 Monorepo 目录与 Django 真接口主链路 |
| Phase 2 | 替换 Studio Mock、接通 AI 审核与发布 |
| Phase 3 | 引入 Public Web、补齐 infra、清理旧结构 |

---

## 14. 可执行 PR 拆分

以下 PR 是建议的最小可执行切分。后续 Codex 必须按顺序推进，除非文档先被明确修订。

### PR-00：Monorepo 迁移准备 PR

目标：

1. 新增本蓝图文档
2. 建立迁移 checklist
3. 明确分支策略与切换规则

输出：

- `docs/MONOREPO_MIGRATION_BLUEPRINT.md`
- `docs/IMPLEMENTATION_AUDIT.md`

### PR-01：创建 Monorepo 目标骨架，不迁移业务实现

目标：

1. 新建 `apps/`、`packages/`、`infra/` 目标目录骨架
2. 保持旧目录还可运行
3. 新增工作区说明，不改业务 import

允许变更：

- 目录创建
- README/脚本/工作区配置
- `pnpm-workspace.yaml`

禁止变更：

- 业务逻辑迁移
- 删除旧目录

验收：

- 旧 `docker compose up` 仍可启动
- 文档说明新旧目录并存策略

### PR-02：拆分共享协议包

目标：

1. 创建 `packages/editor-protocol`
2. 创建 `packages/shared-types`
3. 创建 `packages/seo-schema`
4. 把当前 `contracts/` 中可共享协议拆分到包内，同时保留服务契约文件

说明：

- `contracts/openapi.django.yaml`、`contracts/openapi.ai-service.yaml` 仍保留在服务契约层
- JSON Schema 与 TS schema 的对应关系必须记录

验收：

- 协议文件能通过基础校验
- Studio/FastAPI/Django 的协议消费关系文档更新

### PR-03：迁移 FastAPI 到 `apps/ai-service` 目录骨架

目标：

1. 把 `ai_service/` 重组到 `apps/ai-service/`
2. 不要求立刻补完真实 Provider
3. 先完成路径、测试、运行入口迁移

要求：

- 不改变现有路由对外行为
- 仅做目录级重组 + import 修复

验收：

- `curl -s http://127.0.0.1:8002/health`
- `docker compose exec -T ai-service pytest`

### PR-04：迁移 Next.js 到 `apps/studio-web` 目录骨架

目标：

1. 把 `editor-web/` 平移为 `apps/studio-web/`
2. 保持现有 Studio 壳层和 Mock 仍可运行
3. 为后续 FSD 重构留出空间

验收：

- `npm run lint`
- `npm run test`
- `npm run build`

### PR-05：迁移 Django 外层工程到 `apps/cms-api`

目标：

1. 把 `manage.py`、`config/`、`templates/`、`static/`、现有 Django apps 放入 `apps/cms-api`
2. 暂不强拆 `simple_cms`
3. 先完成运行路径与 Docker 适配

验收：

- `docker compose exec -T web python manage.py check`
- `docker compose exec -T web python manage.py test`

### PR-06：建立 Django 新业务 app 骨架

目标：

1. 在 `apps/cms-api/apps/` 下创建目标 app：`articles`、`seo`、`ai_reviews`、`faq`、`analytics`、`knowledge`、`publishing`、`common`
2. 仅建立包结构和基础注册
3. 暂不大规模搬模型

验收：

- Django 可启动
- 不引入 import 循环

### PR-07：拆分 `simple_cms` 第一批模型

目标：

1. 把 `Article`、`Category`、`Tag`、`ArticleRevision`、`ArticleSlugHistory` 迁入 `articles`
2. 把 `SeoMetadata` 迁入 `seo`
3. 把 `FaqItem` 迁入 `faq`
4. 先保留旧 import 兼容层

关键要求：

- 尽量不改数据库表名
- 必要时用 `db_table` 保持兼容

验收：

- Django 迁移检查
- 现有测试通过或有充分重写说明

### PR-08：拆分知识检索模型与服务

目标：

1. 把 `KnowledgeSource`、`KnowledgeChunk` 迁入 `knowledge`
2. 把相关命令和 service 迁入新 app
3. 保持 `rebuild_knowledge_index`、`rag_query` 可运行

验收：

- `docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run`
- `docker compose exec -T web python manage.py rag_query "测试查询" --limit 5`

### PR-09：新增 `ai_reviews` Django ORM 模型

目标：

1. 新增 `AiReviewRun`
2. 新增 `AiSuggestion`
3. 新增 `AiPatch`
4. 固定状态枚举和 patch 结构

说明：

- 这是替换 Mock AI 主链路的前置条件

验收：

- 迁移可执行
- 模型测试通过

### PR-10：实现 Django 文章 CRUD API

目标：

1. 实现 `/api/articles/`
2. 实现 `/api/articles/{id}/`
3. 让 Django 变成 Studio 文章主流程真相源

说明：

- 此 PR 不处理 AI 审核和发布

验收：

- 接口测试
- Studio 仍可先不切换

### PR-11：实现 Django AI 审核 API 与 FastAPI 落库整合

目标：

1. 实现 `/api/articles/{id}/ai-review/`
2. 实现 `/api/articles/{id}/ai-review-runs/`
3. 实现 `/api/ai-review-runs/{run_id}/suggestions/`
4. Django 调 FastAPI 并落库

验收：

- FastAPI contract test
- Django API test

### PR-12：实现建议接受/拒绝 API

目标：

1. 实现 `/api/ai-suggestions/{id}/accept/`
2. 实现 `/api/ai-suggestions/{id}/reject/`
3. 落地 suggestion lifecycle

验收：

- 状态流测试
- Patch 校验测试

### PR-13：Studio 切换到 Django 真文章 API

目标：

1. Studio 不再依赖 `/api/articles` Mock Route
2. `fetchArticles/fetchArticle/updateArticleDraft` 接入 Django API
3. 暂保留 Mock Session

验收：

- Studio 页面可读写真数据
- Mock article route 标记为待删除

### PR-14：Studio 切换到 Django AI 审核接口

目标：

1. 接入真实 AI review run 和 suggestion 列表
2. 删除静态建议块主职责
3. 仍可暂不完成 TipTap diff

验收：

- 可触发审核
- 可展示真实建议

### PR-15：引入 TipTap 真编辑器与 editor-protocol

目标：

1. 替换当前文本域编辑器
2. 以 `content_json` 为真相源
3. 落地 blockId、patch 校验、diff apply

说明：

- 这是最复杂的单点，必须单独 PR 或拆成子 PR

验收：

- `content_json` 保存
- patch 冲突校验
- 基础编辑流程测试

### PR-16：实现发布前检查与发布 API

目标：

1. `/api/articles/{id}/seo-check/`
2. `/api/articles/{id}/publish/`
3. Error / Warning / Passed 三态

验收：

- API 测试
- 发布状态回归

### PR-17：创建 `apps/public-web` 骨架

目标：

1. 新建独立 `public-web`
2. 先接 CMS API 和 SEO schema
3. 不立即替换所有 Django 公开页

验收：

- public-web 能获取真实文章数据并渲染至少一个详情页

### PR-18：补齐 `analytics` 领域

目标：

1. 新增 `AnalyticsSnapshot`
2. 实现 `/api/articles/{id}/analytics/`
3. 实现 `/api/dashboard/seo-summary/`

验收：

- Django API 测试
- Studio 监控页接真数据

### PR-19：引入真实 Django Session，删除 Mock Session 主链路

目标：

1. Studio 接真实登录态
2. 删除 `/api/mock/session`、`/api/mock/logout` 主职责
3. 更新布局鉴权

验收：

- 登录保护正常
- Mock Session 仅保留调试开关或彻底删除

### PR-20：补齐真实 AI Provider 与异步任务

目标：

1. 完成真实 LLM provider
2. 引入 celery/worker 或等价任务系统
3. 处理 AI 审核、RAG 重建、监控同步

验收：

- Provider 集成测试
- worker 真实消费验证

### PR-21：清理旧结构与最终 cutover

目标：

1. 删除旧 `editor-web`、旧 `ai_service`、旧顶层 Django 布局兼容残留
2. 明确 `public-web` 是否接管公开站
3. 文档、CI、Docker、部署路径统一

验收：

- 全仓路径无旧主链路依赖
- 全部关键命令更新

---

## 15. 每个 PR 的统一验收模板

后续 Codex 实施每个 PR 时，必须在 PR 描述中提供以下结构：

### 15.1 变更范围

- 本次只处理什么
- 本次明确不处理什么

### 15.2 契约影响

- 是否修改 `contracts/`
- 是否修改 `editor-protocol`
- 是否新增共享类型

### 15.3 兼容层说明

- 哪些旧路径仍保留
- 后续哪个 PR 删除

### 15.4 真实验证命令

最少包含与本 PR 相关的真实命令结果，例如：

```bash
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py test
curl -s http://127.0.0.1:8001/api/health/
curl -s http://127.0.0.1:8002/health
cd apps/studio-web && npm run lint
cd apps/studio-web && npm run test
cd apps/studio-web && npm run build
```

---

## 16. Codex 实施协议

这是给后续 Code Agent 的硬性执行规则。

### 16.1 开始任何迁移 PR 前必须阅读

1. `AGENTS.md`
2. `docs/MONOREPO_MIGRATION_BLUEPRINT.md`
3. `docs/IMPLEMENTATION_AUDIT.md`
4. `docs/ARCHITECTURE_BOUNDARIES.md`
5. `docs/INTERFACE_CONTRACTS.md`

### 16.2 迁移时必须遵守

1. 一次只实现本蓝图中的一个 PR。
2. 不得顺手做额外重构。
3. 不得提前删除仍在被运行路径依赖的 Mock 或兼容层。
4. 每次修改后必须跑最小回归测试。
5. 每个迁移 PR 都必须更新本蓝图中的状态区或对应跟踪文档。

### 16.3 遇到以下情况必须停下

1. 需要破坏性契约变更
2. 需要同时跨 3 个以上运行时做不兼容调整
3. 不确定 `public-web` 是否立即接管生产公开站
4. 数据表迁移会改变现有表名且无法无损兼容

---

## 17. 迁移期间的兼容策略

### 17.1 目录兼容

在最终 cutover 前，可以存在：

- 新目录：`apps/cms-api`、`apps/ai-service`、`apps/studio-web`
- 旧目录：顶层 Django、`ai_service`、`editor-web`

但必须满足：

1. 新旧职责不能长期双写
2. 每个兼容层都有明确删除 PR 编号

### 17.2 数据兼容

迁移 Django app 时优先采用：

- 保持原表名
- 保持主键不变
- 用 `db_table` 保持兼容
- 用 import shim 过渡

### 17.3 API 兼容

在 Studio 切真接口前：

- Mock API 可以保留
- 但必须和 Django DTO 对齐

在 Studio 切真接口后：

- Mock API 只能保留为开发 fixture
- 不能继续承担主链路职责

---

## 18. 最终完成标准

满足以下条件，才算 Monorepo 架构迁移完成：

1. 目录结构迁移到目标 `apps/ + packages/ + infra/`
2. Django 已位于 `apps/cms-api`
3. FastAPI 已位于 `apps/ai-service`
4. Studio 已位于 `apps/studio-web`
5. `public-web` 已建立并完成是否接管公开站的决策
6. `editor-protocol` 成为 Patch / blockId / suggestion 协议唯一真相源
7. Studio 主链路不再依赖 Mock Session / Mock Article API
8. Django 公开 API 补齐文章、AI 审核、发布、Analytics 主流程
9. FastAPI 真实 Provider 与异步任务可运行
10. 文档、CI、Docker、部署路径全部更新

---

## 19. 当前建议

基于当前仓库现状，最正确的下一步不是立即搬目录，而是：

1. 接受本蓝图作为迁移执行准则
2. 先从 `PR-01` 和 `PR-02` 开始
3. 在 `PR-09` 之前不要删除 Studio Mock 主链路
4. 在 `PR-15` 之前不要做 TipTap 大改

---

## 20. 一句话执行摘要

```text
先冻结协议，再搭 Monorepo 骨架；先让 Django 成为真实 API 真相源，再替换 Studio 的 Mock 主链路；最后再引入 public-web 和清理旧结构。
```
