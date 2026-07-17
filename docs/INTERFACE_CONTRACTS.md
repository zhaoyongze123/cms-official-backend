# 模块接口契约

更新时间：2026-05-09

本文档定义必须先冻结的接口契约。并行开发只能依赖本文档和 `contracts/` 文件，不允许口头约定字段。

## 1. 契约冻结范围

| 编号 | 契约 | 文件 |
| --- | --- | --- |
| C01 | Django ↔ Next.js API | `contracts/openapi.django.yaml` |
| C02 | Django ↔ FastAPI API | `contracts/openapi.ai-service.yaml` |
| C03 | Article Schema | `contracts/article.schema.json` |
| C04 | AiReview Schema | `contracts/ai-review.schema.json` |
| C05 | AiSuggestion Schema | `contracts/ai-suggestion.schema.json` |
| C06 | AiPatch Schema | `contracts/ai-patch.schema.json` |
| C07 | TipTap Document Schema | `contracts/tiptap-document.schema.json` |
| C08 | RAG Search Schema | `contracts/rag-search.schema.json` |
| C09 | SEO Context Schema | `contracts/seo-context.schema.json` |

## 2. 版本规则

| 字段 | 固定值 |
| --- | --- |
| `api_version` | `v1` |
| `patch_schema_version` | `v1` |
| `tiptap_schema_version` | `v1` |
| `rag_schema_version` | `v1` |
| `seo_context_schema_version` | `v1` |

任何破坏性字段变更必须升级版本，并通过 `contract-change/*` 分支完成。

## 3. Django ↔ Next.js API

Next.js 只能调用 Django API。

必须冻结的接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/articles/` | 文章列表 |
| `POST` | `/api/articles/` | 新建文章 |
| `GET` | `/api/articles/{id}/` | 文章详情 |
| `PATCH` | `/api/articles/{id}/` | 保存草稿或编辑 |
| `GET` | `/api/ai/settings/generation/` | 获取四项生成模型、API Key 状态与 Prompt 配置 |
| `PATCH` | `/api/ai/settings/generation/` | 更新四项生成模型、API Key 与 Prompt 配置 |
| `GET` | `/api/public/articles/` | 公开已发布文章列表 |
| `GET` | `/api/public/articles/{slug}/` | 公开已发布文章详情 |
| `GET` | `/api/public/wechat/js-config/` | 获取微信公众号网页 JS-SDK 签名配置 |
| `POST` | `/api/articles/{id}/ai-review/` | 触发 AI 审核 |
| `GET` | `/api/articles/{id}/ai-review-runs/` | 审核运行历史 |
| `GET` | `/api/ai-review-runs/{run_id}/suggestions/` | 获取建议 |
| `POST` | `/api/ai-suggestions/{id}/accept/` | 接受建议 |
| `POST` | `/api/ai-suggestions/{id}/reject/` | 拒绝建议 |
| `POST` | `/api/articles/{id}/publish/` | 发布文章 |
| `POST` | `/api/articles/{id}/seo-check/` | 发布前检查 |
| `GET` | `/api/articles/{id}/analytics/` | 单篇监控 |
| `GET` | `/api/dashboard/seo-summary/` | SEO 总览 |

Analytics 当前已落定的返回结构：

| 接口 | 关键字段 |
| --- | --- |
| `/api/articles/{id}/analytics/` | `article`、`latest_snapshot`、`snapshots[]` |
| `/api/dashboard/seo-summary/` | `totals`、`performance`、`top_articles[]` |

`GET/PATCH /api/articles/{id}/` 当前用于编辑态回显与保存的扩展字段：

| 字段 | 说明 |
| --- | --- |
| `seo.meta_title` | 编辑态 Meta Title |
| `seo.meta_description` | 编辑态 Meta Description |
| `seo.meta_keywords` | 编辑态 Meta Keywords |
| `seo.canonical_url` | 编辑态 Canonical |
| `seo.robots` | 编辑态 Robots |
| `seo.og_title` | 编辑态 OG 标题 |
| `seo.og_description` | 编辑态 OG 描述 |
| `seo.og_image` | 编辑态 OG 图片对象，包含 `image_id/title/alt_text/file_url` |
| `faq_items[]` | FAQ 真相源列表，包含 `question/answer/sort_order` |

`/api/articles/{id}/analytics/` 中 `latest_snapshot` 与 `snapshots[]` 当前包含：

| 字段 | 说明 |
| --- | --- |
| `snapshot_id` | 快照主键 |
| `snapshot_date` | 快照日期 |
| `source` | 数据来源标识 |
| `impressions` | 曝光量 |
| `clicks` | 点击量 |
| `average_position` | 平均排名 |
| `ctr` | 点击率，0-1 浮点 |
| `sessions` | 会话数 |
| `users` | 用户数 |
| `bounce_rate` | 跳出率，0-1 浮点 |
| `avg_engagement_seconds` | 平均参与时长（秒） |
| `conversions` | 转化数 |
| `notes` | 备注 |
| `updated_at` | 快照更新时间 |

`/api/dashboard/seo-summary/` 当前聚合字段：

| 字段 | 说明 |
| --- | --- |
| `totals.total_articles` | 文章总数 |
| `totals.published_articles` | 已发布文章数 |
| `totals.draft_articles` | 草稿文章数 |
| `totals.archived_articles` | 已归档文章数 |
| `totals.articles_with_seo_metadata` | 存在 `SeoMetadata` 的文章数 |
| `totals.articles_with_faq` | 存在 FAQ 的文章数 |
| `totals.articles_with_analytics` | 存在 `AnalyticsSnapshot` 的文章数 |
| `performance.*` | 基于每篇文章最新快照的聚合性能指标 |
| `top_articles[]` | 按最新快照曝光量倒序的文章列表 |

公开文章接口当前已对 public-web 暴露以下 SEO 字段：

| 字段 | 说明 |
| --- | --- |
| `seo.meta_title` | 公开 Meta Title |
| `seo.meta_description` | 公开 Meta Description |
| `seo.canonical_url` | Canonical URL |
| `seo.robots` | Robots 指令 |
| `seo.og_title` | OG 标题 |
| `seo.og_description` | OG 描述 |
| `seo.og_image_url` | OG 图片地址 |
| `seo_payload.canonical_url_resolved` | Django 回退后的最终 Canonical |
| `seo_payload.faq_items` | FAQ 真相源条目 |
| `seo_payload.json_ld.breadcrumb` | BreadcrumbList 结构化数据 |
| `seo_payload.json_ld.faq` | FAQPage 结构化数据 |

## 4. Django ↔ FastAPI API

Django 是 FastAPI 的唯一调用方。

必须冻结的接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/internal/ai/review-article` | 完整文章审核 |
| `POST` | `/internal/ai/generate-metadata` | 生成 SEO Metadata |
| `POST` | `/internal/ai/generate-faq` | 生成 FAQ |
| `POST` | `/internal/ai/recommend-internal-links` | 推荐内链 |
| `POST` | `/internal/ai/generate-alt` | 生成图片 Alt |
| `POST` | `/internal/rag/reindex-article` | 重建文章索引 |
| `POST` | `/internal/rag/search` | RAG 检索 |
| `GET` | `/health` | 健康检查 |

内部接口必须包含：

| 项 | 要求 |
| --- | --- |
| 鉴权 | `X-Internal-Token` |
| 超时 | Django 调用默认 60 秒，长任务改异步 |
| 错误结构 | 统一 `error.code`、`error.message`、`error.details` |
| Trace | 每次返回 `trace_id` |
| Mock | FastAPI 必须支持 Mock Provider |

## 5. AiSuggestion / AiPatch

AiSuggestion 是 AI 建议的审核单位，AiPatch 是编辑器可应用的修改单位。

核心结构：

```json
{
  "suggestion_id": "sug_123",
  "schema_version": "v1",
  "type": "body_replace",
  "status": "pending",
  "severity": "medium",
  "title": "优化表达",
  "reason": "原句过于笼统",
  "patches": [
    {
      "patch_id": "patch_123",
      "patch_schema_version": "v1",
      "operation": "replace_text",
      "target_block_id": "blk_abc",
      "old_text": "SEO很重要",
      "new_text": "SEO是提升搜索曝光、点击率和转化的重要基础能力",
      "content_hash": "sha256:..."
    }
  ],
  "source_chunks": []
}
```

状态枚举固定：

```text
pending
accepted
rejected
edited
expired
failed
```

## 6. TipTap content_json

文章正文固定为：

```text
content_json：TipTap JSON，编辑真相
content_html：渲染 HTML 缓存
```

每个可被 AI Patch 的 block 必须包含：

```json
{
  "attrs": {
    "blockId": "blk_xxx"
  }
}
```

第一版支持 AI Patch 的节点：

| Node | 支持操作 |
| --- | --- |
| `paragraph` | insert_after、delete、replace_text |
| `heading` | insert_after、replace_text |
| `bulletList` | insert_after |
| `orderedList` | insert_after |
| `image` | alt_text |

## 7. RAG Search

RAG 检索返回结构固定：

```json
{
  "rag_schema_version": "v1",
  "query": "Schema 是什么",
  "chunks": [
    {
      "chunk_id": "chk_123",
      "source_type": "article",
      "source_id": 88,
      "title": "什么是 Schema",
      "url": "/blog/schema-guide/",
      "text": "Schema 是结构化数据...",
      "score": 0.83
    }
  ]
}
```

内链推荐只能使用 `source_type=article` 且已发布的结果。

## 8. SEO Context

SEO Context 返回结构固定：

```json
{
  "seo_context_schema_version": "v1",
  "title": "...",
  "description": "...",
  "canonical": "...",
  "robots": "index,follow",
  "og": {
    "title": "...",
    "description": "...",
    "image": "...",
    "url": "...",
    "type": "article"
  },
  "json_ld": [
    { "@type": "Article" },
    { "@type": "FAQPage" },
    { "@type": "BreadcrumbList" }
  ]
}
```

模板、预览、测试都只能消费该结构，不允许各自重新拼 SEO 字段。

## 9. 契约变更流程

```text
新建 contract-change/<topic>
修改 contracts/
更新 Mock 示例
更新本文件
运行契约校验
合入 develop
通知所有功能分支 rebase
```
