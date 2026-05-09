# AI Native SEO Publishing OS 方案设计与实施计划

更新时间：2026-05-09
当前分支：`feature/ai-seo-publishing`
计划状态：待开发
目标状态：完整建设 `Django CMS + FastAPI AI/RAG Service + Next.js TipTap Studio + PostgreSQL pgvector`，形成内容生产、AI 优化、SEO 发布、数据监控闭环。

## 1. 执行规则

### 1.1 本计划的硬性要求

- 本文档是完整实施计划，不再把 FastAPI AI 服务、Next.js Studio、TipTap Diff 编辑器标记为可选或远期设想。
- Django CMS、FastAPI AI/RAG Service、Next.js Studio、PostgreSQL pgvector 都是目标架构的一部分。
- 所有 AI 输出默认是建议，必须经过运营接受或拒绝，不允许直接覆盖正式内容。
- SEO 技术标签、Canonical、Sitemap、JSON-LD、Schema 必须由系统规则生成，不允许由 AI 直接生成最终技术代码。
- 任何真实 API Key 不允许写入 Git、文档、提交信息、PR 描述、测试快照或日志。
- 本地测试必须支持 Mock Provider，不能依赖外网或真实模型调用。

### 1.2 状态流转

| 状态 | 含义 |
| --- | --- |
| `TODO` | 未开始 |
| `IN_PROGRESS` | 正在开发 |
| `BLOCKED` | 被明确问题阻塞，必须写清原因 |
| `DONE` | 已完成并通过验收 |

### 1.3 每个任务完成条件

- 代码、迁移、接口、测试、运维配置和文档同步更新。
- 涉及数据库变更时提交迁移文件，并验证迁移可执行。
- 涉及 AI/RAG 时提供 Mock 路径，并记录 Provider、模型、Prompt 版本和原始响应摘要。
- 涉及前端时完成浏览器验收，至少覆盖桌面和移动端关键页面。
- 涉及发布输出时必须通过真实 HTTP 响应验证 SEO 标签。
- 完成后执行最小回归测试，并把命令和结果写入 PR 描述。

### 1.4 固定验证命令

基础验证：

```bash
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py test
curl -I http://127.0.0.1:8001/
```

涉及迁移时追加：

```bash
docker compose exec -T web python manage.py makemigrations --check --dry-run
docker compose exec -T web python manage.py migrate
```

涉及 SEO 页面输出时追加：

```bash
curl -s http://127.0.0.1:8001/<article-slug>/ | grep -E "canonical|og:title|application/ld\\+json"
curl -I http://127.0.0.1:8001/sitemap.xml
```

涉及 RAG 时追加：

```bash
docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run
docker compose exec -T web python manage.py rag_query "测试查询" --limit 5
```

涉及 FastAPI AI Service 时追加：

```bash
curl -s http://127.0.0.1:8002/health
curl -s http://127.0.0.1:8002/internal/rag/search -H "Content-Type: application/json" -d '{"query":"测试查询","limit":3}'
```

涉及 Next.js Studio 时追加：

```bash
cd editor-web
npm run lint
npm run test
npm run build
```

## 2. 项目背景

当前项目是基于 Django 的 CMS 官网后台，已经具备基础内容发布能力：

| 能力 | 当前状态 |
| --- | --- |
| 文章管理 | 已有 `Article`、`Category`、正文、封面图、状态、定时发布 |
| 发布过滤 | 已有已发布文章过滤、未来发布时间隐藏、草稿详情 404 |
| URL 稳定性 | 已有 slug 历史记录和旧链接 301 |
| 版本快照 | 已有 `ArticleRevision` |
| 后台 | Django Admin + Jazzmin + CKEditor |
| 前台 | 文章列表页、分类页、搜索页、详情页 |
| 本地服务 | Docker Compose，Django 访问端口 `127.0.0.1:8001` |

现有系统的问题是：内容发布仍停留在传统 CMS 阶段，SEO 能力主要依赖人工填写，AI 没有进入编辑工作流，缺少 RAG、结构化建议、Diff 审核、发布前检查和发布后监控。

本项目要升级为：

```text
AI Native SEO Publishing OS
AI 原生 SEO 内容发布系统
```

目标不是增加几个 AI 按钮，而是把文章发布流程升级为完整闭环：

```text
运营写文章
AI 理解公司知识库
AI 生成 SEO 优化建议
AI 在编辑器中以 Diff 展示修改
运营逐条接受或拒绝
系统生成 SEO 技术标签
发布 SEO 优化页面
持续监控页面数据
```

## 3. 产品目标

### 3.1 核心目标

让运营人员即使不懂 SEO，也能发布专业级 SEO 页面。

系统必须自动或半自动完成：

| 能力 | 说明 |
| --- | --- |
| SEO 标题优化 | AI 生成可审核 title 建议，Django 规则落库和渲染 |
| Meta Description | AI 生成描述建议，运营接受后进入 `SeoMetadata` |
| FAQ 生成 | 基于 RAG 生成 FAQ，人工接受后展示并进入 FAQ Schema |
| 内链推荐 | 只推荐真实存在且已发布的站内文章 |
| 图片 Alt | AI 生成 Alt 建议，人工接受后写入媒体库 |
| Schema | Django 规则生成 Article、FAQ、Breadcrumb Schema |
| OG Tags | Django 规则生成 Open Graph 和 Twitter Card |
| Canonical | Django 统一生成，允许人工覆盖 |
| JSON-LD | Django 结构化序列化输出，禁止字符串拼接 |
| TOC | 从正文标题自动生成目录和锚点 |
| Sitemap | 自动输出首页、文章、分类、标签 URL |
| 发布前检查 | 输出 Error、Warning、Passed 三类结果 |
| 发布后监控 | 接入 GSC、GA4、站内点击和 AI 建议采纳率 |

### 3.2 产品定位

本产品不是传统 SEO 检查器。

传统 SEO 工具只告诉用户：

```text
标题太短
缺少关键词
没有内链
```

本系统要做到：

```text
AI 直接进入编辑器，给出可采纳、可拒绝、可追踪来源的修改方案。
```

产品定位：

```text
AI Native CMS + SEO Publishing Workflow
AI 原生内容发布基础设施
```

## 4. 总体架构

### 4.1 三端分工

| 系统 | 角色 | 职责 |
| --- | --- | --- |
| Django CMS | 业务真相源 | 文章、权限、发布、SEO 渲染、API、数据落库 |
| FastAPI AI/RAG Service | AI 大脑 | LangGraph、RAG、硅基流动模型调用、建议生成、Patch 生成 |
| Next.js Studio | 运营工作台 | 写文章、TipTap 编辑、AI Diff、Accept/Reject、发布检查、数据面板 |
| PostgreSQL + pgvector | 数据底座 | 业务数据、SEO 数据、AI 建议、知识切片、向量、监控快照 |
| Redis + Worker | 异步任务 | RAG 重建、Embedding、AI 审核、监控同步 |

一句话架构原则：

```text
Django 是业务真相
FastAPI 是 AI 大脑
Next.js 是编辑体验
PostgreSQL 是统一数据底座
```

### 4.2 总体架构图

```text
┌────────────────────────────────────────────┐
│              Next.js Studio                 │
│                                            │
│  - 文章编辑器                              │
│  - TipTap 富文本编辑                       │
│  - AI Diff 绿色新增/红色删除               │
│  - Accept / Reject                         │
│  - 发布前检查                              │
│  - SEO 监控面板                            │
└──────────────────────┬─────────────────────┘
                       │
                       │ REST API
                       ▼
┌────────────────────────────────────────────┐
│                Django CMS                   │
│                                            │
│  - Article / FAQ / Tags                     │
│  - SeoMetadata                              │
│  - AiReviewRun / AiSuggestion / AiPatch     │
│  - 权限控制                                 │
│  - 发布状态                                 │
│  - SEO HTML 渲染                            │
│  - Sitemap / Canonical / JSON-LD            │
└──────────────────────┬─────────────────────┘
                       │
                       │ Internal API
                       ▼
┌────────────────────────────────────────────┐
│          FastAPI AI/RAG Service             │
│                                            │
│  - LangGraph 工作流                         │
│  - RAG 检索                                 │
│  - FAQ 生成                                 │
│  - 内链推荐                                 │
│  - 正文审核                                 │
│  - Patch 生成                               │
│  - Prompt 版本管理                          │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│          PostgreSQL + pgvector              │
│                                            │
│  - 内容数据                                 │
│  - SEO 数据                                 │
│  - AI 建议数据                              │
│  - Knowledge Chunks                         │
│  - Embeddings                               │
│  - Analytics Snapshot                       │
└────────────────────────────────────────────┘
```

### 4.3 当前仓库到目标架构的迁移原则

| 当前事实 | 目标变化 |
| --- | --- |
| `Article.body` 是 CKEditor HTML | 增加 `content_json` 和 `content_html`，保留 `body` 作为兼容字段直到迁移完成 |
| Django Admin 是主要工作台 | 保留给超级管理员，新增 Next.js Studio 给运营使用 |
| SEO 字段混在 Article | 拆到 `SeoMetadata`，模板只消费 `seo_context` |
| 没有结构化 Tag | 新增 `Tag`，Article 使用 ManyToMany |
| 没有 RAG | 新增 `KnowledgeSource`、`KnowledgeChunk`、pgvector |
| 没有 AI 审核 | 新增 `AiReviewRun`、`AiSuggestion`、`AiPatch` |
| 没有独立 AI 服务 | 新增 `ai_service/` FastAPI + LangGraph |
| 没有前端 Studio | 新增 `editor-web/` Next.js + TipTap |

## 5. 系统职责边界

### 5.1 Django CMS 职责

Django 继续作为主系统，负责所有核心业务数据和最终发布逻辑。

| 模块 | 职责 |
| --- | --- |
| 内容管理 | Article、Category、Tag、FAQ、MediaAsset |
| SEO 管理 | SeoMetadata、SEO Context、Schema、OG、Canonical |
| AI 审核记录 | AiReviewRun、AiSuggestion、AiPatch 状态流转 |
| 权限控制 | 用户、角色、文章权限、建议审核权限 |
| 发布控制 | 草稿、发布、归档、定时发布、发布前检查 |
| 页面渲染 | 公开文章页、分类页、标签页、Sitemap |
| API | 对 Next.js 暴露 REST API，对 FastAPI 调用内部 API |
| 审计 | 文章版本快照、建议采纳记录、Prompt 版本 |

Django 不负责复杂 AI 推理，不在 Django 内实现 LangGraph、多步骤 RAG 编排或大模型 Patch 生成。

### 5.2 FastAPI AI/RAG Service 职责

FastAPI 是独立 AI 服务，只负责 AI 智能计算。

| 模块 | 职责 |
| --- | --- |
| LangGraph | 编排文章审核、metadata、FAQ、内链、Patch 工作流 |
| RAG | 检索公司已有文章、FAQ、产品页、术语库、SEO 规则 |
| Provider | 调用硅基流动 Chat、Embedding、Rerank API |
| Prompt | Prompt 模板、版本、变量注入、输出约束 |
| Patch | 生成结构化正文修改建议，验证可应用性 |
| 输出验证 | JSON Schema 校验、来源引用校验、安全校验 |

FastAPI 不直接发布文章，不修改文章状态，不绕过 Django 权限，不生成最终技术 SEO 标签。

### 5.3 Next.js Studio 职责

Next.js 是运营人员真正使用的内部工作台，不是公开前台页面。

| 模块 | 职责 |
| --- | --- |
| 文章列表 | 查询、筛选、草稿、发布状态 |
| 文章编辑 | Title、Summary、Slug、Tags、封面、正文 |
| TipTap 编辑器 | 结构化富文本、blockId、content_json |
| AI 审核 | 触发审核、查看运行状态、展示建议 |
| Diff 体验 | 绿色新增、红色删除、替换展示 |
| 建议处理 | Accept、Reject、编辑后接受 |
| 发布前检查 | 展示 Error、Warning、Passed |
| 数据监控 | 展示 GSC、GA4、站内指标、AI 采纳率 |

Django Admin 保留给超级管理员，Next.js Studio 给日常运营使用。

## 6. 硅基流动模型与安全配置

### 6.1 配置原则

- 明文 API Key 只能放在本地 `.env` 或部署平台 Secret 中。
- 文档、Git、测试日志、PR 描述禁止出现真实 Key。
- 如果 API Key 已在聊天、日志或公开渠道出现，必须在硅基流动控制台轮换。
- 所有真实调用必须记录 `provider`、`model`、`prompt_version`、`trace_id`、`token_usage`。

### 6.2 环境变量

```env
AI_PROVIDER=siliconflow
AI_MOCK_ENABLED=true
AI_PROMPT_VERSION=v1

SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_API_KEY=
SILICONFLOW_CHAT_MODEL=Pro/zai-org/GLM-4.7
SILICONFLOW_FAST_MODEL=Qwen/Qwen3-32B
SILICONFLOW_EMBEDDING_MODEL=Qwen/Qwen3-Embedding-4B
SILICONFLOW_EMBEDDING_DIMENSIONS=1536
SILICONFLOW_RERANK_MODEL=BAAI/bge-reranker-v2-m3
```

### 6.3 官方接口依据

| 能力 | 接口 | 文档 |
| --- | --- | --- |
| 模型列表 | `GET /v1/models` | [SiliconFlow List Models](https://docs.siliconflow.cn/en/api-reference/models/get-model-list) |
| Chat | `POST /v1/chat/completions` | [SiliconFlow Chat Completions](https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions) |
| Embedding | `POST /v1/embeddings` | [SiliconFlow Create Embeddings](https://docs.siliconflow.cn/en/api-reference/embeddings/create-embeddings) |
| Rerank | `POST /v1/rerank` | [SiliconFlow Create Rerank](https://docs.siliconflow.cn/en/api-reference/rerank/create-rerank) |

官方文档说明模型会周期性上下线或能力调整，所以生产代码必须支持通过配置切换模型，并通过 `/v1/models` 做启动前或运维验证。

### 6.4 配置验证命令

```bash
curl -sS \
  -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  "$SILICONFLOW_BASE_URL/models?sub_type=chat"

curl -sS \
  -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen3-Embedding-4B","input":"SEO 测试文本","dimensions":1536}' \
  "$SILICONFLOW_BASE_URL/embeddings"

curl -sS \
  -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"BAAI/bge-reranker-v2-m3","query":"SEO","documents":["SEO 内容优化","无关文本"],"top_n":2,"return_documents":true}' \
  "$SILICONFLOW_BASE_URL/rerank"
```

## 7. 核心业务流程

### 7.1 文章创建流程

```text
运营进入 Next.js Studio
点击新建文章
填写 Title / Summary / Content
TipTap 生成 content_json 和 content_html
Next.js 调用 Django API 保存草稿
Django 创建 Article 和版本快照
Django 返回文章 ID
进入编辑器页面
```

### 7.2 AI 审核流程

```text
运营点击 AI 审核
Next.js 调用 Django API
Django 校验权限
Django 创建 AiReviewRun
Django 调用 FastAPI Internal API
FastAPI 执行 LangGraph 工作流
RAG 检索相关知识
AI 生成 FAQ / 内链 / Patch / SEO 建议
FastAPI 返回结构化结果
Django 校验并落库 AiSuggestion / AiPatch
Next.js 获取建议
编辑器展示绿色新增 / 红色删除
```

### 7.3 接受 AI 建议流程

```text
运营点击 Accept
Next.js 调用 Django API
Django 校验权限、建议状态、content_hash
Django 标记建议 accepted
Next.js 在 TipTap 编辑器中 apply patch
Next.js 保存最新 content_json / content_html
Django 创建文章版本快照
```

### 7.4 拒绝 AI 建议流程

```text
运营点击 Reject
Next.js 调用 Django API
Django 校验权限
Django 标记建议 rejected
Next.js 移除该建议 Diff 展示
正文保持不变
```

### 7.5 发布流程

```text
运营点击发布
Next.js 调用 Django 发布前检查 API
Django 检查 Title / Description / Slug / FAQ / Alt / Canonical / Schema / 未处理建议
存在 Error 时阻止发布
仅 Warning 时允许继续发布
Django 生成 SEO Metadata / Schema / OG / JSON-LD / Sitemap
Django 文章状态改为 published
前台输出 SEO Optimized HTML
```

### 7.6 发布后监控流程

```text
定时任务拉取 GSC / GA4 / 站内事件
Django 写入 AnalyticsSnapshot
Next.js Studio 展示趋势
系统识别低 CTR / 排名下降 / 高曝光低点击文章
运营发起二次 AI 审核
形成持续优化闭环
```

## 8. LangGraph AI 工作流

### 8.1 Article Review Graph

```text
输入 article_id
load_article_node
clean_content_node
retrieve_context_node
seo_rule_check_node
generate_metadata_node
generate_faq_node
recommend_internal_links_node
generate_semantic_keywords_node
generate_patch_node
validate_patch_node
final_response_node
```

### 8.2 节点职责

| 节点 | 职责 |
| --- | --- |
| `load_article_node` | 从 Django Internal API 读取标题、摘要、正文、标签、分类 |
| `clean_content_node` | 清洗 HTML 或 TipTap JSON，转换为 AI 可理解文本 |
| `retrieve_context_node` | 从 pgvector 检索历史文章、FAQ、产品页、术语库 |
| `seo_rule_check_node` | 规则检查标题、描述、FAQ、内链、Alt、TOC |
| `generate_metadata_node` | 生成 Title、Meta Description、Slug、Tags 建议 |
| `generate_faq_node` | 生成 FAQ 建议，并引用检索来源 |
| `recommend_internal_links_node` | 推荐真实存在的站内文章链接 |
| `generate_semantic_keywords_node` | 生成语义关键词和内容缺口 |
| `generate_patch_node` | 生成正文新增、删除、替换建议 |
| `validate_patch_node` | 验证 Patch 是否可应用，避免错位和无效修改 |
| `final_response_node` | 统一输出 suggestions、patches、usage、trace |

### 8.3 输出结构

FastAPI 必须返回结构化 JSON：

```json
{
  "review_run_id": "run_123",
  "provider": "siliconflow",
  "model": "Pro/zai-org/GLM-4.7",
  "prompt_version": "v1",
  "suggestions": [],
  "patches": [],
  "source_chunks": [],
  "usage": {},
  "trace_id": "..."
}
```

Django 必须再次校验该 JSON，不可信任 AI 服务返回值直接入库。

## 9. RAG 设计

### 9.1 RAG 的作用

RAG 不是为了聊天问答，而是让 AI 知道公司已有内容。

AI 依赖 RAG 完成：

| 能力 | 说明 |
| --- | --- |
| 真实内链 | 只能推荐已发布文章 |
| 避免重复 | 发现已有相似内容 |
| 业务一致 | 保持品牌、术语、服务表达一致 |
| FAQ 生成 | 基于真实业务内容生成问答 |
| 语义关键词 | 补充实体、场景、长尾词 |
| 内容缺口 | 指出当前文章缺少的主题 |

### 9.2 数据源

第一阶段必须接入：

| 来源 | 说明 |
| --- | --- |
| 已发布文章 | 主要 RAG 来源 |
| 草稿文章 | 只在内部审核场景使用，不做内链候选 |
| FAQ | FAQ 内容和问答表达 |
| 分类页 | 栏目语义和聚合信息 |
| 标签页 | 语义标签 |
| 产品页 | 公司产品和服务信息 |
| 服务页 | 业务能力信息 |
| 品牌介绍 | 品牌表达和禁用说法 |
| 案例页 | 场景和客户问题 |
| 标准术语库 | 统一专有名词 |
| 禁用词库 | 风控和合规 |
| SEO 规则库 | 标题、描述、Schema、内链规则 |

### 9.3 入库流程

```text
文章保存或发布
触发 reindex 任务
抽取 title / summary / content / tags / url
清洗 HTML 或 TipTap JSON
按标题和段落切块
调用 SiliconFlow Embedding
写入 KnowledgeChunk.embedding
必要时调用 Rerank 优化召回结果
存入 PostgreSQL + pgvector
```

### 9.4 KnowledgeChunk 结构

```text
KnowledgeChunk
- id
- source
- source_type
- source_id
- title
- url
- chunk_text
- chunk_hash
- embedding
- embedding_model
- embedding_dimensions
- metadata
- is_active
- created_at
- updated_at
```

### 9.5 检索流程

```text
当前文章内容
生成 query embedding
pgvector Top-K 相似度检索
过滤无效来源
可选 rerank
返回 source_chunks
交给 LLM 生成建议
```

### 9.6 RAG 安全原则

- 内链只能推荐真实存在的 Article。
- 内链只能推荐已发布且已到发布时间的文章。
- 内链不能推荐当前文章自己。
- AI 不能编造 URL。
- 每条建议必须返回推荐原因。
- 每条建议必须保留来源 chunk id。
- 内链和 FAQ 必须人工确认后生效。

## 10. AI Diff 编辑器设计

### 10.1 技术选型

编辑器采用：

```text
TipTap + ProseMirror
```

原因：

| 能力 | 价值 |
| --- | --- |
| 结构化文档 | 能保存 `content_json` |
| blockId | Patch 可以定位到稳定块 |
| Decoration | 可渲染绿色新增、红色删除 |
| 自定义 Node | 支持 FAQ、Callout、图片、TOC |
| 协同扩展 | 后续可接实时保存和协作 |

### 10.2 内容存储

文章正文不能只存 HTML。目标结构：

```text
content_json：TipTap 结构化文档，作为编辑真相
content_html：发布渲染 HTML，由 content_json 生成
body：旧 CKEditor 字段，迁移完成前作为兼容字段
```

每个 block 必须有唯一 `blockId`：

```json
{
  "type": "paragraph",
  "attrs": {
    "blockId": "blk_1029"
  },
  "content": [
    {
      "type": "text",
      "text": "SEO 是搜索引擎优化..."
    }
  ]
}
```

### 10.3 Patch 协议

新增内容：

```json
{
  "operation": "insert_after",
  "target_block_id": "blk_1029",
  "new_block": {
    "type": "paragraph",
    "text": "建议补充：SEO 不仅影响搜索排名，也影响 AI 搜索结果中的引用概率。"
  },
  "reason": "当前段落缺少 AI 搜索场景说明。"
}
```

删除内容：

```json
{
  "operation": "delete",
  "target_block_id": "blk_2031",
  "old_text": "SEO非常非常非常重要。",
  "reason": "表达重复，信息密度较低。"
}
```

替换内容：

```json
{
  "operation": "replace_text",
  "target_block_id": "blk_3111",
  "old_text": "SEO很重要",
  "new_text": "SEO 是提升搜索曝光、点击率和页面转化的重要基础能力",
  "reason": "原句过于笼统，建议改为更具体的表达。"
}
```

### 10.4 展示与交互

| Patch 类型 | 展示 |
| --- | --- |
| 新增 | 绿色背景，左侧 `+` 标识 |
| 删除 | 红色背景，删除线，左侧 `-` 标识 |
| 替换 | 红色旧内容和绿色新内容同时展示 |

每条建议必须提供：

| 操作 | 说明 |
| --- | --- |
| 接受 | 应用 patch 并保存 |
| 拒绝 | 移除 diff，不改正文 |
| 查看原因 | 展示 AI reason 和来源 chunk |
| 编辑后接受 | 用户微调后保存为 accepted edited |

## 11. 数据模型设计

### 11.1 内容模型

```text
Article
- id
- title
- summary
- slug
- content_json
- content_html
- body
- status
- published_at
- updated_at
- author
- category
- tags
- cover_image
```

```text
Tag
- id
- name
- slug
- created_at
- updated_at
```

```text
SeoMetadata
- id
- article
- meta_title
- meta_description
- canonical_url
- og_title
- og_description
- og_image
- twitter_title
- twitter_description
- twitter_image
- robots
- created_at
- updated_at
```

```text
FaqItem
- id
- article
- question
- answer
- sort_order
- is_active
- source_type
- ai_suggestion_id
- reviewed_by
- reviewed_at
```

```text
MediaAsset
- id
- file
- alt_text
- caption
- source_type
```

### 11.2 AI 数据模型

```text
AiReviewRun
- id
- article
- status
- started_at
- completed_at
- provider
- model
- prompt_version
- request_payload
- response_payload
- token_usage
- trace_id
- error_message
```

```text
AiSuggestion
- id
- review_run
- article
- type
- severity
- title
- reason
- status
- payload
- source_chunks
- provider
- model
- prompt_version
- raw_response
- created_at
- updated_at
- reviewed_by
- reviewed_at
```

建议类型：

| type | 说明 |
| --- | --- |
| `metadata` | SEO 标题、描述、slug 建议 |
| `faq` | FAQ 建议 |
| `internal_link` | 内链建议 |
| `semantic_keyword` | 语义关键词建议 |
| `body_insert` | 正文新增建议 |
| `body_delete` | 正文删除建议 |
| `body_replace` | 正文替换建议 |
| `alt_text` | 图片 Alt 建议 |

建议状态：

| status | 说明 |
| --- | --- |
| `pending` | 待处理 |
| `accepted` | 已接受 |
| `rejected` | 已拒绝 |
| `edited` | 编辑后接受 |
| `expired` | 因正文变化过期 |
| `failed` | 生成或校验失败 |

```text
AiPatch
- id
- suggestion
- operation
- target_block_id
- old_text
- new_text
- position
- patch_json
- content_hash
- status
```

### 11.3 RAG 数据模型

```text
KnowledgeSource
- id
- source_type
- source_id
- title
- url
- content_hash
- is_active
- last_indexed_at
```

```text
KnowledgeChunk
- id
- source
- chunk_text
- chunk_hash
- embedding
- embedding_model
- embedding_dimensions
- metadata
- is_active
- created_at
- updated_at
```

### 11.4 监控数据模型

```text
AnalyticsSnapshot
- id
- article
- date
- impressions
- clicks
- ctr
- average_position
- indexed
- pageviews
- avg_time_on_page
- internal_link_clicks
- faq_expands
- ai_acceptance_rate
- source
- raw_payload
```

## 12. API 设计

### 12.1 Next.js 调用 Django API

文章：

```text
GET    /api/articles/
POST   /api/articles/
GET    /api/articles/{id}/
PATCH  /api/articles/{id}/
POST   /api/articles/{id}/publish/
POST   /api/articles/{id}/preview/
POST   /api/articles/{id}/seo-check/
```

AI 审核：

```text
POST   /api/articles/{id}/ai-review/
GET    /api/articles/{id}/ai-review-runs/
GET    /api/ai-review-runs/{run_id}/suggestions/
POST   /api/ai-suggestions/{id}/accept/
POST   /api/ai-suggestions/{id}/reject/
POST   /api/ai-patches/{id}/apply/
```

FAQ：

```text
GET    /api/articles/{id}/faqs/
POST   /api/articles/{id}/faqs/
PATCH  /api/faqs/{id}/
DELETE /api/faqs/{id}/
```

媒体：

```text
POST   /api/media/upload/
PATCH  /api/media/{id}/alt/
POST   /api/media/{id}/generate-alt/
```

监控：

```text
GET    /api/articles/{id}/analytics/
GET    /api/dashboard/seo-summary/
GET    /api/dashboard/ai-suggestion-summary/
```

### 12.2 Django 调用 FastAPI 内部接口

FastAPI 不直接暴露给浏览器。

```text
POST /internal/ai/review-article
POST /internal/ai/generate-metadata
POST /internal/ai/generate-faq
POST /internal/ai/recommend-internal-links
POST /internal/ai/generate-alt
POST /internal/ai/generate-patches
POST /internal/rag/reindex-article
POST /internal/rag/search
GET  /health
```

内部接口必须使用服务间密钥或内网访问控制，所有请求带 `X-Internal-Token`。

## 13. SEO 技术输出设计

### 13.1 发布时自动生成

| 输出 | 生成位置 |
| --- | --- |
| Meta Title | Django `seo_context` |
| Meta Description | Django `seo_context` |
| Canonical | Django 统一规则 |
| OG Tags | Django `seo_context` |
| Twitter Card | Django `seo_context` |
| Article Schema | Django Schema Builder |
| FAQ Schema | Django Schema Builder |
| Breadcrumb Schema | Django Schema Builder |
| Image Alt | MediaAsset / fallback |
| TOC | Django TOC Service |
| Sitemap | Django Sitemap |
| Robots | SeoMetadata |
| JSON-LD | Python dict 序列化 |

### 13.2 SEO Context Contract

Django 统一实现：

```python
build_article_seo_context(article, request)
```

返回结构：

```python
{
    "title": "...",
    "description": "...",
    "canonical": "...",
    "robots": "index,follow",
    "og": {
        "title": "...",
        "description": "...",
        "image": "...",
        "url": "...",
        "type": "article",
    },
    "twitter": {
        "card": "summary_large_image",
        "title": "...",
        "description": "...",
        "image": "...",
    },
    "json_ld": [],
    "breadcrumbs": [],
}
```

模板只负责渲染 `seo_context`，不在模板里散落字段优先级判断。

### 13.3 页面类型规则

| 页面 | URL | Sitemap | JSON-LD | Robots |
| --- | --- | --- | --- | --- |
| 首页 | `/` | 是 | WebSite | index |
| 文章详情 | `/<slug>/` | 是 | Article / FAQ / Breadcrumb | index |
| 分类页 | `/category/<slug>/` | 是 | Breadcrumb | index |
| 标签页 | `/tag/<slug>/` | 是 | Breadcrumb | index |
| 搜索页 | `/search/?q=...` | 否 | 否 | noindex |
| 旧 slug | 历史路径 | 否 | 否 | 301 |

## 14. 发布前检查

### 14.1 检查项

| 检查项 | 等级 |
| --- | --- |
| 标题是否存在 | Error |
| Slug 是否存在且唯一 | Error |
| 正文是否存在 | Error |
| Canonical 是否可生成 | Error |
| Meta Description 是否存在或可生成 | Warning |
| Summary 是否存在 | Warning |
| 是否有 FAQ | Warning |
| 是否有内链 | Warning |
| 封面图是否有 Alt | Warning |
| 是否生成 Schema | Error |
| 是否生成 TOC | Warning |
| 是否存在未处理 AI 建议 | Warning |

### 14.2 结果等级

| 等级 | 含义 | 是否阻止发布 |
| --- | --- | --- |
| `Error` | 严重问题 | 阻止 |
| `Warning` | 建议修复 | 不阻止 |
| `Passed` | 已通过 | 不阻止 |

## 15. 发布后监控

### 15.1 数据来源

| 来源 | 指标 |
| --- | --- |
| Google Search Console | impressions、clicks、ctr、average_position、indexed |
| GA4 | pageviews、avg_time_on_page、traffic_source |
| 站内事件 | internal_link_clicks、faq_expands |
| AI 审核数据 | ai_acceptance_rate、suggestion_type_stats |

### 15.2 监控面板

Next.js Studio 必须提供：

| 面板 | 能力 |
| --- | --- |
| SEO 总览 | 曝光、点击、CTR、平均排名趋势 |
| 文章表现 | 单篇文章趋势、收录状态、流量来源 |
| 内容机会 | 高曝光低 CTR、排名下降、缺 FAQ、缺内链 |
| AI 效果 | 建议生成量、采纳率、拒绝原因、类型分布 |
| 再优化入口 | 对低表现文章一键发起新一轮 AI 审核 |

## 16. 技术栈

### 16.1 前端

| 技术 | 用途 |
| --- | --- |
| Next.js | Studio 应用 |
| TypeScript | 类型安全 |
| TipTap | 富文本编辑器 |
| ProseMirror | 文档模型和 Decoration |
| Tailwind CSS | 样式系统 |
| shadcn/ui | 基础组件 |
| TanStack Query | 服务端状态 |
| Zustand | 编辑器本地状态 |

### 16.2 Django 主后端

| 技术 | 用途 |
| --- | --- |
| Django | CMS 主系统 |
| Django REST Framework | API |
| PostgreSQL | 主数据库 |
| pgvector | 向量检索 |
| Celery | 异步任务 |
| Redis | 缓存和队列 |
| django-ckeditor | 旧内容兼容 |

### 16.3 FastAPI AI Service

| 技术 | 用途 |
| --- | --- |
| FastAPI | AI 服务 |
| LangGraph | AI 工作流 |
| Pydantic | 请求和响应校验 |
| httpx | 调用 Django 和硅基流动 |
| LlamaIndex | 可选 RAG 工具层 |
| pytest | 服务测试 |

### 16.4 AI 与 RAG

| 能力 | 默认选择 |
| --- | --- |
| Chat Provider | SiliconFlow |
| Chat Model | `Pro/zai-org/GLM-4.7` |
| Fast Model | `Qwen/Qwen3-32B` |
| Embedding | `Qwen/Qwen3-Embedding-4B` |
| Embedding 维度 | `1536` |
| Rerank | `BAAI/bge-reranker-v2-m3` |
| Vector DB | PostgreSQL + pgvector |

### 16.5 部署

第一阶段使用 Docker Compose：

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| `web` | 8001 | Django |
| `ai-service` | 8002 | FastAPI |
| `editor-web` | 3000 | Next.js |
| `db` | 5432 | PostgreSQL + pgvector |
| `redis` | 6379 | Redis |
| `worker` | 无 | Celery Worker |

后期可迁移到 Kubernetes、ECS、Railway、Render 或 Fly.io。

## 17. 推荐目录结构

### 17.1 Django

```text
apps/simple_cms/
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── admin.py
├── services/
│   ├── seo_context.py
│   ├── schema_builder.py
│   ├── sitemap_builder.py
│   ├── ai_client.py
│   ├── suggestion_service.py
│   ├── patch_service.py
│   └── publish_service.py
├── tasks.py
└── tests/
```

### 17.2 FastAPI AI Service

```text
ai_service/
├── main.py
├── core/
│   ├── config.py
│   ├── security.py
│   └── logging.py
├── graphs/
│   ├── article_review_graph.py
│   ├── metadata_graph.py
│   └── internal_link_graph.py
├── nodes/
│   ├── load_article.py
│   ├── retrieve_context.py
│   ├── analyze_seo.py
│   ├── generate_metadata.py
│   ├── generate_faq.py
│   ├── recommend_links.py
│   ├── generate_patches.py
│   └── validate_output.py
├── rag/
│   ├── chunker.py
│   ├── indexer.py
│   └── retriever.py
├── providers/
│   ├── base.py
│   ├── mock_provider.py
│   └── siliconflow_provider.py
├── schemas/
│   ├── article.py
│   ├── suggestion.py
│   └── patch.py
└── tests/
```

### 17.3 Next.js Studio

```text
editor-web/
├── app/
│   ├── studio/
│   │   ├── articles/
│   │   ├── analytics/
│   │   └── settings/
├── components/
│   ├── editor/
│   ├── ai-diff/
│   ├── metadata-form/
│   ├── publish-checklist/
│   └── analytics/
├── lib/
│   ├── api-client.ts
│   ├── patch-apply.ts
│   └── editor-schema.ts
└── stores/
    ├── editor-store.ts
    └── ai-review-store.ts
```

## 18. 开发里程碑

### Phase 0：三端架构基础

状态：`TODO`

目标：

```text
Django API、FastAPI AI Service、Next.js Studio、Docker Compose、认证和文章读取保存跑通。
```

交付：

| 模块 | 内容 |
| --- | --- |
| Django | DRF、文章 API、认证、内部 API Token |
| FastAPI | 服务骨架、健康检查、内部鉴权、Mock Provider |
| Next.js | Studio 骨架、登录态、文章列表、文章编辑页 |
| Docker | 新增 `ai-service`、`editor-web`、`worker` |

验收：

```bash
docker compose up -d --build
curl -s http://127.0.0.1:8002/health
curl -I http://127.0.0.1:3000/studio/articles
docker compose exec -T web python manage.py test
```

### Phase 1：SEO 数据与发布输出

状态：`TODO`

目标：

```text
无 AI 也能发布标准 SEO 页面。
```

交付：

| 模块 | 内容 |
| --- | --- |
| 数据模型 | Tag、SeoMetadata、FaqItem、MediaAsset alt |
| SEO Context | title、description、canonical、robots、OG、Twitter |
| Schema | Article、FAQ、Breadcrumb JSON-LD |
| 页面输出 | TOC、Sitemap、Canonical、OG、Alt |
| 发布检查 | Error、Warning、Passed |

验收：

```bash
docker compose exec -T web python manage.py migrate
docker compose exec -T web python manage.py test
curl -s http://127.0.0.1:8001/<article-slug>/ | grep -E "canonical|og:title|application/ld\\+json"
curl -I http://127.0.0.1:8001/sitemap.xml
```

### Phase 2：RAG 知识库

状态：`TODO`

目标：

```text
AI 能检索公司已有内容，所有建议有来源。
```

交付：

| 模块 | 内容 |
| --- | --- |
| pgvector | 数据库镜像、VectorExtension、VectorField |
| Knowledge | KnowledgeSource、KnowledgeChunk |
| Indexer | 内容抽取、HTML 清洗、切块、hash |
| Embedding | SiliconFlow Embedding、Mock Embedding |
| Retriever | pgvector 检索、过滤、rerank |

验收：

```bash
docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run
docker compose exec -T web python manage.py rebuild_knowledge_index --source article
docker compose exec -T web python manage.py rag_query "SEO Schema" --limit 5
docker compose exec -T web python manage.py test
```

### Phase 3：FastAPI AI 建议引擎

状态：`TODO`

目标：

```text
FastAPI + LangGraph 能基于 RAG 生成可审核建议。
```

交付：

| 模块 | 内容 |
| --- | --- |
| Provider | SiliconFlow Chat、Embedding、Rerank、Mock |
| LangGraph | Article Review Graph |
| 建议 | Metadata、FAQ、内链、语义关键词、Alt |
| 审计 | AiReviewRun、AiSuggestion、AiPatch |
| 安全 | JSON Schema、来源校验、内容清洗 |

验收：

```bash
curl -s http://127.0.0.1:8002/health
docker compose exec -T web python manage.py test
docker compose exec -T ai-service pytest
```

### Phase 4：Next.js + TipTap AI Diff Studio

状态：`TODO`

目标：

```text
实现 Cursor/Codex 风格 AI 编辑体验。
```

交付：

| 模块 | 内容 |
| --- | --- |
| Editor | TipTap、blockId、content_json、content_html |
| Diff | 绿色新增、红色删除、替换展示 |
| 操作 | Accept、Reject、编辑后接受 |
| 状态 | TanStack Query、Zustand、自动保存 |
| 冲突 | content_hash、expired patch、版本快照 |

验收：

```bash
cd editor-web
npm run lint
npm run test
npm run build
```

浏览器验收：

```text
打开 /studio/articles
新建文章
保存草稿
触发 AI 审核
看到绿色新增/红色删除 Diff
接受一条建议
拒绝一条建议
保存并刷新后内容状态正确
```

### Phase 5：发布与监控闭环

状态：`TODO`

目标：

```text
发布前知道 SEO 是否合格，发布后知道页面效果。
```

交付：

| 模块 | 内容 |
| --- | --- |
| 发布检查 | 阻止 Error，展示 Warning |
| GSC | impressions、clicks、ctr、average_position |
| GA4 | pageviews、avg_time_on_page |
| 站内事件 | 内链点击、FAQ 展开 |
| Dashboard | SEO 趋势、文章表现、AI 采纳率 |

验收：

```bash
docker compose exec -T web python manage.py test
cd editor-web && npm run build
```

手工验收：

```text
发布文章前能看到检查结果
存在 Error 时不能发布
发布后 AnalyticsSnapshot 可展示趋势
低 CTR 文章可以发起二次 AI 审核
```

## 19. 风险与解决方案

### 风险 1：Diff 编辑器复杂度高

问题：

```text
段落新增、删除、文本替换、列表修改、图片插入、用户同时编辑都会导致 patch 错位。
```

解决方案：

| 措施 | 说明 |
| --- | --- |
| blockId | 每个块稳定定位 |
| content_hash | 接受前校验正文版本 |
| Decoration | 只渲染建议，不立即改正文 |
| Accept 后应用 | 用户确认后才修改文档 |
| expired 状态 | 正文变化后旧 Patch 失效 |

### 风险 2：RAG 推荐不准

问题：

```text
AI 可能推荐不相关内容或错误内链。
```

解决方案：

| 措施 | 说明 |
| --- | --- |
| published only | 内链只来自已发布文章 |
| source_chunks | 每条建议保存来源 |
| rerank | 用 rerank 提升相关性 |
| 人工确认 | 不自动写入正文 |
| 空结果保护 | 无来源时不生成内链 |

### 风险 3：AI 生成质量不稳定

问题：

```text
AI 可能生成泛化 FAQ、低质量改写、品牌表达不一致。
```

解决方案：

| 措施 | 说明 |
| --- | --- |
| Prompt 版本 | 每次变更可追溯 |
| 输出 Schema | 强制结构化 |
| RAG 来源 | 建议必须有依据 |
| 人工审核 | 保留接受/拒绝 |
| 重新生成 | 支持二次审核 |

### 风险 4：SEO 技术输出错误

问题：

```text
Schema、Canonical、Sitemap 如果交给 AI 生成，容易出错。
```

解决方案：

| 措施 | 说明 |
| --- | --- |
| Django 规则生成 | 技术 SEO 不由 AI 决定 |
| JSON 序列化 | 禁止字符串拼接 JSON-LD |
| 单元测试 | 覆盖 fallback 和边界 |
| curl 验证 | 验证真实 HTML 输出 |

### 风险 5：API Key 泄漏

问题：

```text
真实 API Key 可能被写入文档、日志、提交历史或前端包。
```

解决方案：

| 措施 | 说明 |
| --- | --- |
| 环境变量 | 只用 `SILICONFLOW_API_KEY` |
| 后端调用 | 前端永不接触 Key |
| 日志脱敏 | 输出只保留 trace_id |
| 密钥轮换 | 已暴露 Key 必须轮换 |
| CI 检查 | 增加 secret scan |

## 20. 最终架构结论

本项目最终采用：

```text
Django CMS
+
FastAPI LangGraph AI Service
+
Next.js TipTap Studio
+
PostgreSQL pgvector
+
SiliconFlow AI Provider
```

分工：

| 系统 | 职责 |
| --- | --- |
| Django | 内容、权限、发布、SEO 渲染、数据落库 |
| FastAPI | AI、RAG、LangGraph、Patch 生成 |
| Next.js | 运营编辑器、Diff 体验、发布工作台、监控面板 |
| PostgreSQL | 业务数据、向量数据、AI 建议数据 |
| SiliconFlow | Chat、Embedding、Rerank 模型能力 |

最终闭环：

```text
运营输入内容
AI 基于 RAG 理解公司知识库
AI 生成 FAQ、内链、语义关键词、正文 Patch
运营在编辑器中逐条接受或拒绝
系统自动生成 Schema、OG、Canonical、JSON-LD、TOC、Sitemap
前台渲染 SEO Optimized HTML
数据监控持续反馈优化
```

这套架构保留现有 Django CMS 的稳定性，同时完整实现现代 AI 编辑器体验和 SEO 发布闭环，是当前最稳妥、最可扩展、也最符合目标产品定位的方案。
