# 合并顺序与集成计划

更新时间：2026-05-09

本文档定义从底座到集成的合并顺序。禁止所有功能分支最后一次性合并。

## 1. 总流程

```text
Step 1：完成底座分支
Step 2：完成接口契约分支
Step 3：按契约并行开发
Step 4：按顺序合入 develop
Step 5：E2E 集成
Step 6：稳定后合入 main
```

## 2. 推荐合并顺序

| 顺序 | 分支 | 合并目标 | 集成重点 |
| --- | --- | --- | --- |
| 1 | `feature/platform-foundation` | `develop` | 三端服务、Docker、健康检查 |
| 2 | `feature/contracts-v1` | `develop` | OpenAPI、JSON Schema、Mock 示例 |
| 3 | `feature/django-content-seo-models` | `develop` | 内容和 SEO 数据底座 |
| 4 | `feature/django-seo-renderer` | `develop` | SEO 输出和 Sitemap |
| 5 | `feature/fastapi-langgraph-ai-service` | `develop` | FastAPI Mock AI Service |
| 6 | `feature/nextjs-studio-shell` | `develop` | Studio Shell 和 Mock API |
| 7 | `feature/rag-pgvector` | `develop` | RAG 索引和检索 |
| 8 | `feature/django-ai-review-models` | `develop` | AI 建议落库和 API |
| 9 | `feature/tiptap-editor-basic` | `develop` | TipTap 文档结构和保存 |
| 10 | `feature/tiptap-diff-editor` | `develop` | Diff 展示和 Patch 应用 |
| 11 | `feature/publish-flow` | `develop` | 发布前检查和发布闭环 |
| 12 | `feature/analytics-monitoring` | `develop` | 发布后数据监控 |
| 13 | `feature/e2e-integration` | `develop` | 三端集成和回归 |
| 14 | `develop` | `main` | 稳定发布 |

## 3. 每次合并后的固定验证

合入 `develop` 后至少执行：

```bash
docker compose up -d --build
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py test
curl -I http://127.0.0.1:8001/
```

涉及 FastAPI：

```bash
curl -s http://127.0.0.1:8002/health
docker compose exec -T ai-service pytest
```

涉及 Next.js：

```bash
cd editor-web
npm run lint
npm run test
npm run build
```

涉及契约：

```bash
python3 -m json.tool contracts/article.schema.json > /dev/null
python3 -m json.tool contracts/ai-review.schema.json > /dev/null
python3 -m json.tool contracts/ai-suggestion.schema.json > /dev/null
python3 -m json.tool contracts/ai-patch.schema.json > /dev/null
python3 -m json.tool contracts/rag-search.schema.json > /dev/null
python3 -m json.tool contracts/seo-context.schema.json > /dev/null
python3 -m json.tool contracts/tiptap-document.schema.json > /dev/null
```

## 4. 集成闸门

| 闸门 | 条件 |
| --- | --- |
| G1 底座闸门 | Django、FastAPI、Next.js、Postgres、Redis 都能启动 |
| G2 契约闸门 | `contracts/` 全部通过 JSON 校验，OpenAPI 可被工具解析 |
| G3 Django 闸门 | 迁移、模型测试、SEO 输出测试通过 |
| G4 FastAPI 闸门 | Mock Provider 和真实 Provider 配置路径都存在 |
| G5 Next.js 闸门 | Studio 能用 Mock 数据完成编辑流程 |
| G6 Patch 闸门 | `blockId`、`content_hash`、`patch_schema_version` 全部参与校验 |
| G7 发布闸门 | Error 阻止发布，Warning 不阻止发布 |
| G8 监控闸门 | Mock Analytics 数据能展示并回归 |
| G9 E2E 闸门 | 从新建文章到 AI 审核、接受建议、发布、查看监控完整跑通 |

## 5. 回滚策略

- 单个功能分支合入后失败，优先修复该分支引入的问题。
- 如果影响 `develop` 基础可用性，创建 `fix/integration-*` 修复。
- 不使用破坏性命令回滚用户或其他代理改动。
- 需要 revert 时必须用非交互式 `git revert <commit>`，并在 PR 中说明原因。

## 6. develop 合入 main 条件

`develop` 合入 `main` 前必须满足：

- 所有 G1-G9 闸门通过。
- 没有未处理的契约变更。
- 没有真实密钥进入 Git。
- 文档和实际命令一致。
- PR 描述包含完整测试证据。
