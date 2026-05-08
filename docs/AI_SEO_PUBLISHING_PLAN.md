# AI Native SEO Publishing OS 开发计划

更新时间：2026-05-08  
当前分支：`feature/ai-seo-publishing`  
计划状态：待开发  
产品目标：在现有 Django CMS 上，把文章发布升级为“运营输入内容、AI 辅助优化、系统自动输出 SEO 结构化页面”的发布工作流。

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

每个任务完成时必须同时满足：

- 代码、迁移、后台配置、模板或文档已同步更新。
- 最小回归测试已执行。
- 本文档中对应任务状态更新为 `DONE`。
- 在任务记录中补充真实验收命令和结果。
- 如果引入数据库变更，必须包含迁移文件和迁移验证结果。

### 1.3 固定验证命令

基础验证命令：

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

涉及页面 SEO 输出时追加：

```bash
curl -s http://127.0.0.1:8001/ | head
```

## 2. 当前基线

### 2.1 已有能力

- 文章模型已有分类、标题、slug、封面图、正文、发布状态、定时发布时间、置顶排序、SEO Description。
- 已有已发布文章过滤、未来发布时间隐藏、草稿详情 404。
- 已有 slug 历史记录和旧链接 301 跳转。
- 已有文章版本快照。
- 后台使用 Django Admin + Jazzmin + CKEditor。
- 前台已有文章列表页和详情页。

### 2.2 关键缺口

- 没有独立 SEO 元数据模型。
- 没有 Summary、Meta Title、Tags、FAQ、AI 建议、内链建议、图片 Alt 管理。
- 没有 Article / FAQ / Breadcrumb JSON-LD。
- 没有 OG 标签、规范化 canonical 生成工具、Sitemap、TOC。
- 没有 AI 服务层、AI 生成按钮、审核建议接受/拒绝工作流。
- 没有 GSC/GA4 数据模型和监控面板。

## 3. 总体架构方案

### 3.1 后端分层

- `apps.simple_cms.models`：承载文章发布领域数据模型。
- `apps.simple_cms.services`：承载 SEO 规则生成、AI 生成、内链推荐、TOC 解析等业务逻辑。
- `apps.simple_cms.views`：只负责查询、权限、请求响应，不直接写复杂业务规则。
- `apps.simple_cms.templatetags`：承载模板中需要复用的 SEO 输出辅助能力。
- `apps.simple_cms.admin`：承载运营工作台入口、AI 操作按钮、建议审核状态。
- `apps.simple_cms.tests`：按任务持续扩展可回归测试。

### 3.2 AI 能力原则

- AI 生成内容默认只是“建议”，不直接覆盖运营已填写内容。
- 每条建议必须可接受、可拒绝、可追踪来源。
- 内链建议只能使用数据库中真实存在且已发布的站内文章。
- Schema、Canonical、OG、Sitemap、TOC 优先用规则生成，不让 AI 生成关键技术 SEO 代码。
- 没有 API Key 时，系统必须可正常发布文章，AI 按钮返回清晰错误或禁用状态。

### 3.3 MVP 边界

MVP 优先做可生产发布闭环：

- 内容字段补齐。
- 技术 SEO 自动输出。
- FAQ 和内链建议的数据闭环。
- AI 服务层接口和可替换 Mock。
- 后台可操作的 AI 建议接受/拒绝。

暂不做：

- Next.js / TipTap 全量重构。
- 复杂向量数据库和 pgvector 上线。
- GSC/GA4 OAuth 完整接入。
- GEO 监控。

## 4. 任务清单

### T01 - SEO 数据模型扩展

状态：`TODO`  
目标：补齐文章发布所需的 SEO 基础数据结构，为后续渲染和 AI 建议提供稳定数据底座。  
建议分支：当前 `feature/ai-seo-publishing`

#### 实现内容

- 扩展 `Article`：
  - `summary`：文章摘要，允许为空。
  - `meta_title`：搜索标题，允许为空，空时使用 `title`。
  - `tags`：标签文本，MVP 使用逗号分隔 `CharField`，后续可迁移独立 Tag 模型。
- 扩展 `ImageItem`：
  - `alt_text`：图片 Alt 文本，允许为空。
  - `caption`：图片说明，允许为空。
- 新增 `FaqItem`：
  - 关联文章、问题、答案、排序、是否启用、来源类型。
- 新增 `SeoMetadata`：
  - 关联文章、canonical、og_title、og_description、og_image、robots。
  - 与文章保持一对一。
- 更新 Admin 字段分组。
- 新增数据库迁移。

#### 验收标准

- 后台文章编辑页能维护 summary、meta_title、tags。
- 后台图片库能维护 alt_text、caption。
- 后台文章详情能内联维护 FAQ。
- 旧文章不需要手工补字段即可正常打开。
- 所有新增字段允许空值，不破坏现有数据。

#### 测试方案

- 新增模型测试：
  - 创建文章时新增字段可为空。
  - FAQ 只属于指定文章。
  - ImageItem 的 alt_text 可保存。
- 执行：
  - `docker compose exec -T web python manage.py makemigrations --check --dry-run`
  - `docker compose exec -T web python manage.py migrate`
  - `docker compose exec -T web python manage.py test`

---

### T02 - 技术 SEO 输出引擎

状态：`TODO`  
目标：发布后的文章详情页自动输出 SEO 友好的 HTML 头部和 JSON-LD。  
依赖：T01

#### 实现内容

- 新增 SEO 服务函数：
  - 生成页面标题：优先 `meta_title`，否则 `title`。
  - 生成描述：优先 `meta_description`，否则 `summary`，否则正文截断。
  - 生成 canonical：基于当前 request 和文章绝对路径。
  - 生成 OG：title、description、image、url、type。
  - 生成 Article JSON-LD。
  - 存在启用 FAQ 时生成 FAQ JSON-LD。
  - 生成 Breadcrumb JSON-LD。
- 更新 `base.html` 和文章详情模板：
  - 输出 canonical。
  - 输出 OG 标签。
  - 输出 `application/ld+json`。
- 修复当前 canonical 拼接风险，避免重复 URL 或错误拼接。

#### 验收标准

- 文章详情页 HTML 包含：
  - `<title>`
  - `meta description`
  - `link rel="canonical"`
  - `og:title`
  - `og:description`
  - `og:image`（有封面时）
  - Article JSON-LD
  - Breadcrumb JSON-LD
  - FAQ JSON-LD（有启用 FAQ 时）
- 草稿和未来发布文章仍然不可访问。
- 旧 slug 仍然 301 到新 slug。

#### 测试方案

- 新增详情页响应测试：
  - 无 SEO 字段时使用 fallback。
  - 有 SEO 字段时使用显式字段。
  - 有 FAQ 时输出 FAQ JSON-LD。
  - 有封面图时输出 og:image。
- 执行：
  - `docker compose exec -T web python manage.py test`
  - `curl -s http://127.0.0.1:8001/<文章slug>/ | grep -E "canonical|og:title|application/ld\\+json"`

---

### T03 - TOC 自动目录

状态：`TODO`  
目标：根据正文中的 H2/H3 自动生成文章目录，提高阅读结构和 SEO 结构化程度。  
依赖：T02

#### 实现内容

- 新增正文解析服务：
  - 从 HTML 正文提取 H2/H3。
  - 为缺少 `id` 的标题生成稳定锚点。
  - 返回 TOC 数据和带锚点的正文 HTML。
- 文章详情页展示 TOC。
- 目录仅在至少存在 2 个标题时展示。
- 保持正文 HTML 安全策略与当前 CKEditor 输出一致。

#### 验收标准

- 正文包含多个 H2/H3 时，详情页出现目录。
- 点击目录锚点能跳转到对应标题。
- 没有 H2/H3 的文章不展示空目录。
- 目录生成不破坏原正文内容。

#### 测试方案

- 新增服务测试：
  - 能提取 H2/H3。
  - 重复标题生成唯一锚点。
  - 已有 id 不被覆盖。
- 新增详情页测试：
  - 有标题时出现 TOC。
  - 无标题时不出现 TOC。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T04 - Sitemap 输出

状态：`TODO`  
目标：让搜索引擎可发现已发布文章和分类页。  
依赖：T02

#### 实现内容

- 使用 Django sitemap 框架或自定义 XML View。
- 输出：
  - 首页。
  - 已发布且已到发布时间的文章详情页。
  - 分类列表页。
- URL 中不包含草稿、归档、未来发布时间文章。
- 在 `config.urls` 暴露 `/sitemap.xml`。

#### 验收标准

- `GET /sitemap.xml` 返回 XML。
- XML 中包含已发布文章 URL。
- XML 中不包含草稿和未来发布文章 URL。
- 文章 `lastmod` 使用 `updated_at`。

#### 测试方案

- 新增 sitemap 测试：
  - 已发布文章存在。
  - 草稿不存在。
  - 未来发布文章不存在。
- 执行：
  - `docker compose exec -T web python manage.py test`
  - `curl -I http://127.0.0.1:8001/sitemap.xml`

---

### T05 - 内链推荐基础版

状态：`TODO`  
目标：基于真实已发布文章生成可审核的站内内链建议，禁止 AI 编造链接。  
依赖：T01

#### 实现内容

- 新增 `InternalLinkSuggestion`：
  - 源文章、目标文章、锚文本、建议插入位置、状态、生成原因。
- 新增内链推荐服务：
  - 候选仅来自 `Article.objects.published()`。
  - 排除当前文章。
  - MVP 使用标题、分类、摘要、正文关键词的简单相关度。
- 后台文章页展示内链建议。
- 支持接受、拒绝建议。
- 接受建议时不自动改正文，MVP 记录为已接受，由运营手动插入。

#### 验收标准

- 内链建议目标一定是已发布文章。
- 不推荐当前文章自己。
- 草稿、归档、未来发布文章不会作为目标。
- 接受/拒绝状态可保存。

#### 测试方案

- 新增服务测试：
  - 只返回已发布目标。
  - 不返回当前文章。
  - 无候选文章时返回空列表。
- 新增模型测试：
  - 状态流转可保存。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T06 - AI 建议数据闭环

状态：`TODO`  
目标：建立 AI 生成内容的统一记录、审核、采纳、拒绝机制。  
依赖：T01

#### 实现内容

- 新增 `AiSuggestion`：
  - 关联文章。
  - 类型：标题、描述、slug、标签、FAQ、内链、正文新增、正文删除、正文替换。
  - 原文、新内容、理由、状态、错误信息。
  - 创建时间、更新时间。
- 新增建议服务：
  - 创建建议。
  - 接受建议。
  - 拒绝建议。
- 接受 Metadata 建议时写入对应文章字段。
- 接受 FAQ 建议时创建或启用 FAQ。
- 正文 diff 类建议 MVP 只记录，不自动改正文。
- 后台文章页以内联表格展示建议状态。

#### 验收标准

- AI 建议能被创建、接受、拒绝。
- 接受标题/描述/slug/tags 建议后，文章字段正确更新。
- 已接受或已拒绝的建议不能重复处理。
- 正文类建议不会自动改正文。

#### 测试方案

- 新增服务测试：
  - 接受 metadata 建议更新文章。
  - 接受 FAQ 建议创建 FAQ。
  - 重复接受被阻止。
  - 拒绝后状态正确。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T07 - AI 服务层与 Mock Provider

状态：`TODO`  
目标：先打通 AI 调用边界，让后续替换真实大模型不影响业务代码。  
依赖：T06

#### 实现内容

- 新增 `AI_PROVIDER` 配置：
  - 默认 `mock`。
  - 后续可扩展 `openai`、`anthropic`。
- 新增 AI 服务接口：
  - 生成 metadata 候选。
  - 生成 FAQ 候选。
  - 生成正文审核建议。
- Mock Provider 返回稳定、可测试的数据。
- 没有真实 API Key 时，后台 AI 功能仍能用 Mock 演示。
- 所有 AI 结果必须落库为 `AiSuggestion`，不直接改文章。

#### 验收标准

- 调用 AI metadata 生成后产生建议记录。
- Mock 输出稳定，测试不依赖外网。
- Provider 配置不存在时使用 mock。
- AI 调用失败时记录错误建议或返回后台提示，不影响文章保存。

#### 测试方案

- 新增 provider 测试：
  - mock metadata 输出固定结构。
  - mock FAQ 输出固定结构。
  - 服务层把 mock 输出转为 AiSuggestion。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T08 - 后台 AI 发布工作台 MVP

状态：`TODO`  
目标：让运营在 Django Admin 文章编辑页完成“生成建议、查看建议、接受/拒绝建议”。  
依赖：T06、T07

#### 实现内容

- 在文章编辑页增加 AI 操作入口：
  - 生成标题/描述/slug/tags 建议。
  - 生成 FAQ 建议。
  - 生成正文审核建议。
- 增加建议列表：
  - 类型、内容摘要、理由、状态、操作按钮。
- 增加接受/拒绝后台 action 或自定义 admin view。
- 所有操作需要 Django Admin 权限保护和 CSRF 保护。
- 成功或失败通过 `message_user` 明确提示。

#### 验收标准

- 管理员能在文章页触发 AI 建议生成。
- 生成后能看到建议列表。
- 单条建议能接受。
- 单条建议能拒绝。
- 接受 metadata 建议后字段更新并生成版本快照。

#### 测试方案

- 新增 admin view 测试：
  - 未登录访问重定向。
  - 管理员触发生成建议成功。
  - 管理员接受建议成功。
  - 管理员拒绝建议成功。
- 手工验收：
  - 登录 `http://127.0.0.1:8001/django-admin/`
  - 创建文章。
  - 触发 AI 建议。
  - 接受一条标题或描述建议。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T09 - FAQ 正文与 Schema 闭环

状态：`TODO`  
目标：FAQ 被接受后既能在页面显示，也能进入 FAQ Schema。  
依赖：T02、T06、T08

#### 实现内容

- 文章详情页在正文后展示启用 FAQ。
- FAQ 顺序按 `sort_order`。
- FAQ JSON-LD 只包含启用 FAQ。
- 后台支持 FAQ 启用/停用和排序。
- 接受 FAQ AI 建议时自动创建启用 FAQ。

#### 验收标准

- 前台文章详情能看到 FAQ 模块。
- FAQ JSON-LD 与页面展示 FAQ 一致。
- 停用 FAQ 不展示，也不进入 JSON-LD。

#### 测试方案

- 新增详情页测试：
  - 启用 FAQ 展示。
  - 停用 FAQ 不展示。
  - JSON-LD 只包含启用 FAQ。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T10 - 图片 Alt 发布闭环

状态：`TODO`  
目标：封面图和媒体库图片具备可维护 Alt，并在前台输出。  
依赖：T01

#### 实现内容

- 文章列表和详情页封面图 alt 优先使用 `ImageItem.alt_text`，否则使用文章标题。
- 后台图片库显示 alt_text。
- 预留 AI 生成 Alt 的建议类型，不在 MVP 直接接 Vision。

#### 验收标准

- 有 alt_text 时前台图片输出该值。
- 无 alt_text 时 fallback 到文章标题。
- 后台能编辑 alt_text。

#### 测试方案

- 新增模板响应测试：
  - 有 alt_text 时 HTML 包含对应 alt。
  - 无 alt_text 时 HTML 包含文章标题 alt。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T11 - SEO 质量检查器

状态：`TODO`  
目标：发布前给运营明确提示，降低遗漏 SEO 字段的概率。  
依赖：T01、T02、T03、T09、T10

#### 实现内容

- 新增 SEO 检查服务：
  - 标题存在。
  - 描述存在且长度合理。
  - slug 存在。
  - 有 H1。
  - 有封面图 alt。
  - 有 FAQ。
  - 有至少一个标签。
  - 有至少一个内链建议或已接受内链。
- 后台文章页展示检查结果。
- 检查结果只提示，不阻塞保存或发布。

#### 验收标准

- 完整文章显示通过项。
- 缺失 SEO 字段显示明确提示。
- 检查不影响草稿保存。

#### 测试方案

- 新增服务测试：
  - 空文章返回缺失项。
  - 完整文章返回通过项。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T12 - 发布监控数据模型占位

状态：`TODO`  
目标：为后续 GSC/GA4 接入预留数据结构和后台展示入口。  
依赖：T01

#### 实现内容

- 新增 `AnalyticsSnapshot`：
  - 文章、日期、曝光、点击、CTR、平均排名、页面访问。
- 后台文章页只读展示最近数据。
- 新增管理入口用于手工查看快照。
- 不在本阶段接 OAuth 或自动同步。

#### 验收标准

- 可以在后台创建和查看快照。
- 文章页能展示最近快照。
- 没有快照时页面不报错。

#### 测试方案

- 新增模型测试：
  - 同一文章同一天唯一。
  - 无快照不影响文章详情。
- 执行：
  - `docker compose exec -T web python manage.py test`

---

### T13 - 文档、运维与交付闭环

状态：`TODO`  
目标：让新工程师或 Code Agent 能按文档启动、开发、验证和交付。  
依赖：T01-T12

#### 实现内容

- 更新 `README.md`：
  - 本地启动。
  - 测试命令。
  - 后台账号创建方式。
  - AI Provider 配置说明。
- 更新本文档状态。
- 补充“发布前检查清单”。
- 保留已知风险：
  - CKEditor 4 维护警告。
  - 真实 AI Provider 待接入。
  - GSC/GA4 OAuth 待接入。

#### 验收标准

- 文档能指导从空环境启动项目。
- 所有任务状态与实际代码一致。
- 开发者能按文档跑通测试。

#### 测试方案

- 从当前环境执行：
  - `docker compose down`
  - `docker compose up -d --build`
  - `docker compose exec -T web python manage.py migrate`
  - `docker compose exec -T web python manage.py test`
  - `curl -I http://127.0.0.1:8001/`

## 5. 里程碑安排

### M1 - SEO 数据与技术输出闭环

包含：T01、T02、T03、T04、T10  
验收：文章详情页具备基础 SEO HTML、JSON-LD、TOC、Sitemap 和图片 Alt。

### M2 - AI 建议和内链闭环

包含：T05、T06、T07、T08、T09  
验收：后台能生成 AI 建议，运营能接受/拒绝，FAQ 能展示并进入 Schema，内链建议只来自真实文章。

### M3 - 质量检查和监控占位

包含：T11、T12、T13  
验收：后台有 SEO 检查提示，有监控数据占位，文档可指导后续开发。

## 6. PR 与提交规范

- 每个任务优先独立提交。
- Commit Message 使用中文：
  - `feat: 增加文章 SEO 元数据模型`
  - `fix: 修复 canonical 生成规则`
  - `test: 补充 FAQ Schema 回归测试`
  - `docs: 更新 AI SEO 发布计划状态`
- 每个 PR 描述必须包含：
  - 变更内容。
  - 数据库迁移说明。
  - 测试命令和结果。
  - 未解决风险。

## 7. 当前已知风险

- `django-ckeditor` 使用 CKEditor 4.22.1，`manage.py check` 会提示维护和安全风险。后续如重做 AI 编辑器，应评估 CKEditor 5、TipTap 或其他编辑器。
- 当前项目使用 Django Admin 作为运营工作台，能满足 MVP，但不适合复杂 Cursor 风格 inline diff。若要实现 PRD 中完整绿色新增/红色删除正文内审阅，建议后续单独做前端编辑器里程碑。
- 当前 Docker Compose 使用本机 `8001`，因为 `8000` 已被其他 Docker 服务占用。
