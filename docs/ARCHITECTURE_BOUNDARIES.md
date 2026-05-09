# 总架构边界

更新时间：2026-05-09

本文档定义 AI Native SEO Publishing OS 的模块边界。所有并行开发必须以本文档为准，避免不同代理重复建设或跨边界修改。

## 1. 总体原则

```text
Django 是业务真相
FastAPI 是 AI 大脑
Next.js 是编辑体验
PostgreSQL 是统一数据底座
contracts 是跨模块共同语言
```

底座完成后，必须先冻结边界和契约，再进入并行开发。

## 2. 系统边界

| 系统 | 负责 | 不负责 |
| --- | --- | --- |
| Django CMS | 内容、权限、发布状态、SEO 渲染、API、数据落库 | LangGraph 推理、TipTap UI、AI Patch 生成 |
| FastAPI AI/RAG Service | AI 调用、LangGraph、RAG 检索、建议生成、Patch 生成 | 发布文章、权限判定、直接给前端服务 |
| Next.js Studio | 运营工作台、TipTap 编辑器、AI Diff 展示、发布操作入口 | 直接改数据库、直接调 FastAPI、生成最终 SEO 技术标签 |
| PostgreSQL + pgvector | 业务数据、向量数据、AI 建议、监控快照 | 业务逻辑判断 |
| Redis / Worker | 异步任务、缓存、队列 | 持久业务真相 |
| contracts | API、Schema、Mock 示例、错误结构 | 业务实现 |

## 3. 数据主权

| 数据 | 真相源 | 写入方 | 读取方 |
| --- | --- | --- | --- |
| Article | Django | Django API / Admin | Next.js、FastAPI |
| content_json | Django | Next.js 经 Django API 保存 | FastAPI、Next.js |
| SeoMetadata | Django | Django API / Admin / AI 建议接受 | 模板、Next.js |
| AiReviewRun | Django | Django | Next.js |
| AiSuggestion | Django | Django 接收 FastAPI 输出后落库 | Next.js |
| AiPatch | Django | Django 接收 FastAPI 输出后落库 | Next.js TipTap |
| KnowledgeChunk | Django 或 RAG Worker | RAG Indexer | FastAPI Retriever |
| AnalyticsSnapshot | Django | Analytics Worker | Next.js |

FastAPI 不能直接写 Article、SeoMetadata、AiSuggestion、AiPatch。FastAPI 只返回结构化结果，由 Django 校验后落库。

## 4. 调用方向

允许的调用方向：

```text
Next.js -> Django REST API
Django -> FastAPI Internal API
Django / FastAPI -> PostgreSQL
Worker -> Django ORM / 外部统计 API
```

禁止的调用方向：

```text
Next.js -> FastAPI Internal API
FastAPI -> Next.js
FastAPI -> Django 公开前端页面
Next.js -> PostgreSQL
```

## 5. 权限边界

| 操作 | 权限判断位置 |
| --- | --- |
| 查看文章列表 | Django |
| 保存草稿 | Django |
| 触发 AI 审核 | Django |
| 接受建议 | Django |
| 拒绝建议 | Django |
| 发布文章 | Django |
| 查看 Analytics | Django |
| 调用硅基流动 | FastAPI |

FastAPI 只验证内部调用 Token，不判断运营用户权限。

## 6. SEO 技术边界

| 能力 | 生成方 | 原因 |
| --- | --- | --- |
| Meta Title 建议 | FastAPI | 内容建议 |
| Meta Description 建议 | FastAPI | 内容建议 |
| Canonical 最终值 | Django | 技术 SEO 必须确定 |
| JSON-LD 最终结构 | Django | 避免 AI 生成错误结构 |
| Sitemap | Django | 发布状态和 URL 由 Django 掌握 |
| OG / Twitter Tags | Django | 与 SeoMetadata 和页面 URL 绑定 |
| TOC | Django 或 Next.js 渲染后回写 | 依赖正文结构 |

AI 只提供可审核内容建议，不输出最终技术 SEO 代码。

## 7. Patch 边界

Patch 从 FastAPI 生成，经 Django 校验和落库，由 Next.js TipTap 展示和应用。

必须固定的字段：

| 字段 | 用途 |
| --- | --- |
| `patch_schema_version` | 协议版本 |
| `target_block_id` | 定位 TipTap block |
| `content_hash` | 冲突检测 |
| `operation` | Patch 操作 |
| `old_text` | 替换和删除校验 |
| `new_text` | 新内容 |

没有 `blockId` 或 `content_hash` 的正文 Patch 不允许应用。

## 8. 跨边界变更流程

任何跨边界变更必须按以下顺序执行：

```text
提出 contract-change/*
修改 contracts/
更新 Mock 示例
更新对应文档
契约校验通过
合入 develop
各功能分支 rebase develop
再修改实现
```
