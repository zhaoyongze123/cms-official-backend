# 企业内容管理平台 (CMS)

基于 Django 构建的企业内容管理系统，当前以前后台一体的 Django 站点为唯一对外入口，并保留 FastAPI AI/RAG Service 与仅用于文章编辑区的 Next.js Studio 作为内部服务。仓库默认运行方式已经收口为开发热更新模式，不再维护单独的 compose dev 覆盖文件。

## 1. 当前底座能力

- `web`：Django CMS，运行入口收口到 `apps/cms-api/`，负责内容、权限和公开页面。
- `ai-service`：FastAPI 骨架，负责 AI/RAG 服务健康检查和后续内部接口。
- `studio-web`：Next.js 内部编辑器服务，运行入口位于 `apps/studio-web/`，仅承接文章编辑区，由 Django Admin 同域嵌入。
- `public-web`：Next.js 公开站点工程，运行入口位于 `apps/public-web/`，当前已纳入仓库与 compose，但是否完全接管公开站仍以 PR-21 cutover 验收结果为准。
- `db`：PostgreSQL 15。
- `redis`：Redis 7。
- `worker`：异步任务占位 worker，后续承接 Celery 或队列消费。

## 2. 关键文档

- 计划文档：`docs/AI_SEO_PUBLISHING_PLAN.md`
- 执行规则：`AGENTS.md`
- 契约包：`contracts/README.md`

## 3. 环境要求

- Docker Engine 20.10+
- Docker Compose v2
## 4. 环境变量

复制 `.env.example` 到 `.env`，至少确认以下变量：

- `DJANGO_SETTINGS_MODULE`
- `POSTGRES_*`
- `REDIS_URL`
- `INTERNAL_API_TOKEN`
- `AI_PROVIDER`

真实开发接入硅基流动前，必须配置：

- `SILICONFLOW_BASE_URL`
- `SILICONFLOW_API_KEY`
- `SILICONFLOW_CHAT_MODEL`
- `SILICONFLOW_EMBEDDING_MODEL`
- `SILICONFLOW_RERANK_MODEL`

## 5. 快速启动

1. 复制环境变量：
   ```bash
   cp .env.example .env
   ```
2. 构建并启动全部服务：
   ```bash
   COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 docker compose up -d --build
   ```
3. 初始化数据库：
   ```bash
   docker compose exec web python manage.py migrate
   ```
4. 创建管理员：
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

## 6. 本地访问地址

- Django 前台：`http://127.0.0.1:8001/`
- Django health：`http://127.0.0.1:8001/api/health/`
- Django 后台：`http://127.0.0.1:8001/django-admin/`
- Studio 工作台：`http://127.0.0.1:8001/studio/`
- Public Web 开发站：`http://127.0.0.1:3003/`
- FastAPI health：`http://127.0.0.1:8002/health`

## 7. A00 基础验证

```bash
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 docker compose up -d --build
docker compose exec -T ai-service pytest
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py test
cd apps/studio-web && npm run lint
cd apps/studio-web && npm run test
cd apps/studio-web && npm run build
curl -s http://127.0.0.1:8001/api/health/
curl -s http://127.0.0.1:8002/health
```

## 8. 权限初始化（可选）

```bash
docker compose exec web python manage.py setup_roles
```

## 9. A05 RAG 验证

```bash
docker compose exec -T web python manage.py rebuild_knowledge_index --dry-run
docker compose exec -T web python manage.py rebuild_knowledge_index --source article
docker compose exec -T web python manage.py rag_query "SEO Schema" --limit 5
docker compose exec -T web python manage.py test
```
