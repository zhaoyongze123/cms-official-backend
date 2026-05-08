# AI Native SEO Publishing OS 后端开发计划

更新时间：2026-05-08  
当前分支：`feature/ai-seo-publishing`  
计划状态：待开发  
阶段目标：先在现有 Django CMS 内闭环后端能力，完成技术 SEO 发布、RAG 知识库、AI 建议审核和基础监控占位；完整 Cursor/TipTap 风格编辑器作为后续独立前端里程碑。

## 1. 执行规则

### 1.1 状态流转

每个任务必须独立闭环，开发时只允许使用以下状态：

| 状态 | 含义 |
| --- | --- |
| `TODO` | 未开始 |
| `IN_PROGRESS` | 正在开发 |
| `BLOCKED` | 被明确问题阻塞，必须写清原因 |
| `DONE` | 已完成并通过验收 |

### 1.2 每个任务完成条件

- 代码、迁移、后台配置、模板或文档已同步更新。
- 本文档中对应任务状态更新为 `DONE`，并追加真实验收命令和结果。
- 涉及数据库变更时必须提交迁移文件，并验证迁移可执行。
- 涉及 AI 或 RAG 时必须提供 Mock 路径，测试不得依赖外网或真实 API Key。
- 任务完成后必须执行最小回归测试。

### 1.3 固定验证命令

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
```

涉及 RAG 时追加：

```bash
docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run
docker compose exec -T web python manage.py rag_query "测试查询" --limit 5
```

## 2. 当前基线

### 2.1 已有能力

- 文章模型已有分类、标题、slug、封面图、正文、发布状态、定时发布时间、置顶排序、SEO Description。
- 已有已发布文章过滤、未来发布时间隐藏、草稿详情 404。
- 已有 slug 历史记录和旧链接 301 跳转。
- 已有文章版本快照。
- 后台使用 Django Admin + Jazzmin + CKEditor。
- 前台已有文章列表页和详情页。
- Docker Compose 已可运行，当前本地访问端口为 `127.0.0.1:8001`。

### 2.2 必须补齐的后端缺口

- 没有 URL、页面类型、canonical 的统一规则文档。
- 没有结构化 Tag 模型。
- 没有独立 SeoMetadata 模型，当前 SEO 字段和内容字段混在 Article 中。
- 没有统一 SEO Context，模板逻辑容易继续分散。
- 没有 FAQ、内链建议、AI 建议审核、Prompt 版本追踪。
- 没有 RAG 知识库、Embedding、检索、重建索引命令。
- 没有 Article / FAQ / Breadcrumb JSON-LD、OG、Sitemap、TOC。
- 没有基础 SEO 检查器。
- 没有 AI 输出安全与内容风控边界。

## 3. 后端架构原则

### 3.1 领域模型边界

- `Article` 是内容主体：标题、slug、摘要、正文、封面、分类、标签、状态、发布时间。
- `SeoMetadata` 是搜索展示层：meta title、meta description、canonical override、OG、robots。
- `FaqItem` 是页面内容模块，也是 FAQ Schema 来源。
- `Tag` 是结构化语义标签，不使用逗号字符串存储。
- `AiSuggestion` 是 AI 建议审计记录，不直接代表最终内容。
- `InternalLinkSuggestion` 是站内链接建议，不直接改正文。
- `KnowledgeDocument` / `KnowledgeChunk` 是 RAG 检索数据层，不直接替代业务表。
- `AnalyticsSnapshot` 是发布后表现数据占位，不在本阶段接完整 OAuth。

### 3.2 服务层边界

- `seo_context`：统一输出页面 title、description、canonical、robots、OG、JSON-LD、breadcrumbs。
- `seo_checks`：输出发布前 SEO 检查项，只提示，不阻塞保存。
- `toc`：解析正文 H2/H3，生成目录和稳定锚点。
- `knowledge_base`：抽取、切块、Embedding、索引、检索。
- `ai_providers`：封装 Mock/OpenAI/Anthropic 等 Provider。
- `suggestions`：处理 AI 建议创建、接受、拒绝和状态流转。
- `internal_links`：生成只基于真实已发布文章和 RAG 结果的内链建议。

### 3.3 AI 与 RAG 原则

- AI 生成内容默认只是建议，不直接覆盖运营内容。
- 每条建议必须可接受、可拒绝、可追踪来源、Provider、模型、Prompt 版本和原始响应。
- 内链建议只能指向数据库中真实存在、已发布、已到发布时间的站内文章。
- FAQ、内链、标签、描述等建议必须可追溯到 RAG 检索结果。
- Schema、Canonical、OG、Sitemap、TOC 使用规则生成，不让 AI 生成关键技术 SEO 代码。
- 没有 API Key 时系统必须可正常发布文章，AI/RAG 使用 Mock Provider 或明确禁用真实调用。

### 3.4 技术选型依据

- RAG 向量库：PostgreSQL + pgvector。pgvector 官方支持 Postgres 13+、Docker 镜像和 cosine/L2/inner product 检索，适合当前项目复用 PostgreSQL，不额外引入独立向量数据库。参考：[pgvector README](https://github.com/pgvector/pgvector)。
- Django 向量字段：使用 `pgvector` Python 包提供的 `pgvector.django.VectorField` 和 `VectorExtension`。参考：[pgvector-python](https://github.com/pgvector/pgvector-python)。
- Embedding 默认模型：`text-embedding-3-small`，默认 1536 维，适合低成本中文/英文内容检索；测试环境必须使用 Mock Embedding。参考：[OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) 和 [Embeddings API Reference](https://platform.openai.com/docs/api-reference/embeddings)。

## 4. 任务清单

### T00 - SEO URL 与页面类型规则梳理

状态：`TODO`  
目标：先锁定 URL、页面类型、canonical、slug 和 Sitemap 规则，避免后续 SEO 输出返工。  
依赖：无

#### 实现内容

- 新增后端规则文档或计划小节，明确：
  - 首页：`/`
  - 文章详情：`/<slug>/`
  - 分类页：`/category/<slug>/`
  - 标签页：`/tag/<slug>/`
  - 搜索页：`/search/?q=...`，默认不进 Sitemap。
  - 旧 slug：保持 301 到当前文章详情。
  - canonical：默认使用当前站点绝对 URL + 标准路径，允许 SeoMetadata 覆盖。
  - 多语言：MVP 不做。
  - www / non-www：MVP 不在应用层强制，生产由反向代理或域名配置统一。
  - http / https：开发用 http，生产由 `SECURE_PROXY_SSL_HEADER` 和代理负责 https。
- 补充每类页面是否进入 Sitemap、是否输出 JSON-LD、是否允许 robots noindex。

#### 验收标准

- 文档清楚描述所有页面类型和 canonical 策略。
- T02、T04、T01.5 可以直接引用这些规则，不再自行决策。

#### 测试方案

- 文档任务无需新增代码测试。
- 执行：
  - `docker compose exec -T web python manage.py check`
  - `docker compose exec -T web python manage.py test`

---

### T01 - SEO 内容数据模型扩展

状态：`TODO`  
目标：补齐文章 SEO 发布所需的结构化数据底座，并避免未来标签和 SEO 字段迁移痛点。  
依赖：T00

#### 实现内容

- 扩展 `Article`：
  - `summary`：文章摘要，允许为空。
  - `tags`：改为 `ManyToManyField(Tag, blank=True)`，不使用逗号字符串存储。
- 新增 `Tag`：
  - `name`：唯一，最大 64。
  - `slug`：唯一，最大 80。
  - `created_at`、`updated_at`。
  - 后台支持按名称搜索。
- 调整 `ArticleRevision`：
  - 记录 `summary_snapshot`。
  - 记录 `tags_snapshot`，使用文本快照保存当时标签名。
- 新增 `SeoMetadata`：
  - `article`：一对一关联 Article。
  - `meta_title`、`meta_description`。
  - `canonical_url`：人工覆盖用，允许为空。
  - `og_title`、`og_description`、`og_image`。
  - `robots`：默认 `index,follow`。
  - `created_at`、`updated_at`。
- 扩展 `ImageItem`：
  - `alt_text`：图片 Alt 文本。
  - `caption`：图片说明。
- 新增 `FaqItem`：
  - `article`、`question`、`answer`、`sort_order`、`is_active`。
  - `source_type`：manual、ai、imported。
  - `source_suggestion`：可为空，关联 AiSuggestion，后续 T07 接入。
  - `created_by_ai`、`reviewed_by`、`reviewed_at`。
- 更新 Admin：
  - Article 编辑页显示 summary、tags。
  - SEO 字段放在 SeoMetadata inline 中。
  - FAQ 使用 inline 管理。
  - ImageItem 显示 alt_text、caption。
- 新增迁移。

#### 验收标准

- 后台能维护 Article summary 和结构化 tags。
- 后台能维护 SeoMetadata，不把 meta_title 放在 Article 本体。
- 后台能维护 FAQ，并看到 FAQ 来源和审核信息。
- 旧文章不需要手工补字段即可正常打开。
- 所有新增字段允许空值，不破坏现有数据。

#### 测试方案

- 模型测试：
  - Tag name/slug 唯一。
  - Article 可关联多个 Tag。
  - SeoMetadata 与 Article 一对一。
  - FAQ 只属于指定文章。
  - ImageItem alt_text 可保存。
  - 旧文章无 SeoMetadata 时不报错。
- 执行：
  - `docker compose exec -T web python manage.py makemigrations --check --dry-run`
  - `docker compose exec -T web python manage.py migrate`
  - `docker compose exec -T web python manage.py test`

---

### T01.5 - SEO Context Contract

状态：`TODO`  
目标：定义统一 SEO Context，所有模板只消费结构化结果，不在模板里散落判断逻辑。  
依赖：T00、T01

#### 实现内容

- 新增 `build_article_seo_context(article, request)`。
- 返回结构必须固定：

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
    "json_ld": [],
    "breadcrumbs": [],
}
```

- 字段优先级：
  - title：`SeoMetadata.meta_title` > `Article.title`
  - description：`SeoMetadata.meta_description` > `Article.meta_description` > `Article.summary` > 正文截断
  - canonical：`SeoMetadata.canonical_url` > request 绝对地址 + `article.get_absolute_url()`
  - og title：`SeoMetadata.og_title` > SEO title
  - og description：`SeoMetadata.og_description` > SEO description
  - og image：`SeoMetadata.og_image` > `Article.cover_image`
- 模板只输出 `seo_context`，不直接判断 Article/SeoMetadata 字段。

#### 验收标准

- Article 详情页上下文中存在 `seo_context`。
- 模板不再自行拼 canonical。
- SeoMetadata 缺失时 fallback 正常。

#### 测试方案

- 服务测试：
  - 无 SeoMetadata 时 fallback 正确。
  - 有 SeoMetadata 时优先使用 SEO 字段。
  - canonical override 生效。
  - 封面图 fallback 到 og image。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T02 - 技术 SEO 输出引擎

状态：`TODO`  
目标：文章详情页自动输出标准 SEO HTML 头部和 JSON-LD。  
依赖：T01.5

#### 实现内容

- 基于 `seo_context` 更新 `base.html` 和文章详情模板。
- 输出：
  - `<title>`
  - `meta description`
  - `meta robots`
  - `link rel="canonical"`
  - `og:title`
  - `og:description`
  - `og:image`
  - `og:url`
  - `og:type`
  - `application/ld+json`
- JSON-LD 使用规则生成：
  - Article Schema。
  - Breadcrumb Schema。
  - FAQ Schema，存在启用 FAQ 时输出。
- JSON-LD 必须通过 Python 结构序列化，禁止拼接 JSON 字符串。

#### 验收标准

- 文章详情页 HTML 包含标准 SEO 输出。
- 草稿、归档、未来发布文章仍不可访问。
- 旧 slug 仍 301 到新 slug。
- FAQ Schema 与启用 FAQ 一致。

#### 测试方案

- 详情页测试：
  - 无 SEO 字段时使用 fallback。
  - 有 SEO 字段时使用显式字段。
  - 有 FAQ 时输出 FAQ JSON-LD。
  - 有封面图时输出 og:image。
  - JSON-LD 可被 `json.loads` 解析。
- 执行：
  - `docker compose exec -T web python manage.py test`
  - `curl -s http://127.0.0.1:8001/<article-slug>/ | grep -E "canonical|og:title|application/ld\\+json"`

---

### T03 - TOC 自动目录

状态：`TODO`  
目标：根据正文 H2/H3 自动生成目录和稳定锚点。  
依赖：T02

#### 实现内容

- 新增正文解析服务：
  - 从 HTML 正文提取 H2/H3。
  - 为缺少 `id` 的标题生成稳定锚点。
  - 重复标题生成唯一锚点。
  - 返回 TOC 数据和带锚点正文。
- 文章详情页展示 TOC。
- 目录仅在至少存在 2 个标题时展示。

#### 验收标准

- 正文包含多个 H2/H3 时详情页出现目录。
- 点击目录锚点能跳转到对应标题。
- 没有 H2/H3 的文章不展示空目录。
- 目录生成不破坏正文。

#### 测试方案

- 服务测试：
  - 能提取 H2/H3。
  - 重复标题生成唯一锚点。
  - 已有 id 不被覆盖。
- 页面测试：
  - 有标题时出现 TOC。
  - 无标题时不出现 TOC。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T04 - Sitemap 输出

状态：`TODO`  
目标：搜索引擎能发现首页、已发布文章、分类页和标签页。  
依赖：T00、T01、T02

#### 实现内容

- 使用 Django sitemap 框架或自定义 XML View。
- 输出：
  - 首页。
  - 已发布且已到发布时间的文章详情页。
  - 分类页。
  - 标签页。
- 不输出：
  - 草稿文章。
  - 归档文章。
  - 未来发布时间文章。
  - 搜索结果页。
- 在 `config.urls` 暴露 `/sitemap.xml`。

#### 验收标准

- `GET /sitemap.xml` 返回 XML。
- XML 包含已发布文章 URL。
- XML 包含分类和标签 URL。
- XML 不包含草稿和未来发布文章 URL。
- 文章 `lastmod` 使用 `updated_at`。

#### 测试方案

- Sitemap 测试：
  - 已发布文章存在。
  - 草稿不存在。
  - 未来发布文章不存在。
  - 分类和标签存在。
- 执行：
  - `docker compose exec -T web python manage.py test`
  - `curl -I http://127.0.0.1:8001/sitemap.xml`

---

### T05 - 图片 Alt 发布闭环

状态：`TODO`  
目标：封面图和媒体库图片具备可维护 Alt，并在前台输出。  
依赖：T01

#### 实现内容

- 文章列表和详情页封面图 alt 优先使用 `ImageItem.alt_text`，否则使用文章标题。
- 后台图片库显示并可编辑 alt_text、caption。
- 预留 AI 生成 Alt 的 AiSuggestion 类型，不在本任务接 Vision。

#### 验收标准

- 有 alt_text 时前台图片输出该值。
- 无 alt_text 时 fallback 到文章标题。
- 后台能编辑 alt_text。

#### 测试方案

- 模板响应测试：
  - 有 alt_text 时 HTML 包含对应 alt。
  - 无 alt_text 时 HTML 包含文章标题 alt。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T06 - Basic SEO Checklist

状态：`TODO`  
目标：在 M1 提前提供基础 SEO 检查，辅助演示和验收无 AI 发布闭环。  
依赖：T01、T01.5、T02、T05

#### 实现内容

- 新增基础 SEO 检查服务：
  - title 是否存在。
  - description 是否可生成。
  - slug 是否存在。
  - canonical 是否可生成。
  - robots 是否存在。
  - 封面图 Alt 是否存在。
  - 是否至少有一个 Tag。
  - 是否至少有一个启用 FAQ。
- 后台文章页展示检查结果。
- 检查结果只提示，不阻塞保存或发布。

#### 验收标准

- 完整文章显示通过项。
- 缺失 SEO 字段显示明确提示。
- 检查不影响草稿保存。

#### 测试方案

- 服务测试：
  - 空文章返回缺失项。
  - 完整文章返回通过项。
  - SeoMetadata 缺失时能使用 fallback 检查。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T07 - RAG 基础设施与 pgvector

状态：`TODO`  
目标：建立后端 RAG 知识库基础设施，支持历史文章、FAQ、分类和标签进入向量检索。  
依赖：T01

#### 实现内容

- Docker 与依赖：
  - 将 `docker-compose.yml` 的数据库镜像从 `postgres:15-alpine` 调整为 `pgvector/pgvector:pg15`。
  - 新增 Python 依赖 `pgvector`。
  - 新增迁移启用 `VectorExtension()`。
- 配置项：
  - `EMBEDDING_PROVIDER=mock`
  - `EMBEDDING_MODEL=text-embedding-3-small`
  - `EMBEDDING_DIMENSIONS=1536`
  - `OPENAI_API_KEY=` 允许为空。
- 新增 `apps.knowledge_base`：
  - `KnowledgeDocument`：source_type、source_model、source_object_id、source_url、title、status、content_hash、last_indexed_at、metadata。
  - `KnowledgeChunk`：document、chunk_index、text、token_count、content_hash、embedding、embedding_model、embedding_provider、embedded_at、metadata。
- Embedding 字段：
  - 使用 `VectorField(dimensions=1536)`。
  - 默认 Mock Embedding 维度同样为 1536。
- 索引策略：
  - MVP 先用精确 cosine distance 查询。
  - 数据量上来后再加 HNSW/IVFFlat 索引。
- 新增管理命令：
  - `rebuild_knowledge_index --dry-run`
  - `rebuild_knowledge_index --source article`
  - `embed_pending_chunks`
  - `rag_query "<query>" --limit 5`

#### 验收标准

- 数据库启用 `vector` 扩展。
- 能从已发布文章生成 KnowledgeDocument 和 KnowledgeChunk。
- 草稿、归档、未来发布文章不进入可检索知识库。
- Mock Embedding 不依赖外网。
- `rag_query` 能返回相关 chunk 和来源文章。

#### 测试方案

- 模型测试：
  - KnowledgeDocument 能关联文章来源。
  - KnowledgeChunk embedding 维度为 1536。
  - content_hash 相同时不重复生成 chunk。
- 命令测试：
  - dry-run 不写库。
  - rebuild 只索引已发布文章。
  - rag_query 返回 limit 内结果。
- 执行：
  - `docker compose down`
  - `docker compose up -d --build`
  - `docker compose exec -T web python manage.py migrate`
  - `docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run`
  - `docker compose exec -T web python manage.py test`

---

### T08 - RAG 内容抽取、切块与同步策略

状态：`TODO`  
目标：让 RAG 知识库可持续跟随 CMS 内容变化，而不是一次性脚本。  
依赖：T07

#### 实现内容

- 新增内容抽取服务：
  - Article：title、summary、正文纯文本、分类、标签、FAQ。
  - Category：名称、SEO 描述、层级。
  - Tag：名称、slug。
  - FAQ：question、answer、关联文章。
- 新增 HTML 清洗：
  - 移除 script/style。
  - 保留语义文本。
  - 保留标题层级作为 metadata。
- 新增切块策略：
  - 每个 chunk 目标 500 到 900 中文字符。
  - 保留 chunk_index 和上下文标题。
  - 不跨文章混切。
- 新增同步策略：
  - Article 保存后标记知识文档需要重建。
  - FAQ、Tag、Category 变化后标记相关文章需要重建。
  - MVP 不做异步队列，由管理命令处理 pending 状态。

#### 验收标准

- 已发布文章更新后，相关 KnowledgeDocument 标记为 stale 或 pending。
- 重新索引后 chunk 内容反映最新正文。
- script/style 不进入 chunk。
- FAQ 内容可以被检索到，并带回来源文章。

#### 测试方案

- 服务测试：
  - HTML 清洗移除危险标签。
  - 切块不产生空 chunk。
  - FAQ 被纳入文章知识文本。
  - 内容变化会改变 content_hash。
- 命令测试：
  - pending 文档可被重新嵌入。
- 执行：
  - `docker compose exec -T web python manage.py test`
  - `docker compose exec -T web python manage.py rebuild_knowledge_index --source article`

---

### T09 - RAG 检索服务与引用约束

状态：`TODO`  
目标：为 FAQ、标签、描述和内链建议提供可引用、可追踪的检索结果。  
依赖：T07、T08

#### 实现内容

- 新增 `retrieve_context(query, filters=None, limit=5)`。
- 返回结构固定：

```python
{
    "query": "...",
    "results": [
        {
            "chunk_id": 1,
            "document_id": 1,
            "source_type": "article",
            "source_object_id": 1,
            "title": "...",
            "url": "...",
            "text": "...",
            "score": 0.87,
            "metadata": {},
        }
    ],
}
```

- 支持过滤：
  - source_type。
  - category。
  - tag。
  - published_only。
- 内链场景必须把返回结果映射回真实 Article。
- FAQ 和 metadata 场景必须保存使用过的 chunk ids。
- 无检索结果时返回空列表，不让 AI 编造来源。

#### 验收标准

- 检索服务能按 query 返回相关 chunk。
- filters 能限制来源范围。
- 返回结果包含可追踪 source_object_id。
- 无结果时 AI 建议服务能明确知道“证据不足”。

#### 测试方案

- 服务测试：
  - limit 生效。
  - published_only 生效。
  - category/tag filter 生效。
  - 无结果返回空列表。
- 执行：
  - `docker compose exec -T web python manage.py test`
  - `docker compose exec -T web python manage.py rag_query "FAQ Schema" --limit 5`

---

### T10 - AI 建议数据闭环

状态：`TODO`  
目标：建立 AI 生成内容的统一记录、审核、采纳、拒绝机制。  
依赖：T01、T09

#### 实现内容

- 新增 `AiSuggestion`：
  - `article`
  - `suggestion_type`：metadata、tags、faq、internal_link、body_add、body_delete、body_replace、alt_text。
  - `status`：pending、accepted、rejected、failed。
  - `old_text`、`new_text`、`reason`、`error_message`。
  - `payload = JSONField(default=dict, blank=True)`。
  - `retrieval_payload = JSONField(default=dict, blank=True)`，保存 RAG query、chunk ids、scores。
  - `provider`、`model_name`、`prompt_version`。
  - `raw_response = JSONField(default=dict, blank=True)`。
  - `token_usage = JSONField(default=dict, blank=True)`。
  - `created_at`、`updated_at`、`reviewed_by`、`reviewed_at`。
- 接受规则：
  - metadata 建议写入 SeoMetadata。
  - tags 建议创建或关联 Tag。
  - FAQ 建议创建启用 FaqItem，并设置 source_suggestion。
  - internal_link 建议创建或更新 InternalLinkSuggestion。
  - 正文 diff 类建议 MVP 只记录，不自动改正文。
- 已接受或已拒绝建议不能重复处理。

#### 验收标准

- AI 建议能创建、接受、拒绝。
- payload 能承载不同类型结构。
- 接受 metadata/tags/FAQ 后业务数据正确变化。
- 所有建议保留 provider、model、prompt_version、raw_response。
- 正文类建议不会自动修改正文。

#### 测试方案

- 服务测试：
  - 接受 metadata 建议更新 SeoMetadata。
  - 接受 tags 建议创建并关联 Tag。
  - 接受 FAQ 建议创建 FaqItem。
  - 重复接受被阻止。
  - 拒绝后状态正确。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T11 - AI Provider 与 Prompt 版本管理

状态：`TODO`  
目标：打通 AI 调用边界和 Prompt 版本追踪，让 Mock、OpenAI、Anthropic 可替换。  
依赖：T09、T10

#### 实现内容

- 配置项：
  - `AI_PROVIDER=mock`
  - `AI_MODEL=mock-seo-assistant`
  - `AI_PROMPT_VERSION=v1`
  - `OPENAI_API_KEY=`
- 新增 Provider 接口：
  - `generate_metadata(article, retrieval_context)`
  - `generate_tags(article, retrieval_context)`
  - `generate_faq(article, retrieval_context)`
  - `review_body(article, retrieval_context)`
- Mock Provider：
  - 返回稳定结构，测试可断言。
  - 不调用外网。
- OpenAI Provider：
  - 只预留接口和配置位，本任务可不默认启用真实调用。
  - 真实调用必须记录 prompt_version、raw_response、token_usage。
- Prompt 文件：
  - 存放在后端可版本化路径。
  - 每次变更 prompt_version。

#### 验收标准

- Mock Provider 能生成 metadata、tags、FAQ、正文审核建议。
- 服务层把 Provider 输出转为 AiSuggestion。
- 缺少真实 API Key 不影响系统运行。
- Prompt version 写入 AiSuggestion。

#### 测试方案

- Provider 测试：
  - mock metadata 输出固定结构。
  - mock tags 输出固定结构。
  - mock FAQ 输出固定结构。
  - 服务层把 mock 输出转为 AiSuggestion。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T12 - 内链推荐基础版

状态：`TODO`  
目标：基于真实已发布文章和 RAG 结果生成可审核的站内内链建议。  
依赖：T09、T10

#### 实现内容

- 新增 `InternalLinkSuggestion`：
  - `source_article`
  - `target_article`
  - `suggested_anchor_text`
  - `suggested_context_text`
  - `suggested_sentence`
  - `position_hint`
  - `reason`
  - `status`：pending、accepted、rejected。
  - `source_suggestion`：关联 AiSuggestion，可为空。
  - `retrieval_payload`
  - `created_at`、`updated_at`、`reviewed_by`、`reviewed_at`。
- 推荐服务：
  - 候选仅来自 `Article.objects.published()`。
  - 排除当前文章。
  - 优先用 RAG 检索相关已发布文章。
  - fallback 使用标题、分类、标签、摘要关键词相关度。
- 接受建议：
  - 不自动改正文。
  - 记录 accepted 状态。
  - 给运营可复制的 `suggested_sentence`。

#### 验收标准

- 内链建议目标一定是已发布文章。
- 不推荐当前文章自己。
- 草稿、归档、未来发布文章不会作为目标。
- 建议包含锚文本、插入位置提示和可复制句子。
- 接受/拒绝状态可保存。

#### 测试方案

- 服务测试：
  - 只返回已发布目标。
  - 不返回当前文章。
  - 无候选文章时返回空列表。
  - suggested_sentence 不为空。
- 模型测试：
  - 状态流转可保存。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T13 - FAQ 正文与 Schema 闭环

状态：`TODO`  
目标：FAQ 被接受后既能在页面展示，也能进入 FAQ Schema，并能追踪来源建议。  
依赖：T02、T10、T11

#### 实现内容

- 文章详情页在正文后展示启用 FAQ。
- FAQ 顺序按 `sort_order`。
- FAQ JSON-LD 只包含启用 FAQ。
- 后台支持 FAQ 启用/停用和排序。
- 接受 FAQ AI 建议时：
  - 自动创建启用 FaqItem。
  - 设置 `source_suggestion`。
  - 设置 `created_by_ai=True`。
  - 设置 reviewed_by、reviewed_at。

#### 验收标准

- 前台文章详情能看到 FAQ 模块。
- FAQ JSON-LD 与页面展示 FAQ 一致。
- 停用 FAQ 不展示，也不进入 JSON-LD。
- FAQ 可追溯到 AiSuggestion。

#### 测试方案

- 详情页测试：
  - 启用 FAQ 展示。
  - 停用 FAQ 不展示。
  - JSON-LD 只包含启用 FAQ。
- 服务测试：
  - 接受 FAQ 建议后 source_suggestion 正确。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T14 - 后台 AI 发布工作台 MVP

状态：`TODO`  
目标：让运营在 Django Admin 中完成生成建议、查看建议、接受和拒绝。  
依赖：T10、T11、T12、T13

#### 实现内容

- Django Admin 只做 MVP 操作：
  - 生成 metadata 建议。
  - 生成 tags 建议。
  - 生成 FAQ 建议。
  - 生成内链建议。
  - 查看建议列表。
  - 接受单条建议。
  - 拒绝单条建议。
- 不在 Admin 做复杂正文 inline diff。
- 建议列表显示：
  - 类型、状态、摘要、理由、RAG 来源数量、Provider、Prompt 版本、操作按钮。
- 所有操作必须：
  - 仅管理员或有文章变更权限用户可用。
  - 具备 CSRF 保护。
  - 通过 `message_user` 返回结果。

#### 验收标准

- 管理员能在文章页触发 AI 建议生成。
- 生成后能看到建议列表。
- 单条建议能接受或拒绝。
- 接受 metadata/tags/FAQ/内链建议后对应业务数据变化。
- 未登录访问重定向。
- 无权限用户无法执行建议操作。

#### 测试方案

- Admin view 测试：
  - 未登录访问重定向。
  - 无权限用户被拒绝。
  - 管理员触发生成建议成功。
  - 管理员接受建议成功。
  - 管理员拒绝建议成功。
- 手工验收：
  - 登录 `http://127.0.0.1:8001/django-admin/`
  - 创建文章。
  - 触发 AI 建议。
  - 接受一条 metadata 或 FAQ 建议。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T15 - SEO Quality Checker

状态：`TODO`  
目标：在 Basic SEO Checklist 基础上增加更完整的发布质量提示。  
依赖：T06、T12、T13

#### 实现内容

- 扩展 SEO 检查服务：
  - 标题长度建议。
  - Description 长度建议。
  - 是否有 TOC。
  - 是否有 FAQ。
  - 是否有标签。
  - 是否有已接受内链建议。
  - 是否有封面图 Alt。
  - 是否有 RAG 可检索相关内容。
  - 是否有 canonical。
  - 是否有 JSON-LD。
- 后台文章页展示检查结果和建议级别：
  - pass
  - warning
  - missing
- 检查结果只提示，不阻塞保存或发布。

#### 验收标准

- 完整文章显示多数通过项。
- 缺失 SEO 字段显示明确提示。
- 检查不影响草稿保存。
- 检查结果不依赖真实 AI Provider。

#### 测试方案

- 服务测试：
  - 空文章返回 missing 项。
  - 完整文章返回 pass 项。
  - 有内链建议时检查通过。
  - 无 RAG 内容时返回 warning。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T16 - 安全与内容风控

状态：`TODO`  
目标：AI 和 RAG 进入发布流程后，保证不会绕过权限、注入危险内容或生成不可信链接。  
依赖：T10、T11、T12、T14

#### 实现内容

- AI 输出安全：
  - FAQ answer 不允许 script/style。
  - JSON-LD 只通过结构化序列化输出。
  - AI 建议中的 HTML 默认按纯文本处理。
  - 正文 diff 建议不自动执行。
- 链接安全：
  - 内链 target_article 必须来自已发布 Article。
  - suggested_sentence 中链接 URL 必须匹配 target_article.get_absolute_url()。
  - 不接受外链作为内链建议。
- 权限安全：
  - AI 生成、接受、拒绝必须使用 Admin 权限。
  - 接受建议不能绕过文章修改权限。
- Slug 安全：
  - AI slug 建议必须经过现有唯一 slug 规则。
  - 不能覆盖历史 slug。

#### 验收标准

- 恶意 script 不会进入 FAQ 展示和 JSON-LD。
- 内链建议不能指向草稿或外部 URL。
- 无权限用户不能调用 AI 建议操作。
- AI slug 建议不破坏现有 slug 唯一性。

#### 测试方案

- 安全测试：
  - FAQ answer 中 script 被清洗或拒绝。
  - 内链外部 URL 被拒绝。
  - 无权限用户接受建议失败。
  - slug 冲突时生成唯一 slug 或拒绝。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T17 - 发布监控数据模型占位

状态：`TODO`  
目标：为后续 GSC/GA4 接入预留后端数据结构和后台展示入口。  
依赖：T01

#### 实现内容

- 新增 `AnalyticsSnapshot`：
  - `article`
  - `date`
  - `impressions`
  - `clicks`
  - `ctr`
  - `average_position`
  - `pageviews`
  - `source`：manual、gsc、ga4。
  - `raw_payload`
- 后台文章页只读展示最近数据。
- 新增管理入口用于手工查看快照。
- 不在本阶段接 OAuth 或自动同步。

#### 验收标准

- 可以在后台创建和查看快照。
- 文章页能展示最近快照。
- 没有快照时页面不报错。
- 同一文章同一天同来源唯一。

#### 测试方案

- 模型测试：
  - 唯一约束生效。
  - 无快照不影响文章详情。
- Admin 测试：
  - 快照可查看。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T18 - 文档、运维与交付闭环

状态：`TODO`  
目标：让新工程师或 Code Agent 能按文档启动、开发、索引 RAG、验证和交付。  
依赖：T00-T17

#### 实现内容

- 更新 `README.md`：
  - 本地启动。
  - 测试命令。
  - 后台账号创建方式。
  - AI Provider 配置。
  - Embedding Provider 配置。
  - RAG 索引命令。
  - 常见问题：pgvector、CKEditor 警告、端口 8001。
- 更新本文档状态。
- 补充“发布前检查清单”。
- 补充“RAG 重建索引操作手册”。

#### 验收标准

- 文档能指导从空环境启动项目。
- 文档能指导执行 RAG 索引和检索。
- 所有任务状态与实际代码一致。
- 开发者能按文档跑通测试。

#### 测试方案

- 从当前环境执行：
  - `docker compose down`
  - `docker compose up -d --build`
  - `docker compose exec -T web python manage.py migrate`
  - `docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run`
  - `docker compose exec -T web python manage.py test`
  - `curl -I http://127.0.0.1:8001/`

## 5. 里程碑安排

### M1 - 技术 SEO 发布闭环

包含：T00、T01、T01.5、T02、T03、T04、T05、T06  
验收目标：即使没有 AI，也能发布一个标准 SEO 页面，具备结构化标签、SEO metadata、canonical、OG、JSON-LD、TOC、Sitemap、图片 Alt 和基础 SEO 检查。

### M2 - RAG 知识库闭环

包含：T07、T08、T09  
验收目标：历史文章、FAQ、分类、标签能进入 pgvector 知识库，支持可追踪检索结果，AI 不再无来源生成建议。

### M3 - AI 建议审核闭环

包含：T10、T11、T12、T13、T14、T16  
验收目标：AI 能基于 RAG 生成 metadata、tags、FAQ、内链建议，运营能在 Admin 接受/拒绝，所有建议可审计、可追踪、可风控。

### M4 - 质量检查与监控占位

包含：T15、T17、T18  
验收目标：后台具备 SEO 质量检查，发布后数据模型占位完成，文档可指导后续持续开发。

### M5 - 独立 AI 编辑器前端

本阶段只规划，不在当前后端闭环中实现。后续可单独立项：

- Next.js。
- TipTap。
- 绿色新增、红色删除。
- 正文 inline diff。
- Accept / Reject。
- 类 Cursor 编辑体验。

## 6. AI 功能优先级

### P0

- AI 生成 meta title。
- AI 生成 meta description。
- AI 生成 FAQ。
- AI 生成 tags。

### P1

- AI 内链推荐。
- AI 正文审核建议。
- AI summary 优化。

### P2

- AI alt 生成。
- AI rewrite。
- AI diff patch。

### P3

- 复杂 RAG 策略。
- pgvector HNSW/IVFFlat 性能优化。
- GSC/GA4 自动同步。
- GEO 监控。
- AI citation 监控。

## 7. PR 与提交规范

- 每个任务优先独立提交。
- Commit Message 使用中文：
  - `feat: 增加结构化标签模型`
  - `feat: 增加 RAG 知识库索引`
  - `fix: 修复 canonical 生成规则`
  - `test: 补充 FAQ Schema 回归测试`
  - `docs: 更新 AI SEO 发布计划状态`
- 每个 PR 描述必须包含：
  - 变更内容。
  - 数据库迁移说明。
  - RAG 索引影响。
  - 测试命令和结果。
  - 未解决风险。

## 8. 当前已知风险

- `django-ckeditor` 使用 CKEditor 4.22.1，`manage.py check` 会提示维护和安全风险。后续如重做 AI 编辑器，应评估 CKEditor 5、TipTap 或其他编辑器。
- 当前项目使用 Django Admin 作为运营工作台，适合 MVP，但不适合复杂正文 inline diff。
- pgvector 会改变本地 PostgreSQL 镜像，已有开发数据库卷可能需要重建或迁移前备份。
- 真实 OpenAI Embedding 依赖 API Key 和网络，测试必须使用 Mock Embedding。
- RAG 检索质量依赖切块和内容清洗，M2 必须先追求可追踪和可回归，再追求复杂召回效果。
- 当前 Docker Compose 使用本机 `8001`，因为 `8000` 已被其他 Docker 服务占用。
