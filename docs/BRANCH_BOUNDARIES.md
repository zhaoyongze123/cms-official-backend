# 分支责任边界

更新时间：2026-05-09

本文档定义多分支并行开发时每个分支的责任边界。所有功能分支必须从 `develop` 切出，并按本文档限定写入范围。

## 1. 分支树

```text
main
  └── develop
        ├── feature/platform-foundation
        ├── feature/contracts-v1
        ├── feature/django-content-seo-models
        ├── feature/django-seo-renderer
        ├── feature/fastapi-langgraph-ai-service
        ├── feature/rag-pgvector
        ├── feature/django-ai-review-models
        ├── feature/nextjs-studio-shell
        ├── feature/tiptap-editor-basic
        ├── feature/tiptap-diff-editor
        ├── feature/publish-flow
        ├── feature/analytics-monitoring
        └── feature/e2e-integration
```

契约变更分支：

```text
contract-change/<topic>
```

## 2. 分支写入范围

| 分支 | 允许修改 | 禁止修改 |
| --- | --- | --- |
| `feature/platform-foundation` | `docker-compose.yml`、基础配置、服务骨架、健康检查 | 业务模型、AI 业务逻辑、复杂 UI |
| `feature/contracts-v1` | `contracts/`、契约说明文档、Mock 示例 | Django/FastAPI/Next.js 实现 |
| `feature/django-content-seo-models` | Django 模型、迁移、Admin、模型测试 | FastAPI、Next.js |
| `feature/django-seo-renderer` | SEO service、模板、Sitemap、Schema、页面测试 | AI 生成逻辑、TipTap 编辑器 |
| `feature/fastapi-langgraph-ai-service` | `apps/ai-service/`、兼容层 `ai_service/`、Provider、LangGraph、pytest | Django 模型、Next.js UI |
| `feature/rag-pgvector` | RAG 模型、Indexer、Retriever、pgvector 配置、命令 | Next.js UI、TipTap Diff |
| `feature/django-ai-review-models` | AiReviewRun、AiSuggestion、AiPatch、DRF API、Mock AI Client | FastAPI 内部实现、Next.js UI |
| `feature/nextjs-studio-shell` | `apps/studio-web/` shell、兼容层 `editor-web/`、路由、API client、Mock 数据 | Django 模型、FastAPI |
| `feature/tiptap-editor-basic` | TipTap 文档结构、blockId、保存逻辑 | AI Provider、RAG |
| `feature/tiptap-diff-editor` | Diff Decoration、Accept/Reject UI、Patch apply | Django 落库规则、FastAPI Patch 生成 |
| `feature/publish-flow` | 发布检查、发布 API、发布按钮串联 | AI Review Graph、RAG 索引 |
| `feature/analytics-monitoring` | AnalyticsSnapshot、Mock GSC/GA4、Dashboard | TipTap Patch、AI Provider |
| `feature/e2e-integration` | 联调脚本、E2E 测试、少量 glue code | 大规模重构 |

## 3. 跨分支共享文件规则

共享文件包括：

| 文件 | 规则 |
| --- | --- |
| `contracts/*` | 只能由 `feature/contracts-v1` 或 `contract-change/*` 修改 |
| `docker-compose.yml` | 平台分支主责，其他分支需要改时必须说明原因 |
| `.env.example` | 平台分支主责，新增环境变量必须同步文档 |
| `README.md` | 涉及启动和验收时可改，但必须避免覆盖他人内容 |
| `docs/*` | 可追加，不得删除其他分支的验收记录 |

## 4. 分支验收标准

每个分支必须满足：

- 不破坏 `develop`。
- 有测试或明确说明为什么本次只需文档校验。
- 按 `contracts/` 返回字段。
- 有 Mock 或 Stub。
- 有迁移时必须验证 `migrate`。
- 有 API 时必须更新 OpenAPI。
- 有前端页面时必须能本地访问。
- PR 描述包含真实命令结果。

## 5. 冲突处理

发生冲突时按优先级处理：

```text
contracts/ > docs/ARCHITECTURE_BOUNDARIES.md > docs/INTERFACE_CONTRACTS.md > 模块实现
```

如果实现和契约不一致，修改实现，不直接改契约。
