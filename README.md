# 企业内容管理平台 (CMS)

基于 Django 构建的企业内容管理系统，当前正在升级为 `Django CMS + FastAPI AI/RAG Service + Next.js Studio` 的三端架构。

## 1. 当前底座能力

- `web`：Django CMS，负责内容、权限和公开页面。
- `ai-service`：FastAPI 骨架，负责 AI/RAG 服务健康检查和后续内部接口。
- `editor-web`：Next.js Studio 壳应用，负责后续运营工作台。
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
- Node.js 22+（本地单独运行 `editor-web` 时需要）

## 4. 环境变量

复制 `.env.example` 到 `.env`，至少确认以下变量：

- `DJANGO_SETTINGS_MODULE`
- `POSTGRES_*`
- `REDIS_URL`
- `INTERNAL_API_TOKEN`
- `AI_PROVIDER`
- `NEXT_PUBLIC_DJANGO_BASE_URL`
- `NEXT_PUBLIC_EDITOR_BASE_URL`
- `NEXT_PUBLIC_AUTH_MODE`

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
   cd editor-web && npm install && cd ..
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
- FastAPI health：`http://127.0.0.1:8002/health`
- Next.js Studio：`http://127.0.0.1:3000/`
- Next.js Studio 文章页：`http://127.0.0.1:3000/studio/articles`

## 7. A00 基础验证

```bash
cd editor-web && npm install && cd ..
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 docker compose up -d --build
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py test
curl -s http://127.0.0.1:8001/api/health/
curl -s http://127.0.0.1:8002/health
curl -I http://127.0.0.1:3000/studio/articles
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
