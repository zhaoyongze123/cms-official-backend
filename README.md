# CMS 官网后台

面向企业官网内容生产、SEO 发布与运营监控的内容管理平台。仓库当前采用单仓多应用结构，包含 Django CMS 主站、FastAPI AI/RAG 服务、Next.js 编辑工作台，以及 Next.js 对外公开站。

线上生产域名当前为 [https://yuncan.com](https://yuncan.com)。

## 项目概览

- `apps/cms-api`：Django 主应用，负责内容、后台、发布、SEO 渲染、媒体与对内对外 API。
- `apps/ai-service`：FastAPI AI/RAG 服务，负责 AI 调用、检索与工作流编排。
- `apps/studio-web`：Next.js 内部编辑工作台，承接文章编辑、SEO 监控、后台嵌入页面。
- `apps/public-web`：Next.js 对外站点，承接官网公开展示页。
- `packages/editor-protocol`：前后端共享的编辑协议包。

当前仓库同时维护开发环境与生产环境两套 Docker Compose，并提供 GitHub Actions 自动部署到生产服务器的工作流。

## 技术栈

- 后端：Python 3.12、Django、Gunicorn
- AI 服务：FastAPI、Pytest
- 前端：Next.js 15、React 19、TypeScript
- 编辑器：TipTap
- 数据库：PostgreSQL 15 + pgvector
- 缓存：Redis 7
- 生产部署：Docker Compose、Nginx、GitHub Actions

## 仓库结构

```text
.
├── apps/
│   ├── ai-service/          FastAPI AI/RAG 服务
│   ├── aliyun_monitor/      阿里云监控相关能力
│   ├── cms-api/             Django 主应用
│   ├── media_library/       媒体库
│   ├── public-web/          Next.js 对外站点
│   ├── simple_cms/          Django CMS 业务模块
│   ├── studio-web/          Next.js 内部工作台
│   ├── sys_settings/        系统设置
│   └── users/               用户与权限
├── contracts/               OpenAPI / JSON Schema 契约
├── deploy/
│   └── nginx/               生产 Nginx 模板
├── docker/                  镜像入口与计划任务配置
├── packages/                共享包
├── scripts/                 部署与验证脚本
├── .github/workflows/       GitHub Actions 工作流
├── docker-compose.dev.yml   开发环境 Compose
├── docker-compose.prod.yml  生产环境 Compose
└── Dockerfile               后端基础镜像
```

## 核心能力

- Django Admin 后台与内容管理
- 文章创建、编辑、发布与 SEO 元数据维护
- Next.js 编辑器嵌入 Django Admin
- 对外公开站渲染与内容展示
- AI 审核、生成与 RAG 检索服务骨架
- SEO 监控面板与站点健康数据接口
- Docker 化开发、生产部署与自动化发布

## 本地开发

### 环境要求

- Docker / Docker Compose
- Node.js 22
- Python 3.12

### 环境变量

复制示例配置：

```bash
cp .env.example .env
```

`.env.example` 已包含开发环境所需的核心变量：

- Django：`SECRET_KEY`、`DEBUG`、`ALLOWED_HOSTS`
- PostgreSQL：`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`
- Redis：`REDIS_URL`
- 内部服务：`AI_SERVICE_URL`、`DJANGO_INTERNAL_BASE_URL`
- 前端：`NEXT_PUBLIC_DJANGO_BASE_URL`、`NEXT_PUBLIC_EDITOR_BASE_URL`
- AI / RAG：`AI_PROVIDER`、`RAG_PROVIDER`
- 阿里云：`ALIYUN_*`

### 启动开发环境

```bash
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 docker compose -f docker-compose.dev.yml up -d --build
```

### 开发环境端口

- Django：`http://127.0.0.1:8001`
- Django Health：`http://127.0.0.1:8001/api/health/`
- FastAPI Health：`http://127.0.0.1:8002/health`
- Studio Web：`http://127.0.0.1:3000/django-admin/next-editor/login`
- Public Web：`http://127.0.0.1:3003/solutions`
- PostgreSQL：`127.0.0.1:15432`
- Redis：`127.0.0.1:16379`

### 开发环境最小验证

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml exec -T web python manage.py check
curl -I http://127.0.0.1:8001/api/health/
curl -I http://127.0.0.1:8002/health
curl -I http://127.0.0.1:3000/django-admin/next-editor/login
curl -I http://127.0.0.1:3003/solutions
```

## 测试与质量校验

### Django

```bash
docker compose -f docker-compose.dev.yml exec -T web python manage.py check
docker compose -f docker-compose.dev.yml exec -T web python manage.py test
docker compose -f docker-compose.dev.yml exec -T web python manage.py makemigrations --check --dry-run
```

### FastAPI

```bash
curl -s http://127.0.0.1:8002/health
docker compose -f docker-compose.dev.yml exec -T ai-service pytest
```

### Studio Web

```bash
cd apps/studio-web
npm ci
npm run lint
npm run test
npm run build
```

### Public Web

```bash
cd apps/public-web
npm ci
npm run build
```

### 契约校验

```bash
python3 -m json.tool contracts/article.schema.json > /dev/null
python3 -m json.tool contracts/ai-review.schema.json > /dev/null
python3 -m json.tool contracts/ai-suggestion.schema.json > /dev/null
python3 -m json.tool contracts/ai-patch.schema.json > /dev/null
python3 -m json.tool contracts/rag-search.schema.json > /dev/null
python3 -m json.tool contracts/seo-context.schema.json > /dev/null
python3 -m json.tool contracts/tiptap-document.schema.json > /dev/null
```

## 生产部署

### 生产 Compose

生产环境使用独立 Compose 文件：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

生产服务包括：

- `db`
- `redis`
- `web`
- `ai-service`
- `worker`
- `editor-web`
- `public-web`

### 生产内部端口

- Django：`127.0.0.1:18001`
- FastAPI：`127.0.0.1:18002`
- Studio Web：`127.0.0.1:13000`
- Public Web：`127.0.0.1:13003`
- PostgreSQL：`127.0.0.1:15432`
- Redis：`127.0.0.1:16379`

### Nginx 反向代理

生产环境默认由宿主机 Nginx 转发到 Compose 内服务，当前站点规则对应：

- `/` -> `public-web`
- `/api/` -> Django
- `/django-admin/` -> Django Admin
- `/django-admin/next-editor/` -> Studio Web
- `/django/static/` -> Django 静态文件
- `/django/media/` -> Django 媒体文件

生产 Nginx 模板位于：

- [`deploy/nginx/cms.conf`](deploy/nginx/cms.conf)

### 生产环境变量

生产环境需要根目录 `.env.prod`。至少应包含：

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `CMS_SITE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_URL`
- `INTERNAL_API_TOKEN`
- `AI_PROVIDER`
- `AI_SERVICE_URL`
- `DJANGO_INTERNAL_BASE_URL`
- `NEXT_PUBLIC_DJANGO_BASE_URL`
- 所有真实 AI、RAG、阿里云相关凭证

注意：

- 不要把 `.env.prod` 提交到 Git。
- GitHub Actions 使用 `PROD_ENV_FILE` Secret 下发完整 `.env.prod`。

### 部署脚本

生产部署脚本位于：

- [`scripts/deploy_prod.sh`](scripts/deploy_prod.sh)

脚本核心行为：

1. 构建后端镜像 `cms-backend:prod`
2. 执行 `docker compose ... up -d --build --remove-orphans`
3. 执行 Django 数据库迁移
4. 执行 `collectstatic`
5. 输出容器状态
6. 可选更新服务器 Nginx 配置并重载

本地在生产服务器执行：

```bash
chmod +x scripts/deploy_prod.sh
./scripts/deploy_prod.sh
```

## GitHub Actions 自动部署

工作流文件：

- [`.github/workflows/deploy-main.yml`](.github/workflows/deploy-main.yml)

触发条件：

- `push` 到 `main`
- 手动 `workflow_dispatch`

### CI 校验内容

`verify` 阶段会执行：

- Django `check`
- Django `test`
- FastAPI `pytest`
- Studio Web `lint`
- Studio Web `test`
- Studio Web `build`
- Public Web `build`
- `contracts/` JSON Schema 校验
- 后端 Docker 镜像构建

### 部署阶段行为

`deploy` 阶段会：

1. 安装 SSH 私钥
2. 通过 `PROD_ENV_FILE` Secret 写入 `.env.prod`
3. 打包当前仓库代码
4. 上传部署包到服务器目录
5. 远程执行 `scripts/deploy_prod.sh`

### 需要配置的 GitHub Secrets

- `PROD_SERVER_HOST`
- `PROD_SERVER_USER`
- `PROD_SSH_PRIVATE_KEY`
- `PROD_DEPLOY_PATH`
- `PROD_NGINX_SITE_PATH`
- `PROD_ENV_FILE`

推荐说明：

- `PROD_SERVER_HOST`：生产服务器 IP 或域名
- `PROD_SERVER_USER`：部署 SSH 用户
- `PROD_DEPLOY_PATH`：服务器上的部署目录
- `PROD_NGINX_SITE_PATH`：宿主机 Nginx 站点配置路径
- `PROD_ENV_FILE`：完整 `.env.prod` 内容

## API 与路由概览

### Django 关键入口

- `/api/health/`
- `/api/articles/`
- `/api/articles/{id}/`
- `/api/articles/{id}/analytics/`
- `/api/dashboard/seo-summary/`
- `/django-admin/`
- `/django-admin/analytics`
- `/django-admin/next-editor/*`
- `/sitemap.xml`

### FastAPI 关键入口

- `/health`

### Studio Web 关键入口

- `/django-admin/next-editor/login`
- `/django-admin/next-editor/django-admin/analytics`
- `/django-admin/next-editor/studio/articles`

### Public Web 关键入口

- `/solutions`

## 运行机制说明

### Django 与 Studio Web 的关系

- Django Admin 提供后台与业务真相。
- Studio Web 通过 Django 暴露的 API 获取内容与监控数据。
- `/django-admin/next-editor/*` 通过 Django 代理到 Next.js。

### 生产环境代理策略

- Django 容器通过 `NEXT_EDITOR_INTERNAL_URL=http://editor-web:3000` 访问编辑器服务。
- Studio Web 在生产 SSR 场景优先通过 `NEXT_PUBLIC_DJANGO_BASE_URL` 访问公网 Django 基地址。
- 这一组合用于避免容器内 SSR 取数与宿主机 Nginx 路径前缀不一致的问题。

## 常见运维命令

### 查看生产容器状态

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

### 查看生产日志

```bash
docker logs -f cms-web-1
docker logs -f cms-editor-web-1
docker logs -f cms-public-web-1
docker logs -f cms-ai-service-1
```

### 重建单个生产服务

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate web
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate editor-web
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate public-web
```

### 执行 Django 管理命令

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web python manage.py migrate --noinput
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web python manage.py createsuperuser
```

## 安全说明

- 不要提交 `.env`、`.env.prod`、私钥、Token、真实密码。
- GitHub Actions 不应打印 `PROD_ENV_FILE` 内容。
- 所有生产敏感信息请只保存在 GitHub Secrets 或服务器环境文件中。

## 许可证

当前仓库未声明开源许可证。如需对外开源，请补充 `LICENSE` 文件并在 README 中明确授权方式。
