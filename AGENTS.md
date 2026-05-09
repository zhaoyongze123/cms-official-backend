# AGENTS.md - Codex 执行规则

本文件是本仓库所有 Code Agent 的最高优先级项目规则。每次开始任务前必须完整阅读本文件，并按本文档执行。

## 1. 基本原则

- 全部沟通、说明、提交信息、PR 描述、文档内容使用简体中文。
- 代码变量名、函数名、类名保持英文。
- 代码注释和 docstring 使用中文。
- 任何结论必须基于真实证据，包括代码、日志、测试、HTTP 响应、数据库状态或命令输出。
- 不允许凭感觉判断，不允许使用“看起来像”“大概”作为结论依据。
- 任何真实 API Key、Token、Cookie、密码不得写入 Git、文档、测试快照、日志或 PR 描述。
- 用户已经提供过的硅基流动 Key 视为已暴露，真实开发前必须轮换。

## 2. 核心执行策略

本项目采用契约优先的多分支并行开发策略，执行顺序固定：

```text
先搭底座
冻结模块边界
定义接口契约
写 Mock / Stub
不同分支并行开发
按契约集成
```

禁止在底座和契约未完成前，让多个代理直接各自实现业务功能。

## 3. 必读文档

开始任何开发任务前，至少阅读以下文档：

| 文档 | 用途 |
| --- | --- |
| `docs/AI_SEO_PUBLISHING_PLAN.md` | 总体产品和技术计划 |
| `docs/ARCHITECTURE_BOUNDARIES.md` | 总架构边界 |
| `docs/INTERFACE_CONTRACTS.md` | 模块接口契约 |
| `docs/ATOMIC_TASK_STATUS.md` | 原子任务状态 |
| `docs/BRANCH_BOUNDARIES.md` | 分支责任边界 |
| `docs/INTEGRATION_PLAN.md` | 合并顺序与集成计划 |
| `contracts/README.md` | 契约包说明 |

涉及具体 API 或数据结构时，必须同时阅读 `contracts/` 下对应 Schema 或 OpenAPI 文件。

## 4. 分支规则

- `main` 始终保持可部署。
- `develop` 是集成分支。
- 所有功能分支从 `develop` 切出。
- 分支命名使用：
  - `feature/platform-foundation`
  - `feature/contracts-v1`
  - `feature/django-*`
  - `feature/fastapi-*`
  - `feature/nextjs-*`
  - `feature/tiptap-*`
  - `feature/rag-*`
  - `feature/analytics-*`
  - `feature/e2e-integration`
- 契约变更只能走 `contract-change/*` 分支。
- 不允许功能分支偷偷修改契约字段。
- 不允许直接向 `main` 合并未集成验证的功能分支。

## 5. 契约优先规则

以下 6 类契约必须先冻结，再并行开发：

| 契约 | 文件 |
| --- | --- |
| Django ↔ Next.js API | `contracts/openapi.django.yaml` |
| Django ↔ FastAPI API | `contracts/openapi.ai-service.yaml` |
| AiSuggestion / AiPatch | `contracts/ai-suggestion.schema.json`、`contracts/ai-patch.schema.json` |
| TipTap content_json | `contracts/tiptap-document.schema.json` |
| RAG 检索结果 | `contracts/rag-search.schema.json` |
| SEO Context | `contracts/seo-context.schema.json` |

接口字段、状态枚举、错误结构、版本号、Mock 示例都属于契约的一部分。

## 6. Mock / Stub 规则

每个并行分支必须可独立运行：

| 模块 | 必须提供 |
| --- | --- |
| Next.js | MSW、fixtures 或本地 mock API |
| Django | Mock AI Client，返回固定 AiSuggestion / AiPatch |
| FastAPI | Mock Provider、Mock Retriever |
| RAG | Mock Embedding，测试不依赖外网 |
| Analytics | Mock GSC / GA4 Snapshot |

没有 Mock / Stub 的分支不得进入集成。

## 7. 模块边界

| 模块 | 可以修改 | 禁止修改 |
| --- | --- | --- |
| Django CMS | `apps/`、`config/`、Django API、迁移、模板 | FastAPI 内部图逻辑、Next.js UI |
| FastAPI AI Service | `ai_service/`、AI provider、LangGraph、RAG 节点 | Django 业务状态、Next.js UI |
| Next.js Studio | `editor-web/`、运营工作台、API client、页面状态 | Django 模型、FastAPI 内部逻辑 |
| TipTap Editor | `editor-web/components/editor`、patch 渲染和应用 | AI 输出生成、Django 落库 |
| Contracts | `contracts/`、契约文档 | 业务实现代码 |

跨边界变更必须先修改契约，并走 `contract-change/*`。

## 8. 测试与验收

基础验证：

```bash
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py test
curl -I http://127.0.0.1:8001/
```

Django 迁移验证：

```bash
docker compose exec -T web python manage.py makemigrations --check --dry-run
docker compose exec -T web python manage.py migrate
```

FastAPI 验证：

```bash
curl -s http://127.0.0.1:8002/health
docker compose exec -T ai-service pytest
```

Next.js 验证：

```bash
cd editor-web
npm run lint
npm run test
npm run build
```

契约验证：

```bash
python3 -m json.tool contracts/ai-suggestion.schema.json > /dev/null
python3 -m json.tool contracts/ai-patch.schema.json > /dev/null
```

## 9. PR 要求

每个 PR 必须包含：

- 变更内容。
- 所属原子任务编号。
- 是否修改契约。
- 数据库迁移说明。
- Mock / Stub 说明。
- 测试命令和真实结果。
- 未解决风险。

文档变更 PR 可以不跑 Django/Next/FastAPI 测试，但必须说明原因并执行文档级校验。

## 10. 禁止事项

- 禁止绕过契约直接改接口字段。
- 禁止 AI 输出直接覆盖正式文章。
- 禁止 FastAPI 直接修改文章发布状态。
- 禁止 Next.js 直接调用 FastAPI 内部接口。
- 禁止让 AI 生成最终 Canonical、Sitemap、JSON-LD 技术代码。
- 禁止测试依赖真实 API Key。
- 禁止提交 `.env` 中的密钥。
- 禁止使用破坏性 Git 命令回滚用户或其他代理的工作。
