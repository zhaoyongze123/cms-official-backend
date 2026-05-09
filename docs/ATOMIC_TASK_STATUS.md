# 原子任务状态

更新时间：2026-05-09

本文档用于维护可并行开发的原子任务状态。任何代理领取任务前必须检查本文件，避免重复实现或跨边界修改。

## 1. 状态定义

| 状态 | 含义 |
| --- | --- |
| `TODO` | 未开始 |
| `IN_PROGRESS` | 正在开发 |
| `BLOCKED` | 被明确阻塞 |
| `REVIEW` | 已提交 PR，等待 Review |
| `DONE` | 已合入 develop 并通过验收 |

## 2. 原子任务表

| ID | 状态 | 分支 | 责任范围 | 依赖 | 验收摘要 |
| --- | --- | --- | --- | --- | --- |
| A00 | DONE | `feature/platform-foundation` | Docker Compose、Django health、FastAPI health、Next.js shell、Redis、Postgres、基础环境变量 | 无 | 2026-05-09 已验证 `docker compose ps` 三端健康、Django `check/test` 通过、`/api/health/`、`/health`、`/studio/articles` 返回成功 |
| A01 | DONE | `feature/contracts-v1` | OpenAPI、JSON Schema、Mock 示例、错误结构 | A00 | 2026-05-09 已完成 `contracts/` JSON Schema 校验、OpenAPI YAML 解析、契约边界文档落库 |
| A02 | TODO | `feature/django-content-seo-models` | Tag、SeoMetadata、FaqItem、Media Alt、Article content_json 字段 | A01 | 迁移和模型测试通过 |
| A03 | TODO | `feature/django-seo-renderer` | SEO Context、Schema、OG、Canonical、TOC、Sitemap | A02 | curl 可验证 SEO 输出 |
| A04 | TODO | `feature/fastapi-langgraph-ai-service` | FastAPI 骨架、Mock Provider、SiliconFlow Provider、LangGraph Review Graph | A01 | FastAPI 测试通过 |
| A05 | TODO | `feature/rag-pgvector` | pgvector、KnowledgeSource、KnowledgeChunk、Indexer、Retriever、Rerank | A02 | RAG 命令可检索 |
| A06 | TODO | `feature/django-ai-review-models` | AiReviewRun、AiSuggestion、AiPatch、Suggestion API、Mock AI Client | A01、A02 | DRF API 测试通过 |
| A07 | TODO | `feature/nextjs-studio-shell` | Next.js Studio、登录态、文章列表、文章编辑基础页、Mock API | A01 | 本地页面可访问 |
| A08 | TODO | `feature/tiptap-editor-basic` | TipTap 文档结构、blockId、content_json 保存、content_html 渲染 | A01、A07 | 编辑保存刷新正常 |
| A09 | TODO | `feature/tiptap-diff-editor` | AI Diff 渲染、Accept、Reject、编辑后接受、content_hash 冲突 | A06、A08 | Patch UI 验收通过 |
| A10 | TODO | `feature/publish-flow` | 发布前检查、发布 API、Error 阻断、Warning 提示 | A03、A06、A09 | 发布流程可跑通 |
| A11 | TODO | `feature/analytics-monitoring` | AnalyticsSnapshot、GSC/GA4 Stub、站内事件、监控面板 | A07 | 监控面板可显示 mock 数据 |
| A12 | TODO | `feature/e2e-integration` | 三端联调、契约回归、真实流程冒烟 | A03-A11 | E2E 验收通过 |

## 3. 任务领取规则

- 一个分支只负责一个原子任务。
- 如果任务需要改契约，先停止实现，创建 `contract-change/*`。
- 同一个文件被多个任务共享时，以契约文件和边界文档为准。
- 任务进入 `DONE` 前，必须写明真实验收命令和结果。

## 4. 必须卡住的集成字段

| 字段 | 规则 |
| --- | --- |
| `article_id` | 全系统统一使用 Django Article ID |
| `blockId` | 所有正文 Patch 必须基于 TipTap blockId |
| `suggestion_id` | Django 落库后返回给前端 |
| `patch_id` | Django 落库后返回给前端 |
| `content_hash` | Patch 应用前必须校验 |
| `source_chunks` | AI 建议必须保留 RAG 来源 |
| `status` | 使用统一建议状态枚举 |
