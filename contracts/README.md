# 契约包说明

本目录是多代理并行开发的共享契约包。任何 Django、FastAPI、Next.js、TipTap、RAG、Analytics 分支都必须按这里的契约实现。

## 1. 文件清单

| 文件 | 用途 |
| --- | --- |
| `openapi.django.yaml` | Next.js 调用 Django 的公开 API |
| `openapi.ai-service.yaml` | Django 调用 FastAPI 的内部 API |
| `article.schema.json` | Article API 数据结构 |
| `ai-review.schema.json` | AI Review Run 数据结构 |
| `ai-suggestion.schema.json` | AI Suggestion 数据结构 |
| `ai-patch.schema.json` | AI Patch 数据结构 |
| `rag-search.schema.json` | RAG 检索结果结构 |
| `seo-context.schema.json` | Django SEO Context 输出结构 |
| `tiptap-document.schema.json` | TipTap content_json 文档结构 |

## 2. 变更规则

- 契约变更只能通过 `contract-change/*` 分支。
- 功能分支不得私自修改字段名、枚举、错误结构。
- 任何破坏性变更必须升级对应 `*_schema_version`。
- 契约文件变更后必须同步更新 `docs/INTERFACE_CONTRACTS.md`。

## 3. 基础校验

```bash
python3 -m json.tool contracts/article.schema.json > /dev/null
python3 -m json.tool contracts/ai-review.schema.json > /dev/null
python3 -m json.tool contracts/ai-suggestion.schema.json > /dev/null
python3 -m json.tool contracts/ai-patch.schema.json > /dev/null
python3 -m json.tool contracts/rag-search.schema.json > /dev/null
python3 -m json.tool contracts/seo-context.schema.json > /dev/null
python3 -m json.tool contracts/tiptap-document.schema.json > /dev/null
```
