# 贡献指南

感谢你关注这个项目。当前仓库采用契约优先的多应用协作方式，提交代码前请先确认变更属于哪个模块，并尽量保持改动边界清晰。

## 开发流程

1. 从最新 `main` 创建工作分支。
2. 阅读 `AGENTS.md` 与 `contracts/README.md`，确认模块边界。
3. 按变更范围执行最小验证。
4. 提交信息使用中文，格式建议为 `docs:`、`fix:`、`feat:`、`refactor:`、`test:`。
5. 发起 PR 时说明变更内容、验证命令、影响范围和未解决风险。

## 模块边界

- Django 相关改动主要位于 `apps/cms-api`、`apps/simple_cms`、`apps/users`、`apps/media_library`。
- FastAPI / AI / RAG 相关改动主要位于 `apps/ai-service`。
- Studio 工作台相关改动主要位于 `apps/studio-web`。
- Public Web 相关改动主要位于 `apps/public-web`。
- 跨模块契约改动必须同步更新 `contracts/` 与相关文档。

## 推荐验证

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml exec -T web python manage.py check
docker compose -f docker-compose.dev.yml exec -T web python manage.py test
curl -I http://127.0.0.1:8001/api/health/
curl -s http://127.0.0.1:8002/health
```

前端变更建议补充：

```bash
cd apps/studio-web
npm run lint
npm run test
npm run build

cd ../public-web
npm run build
```

契约变更建议补充：

```bash
python3 -m json.tool contracts/article.schema.json > /dev/null
python3 -m json.tool contracts/ai-review.schema.json > /dev/null
python3 -m json.tool contracts/ai-suggestion.schema.json > /dev/null
python3 -m json.tool contracts/ai-patch.schema.json > /dev/null
python3 -m json.tool contracts/rag-search.schema.json > /dev/null
python3 -m json.tool contracts/seo-context.schema.json > /dev/null
python3 -m json.tool contracts/tiptap-document.schema.json > /dev/null
```

## 安全要求

- 不要提交 `.env`、`.env.prod`、私钥、Token、真实密码。
- 不要在 PR、Issue、测试快照或日志中粘贴生产凭证。
- 生产部署相关 Secret 只应通过 GitHub Secrets 或服务器环境文件维护。
