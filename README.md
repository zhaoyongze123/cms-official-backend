# 企业内容管理平台（CMS 官网后台）

本仓库当前以 `feature/django-admin-next-editor-embed` 的最终版本为基线，代码结构已经收口为：

- `apps/cms-api`：Django CMS 主应用
- `apps/ai-service`：FastAPI AI / RAG 服务
- `apps/studio-web`：Next.js 内部编辑器
- `apps/public-web`：Next.js 对外站点

当前仓库同时提供两套 Docker Compose：

- `docker-compose.dev.yml`：本地开发热更新
- `docker-compose.prod.yml`：生产部署

默认 `docker-compose.yml` 通过 `include` 指向开发版，因此本地继续执行 `docker compose ...` 即可。

## 1. 仓库目录

```text
apps/
  cms-api/        Django CMS
  ai-service/     FastAPI AI/RAG
  studio-web/     Next.js 编辑器
  public-web/     Next.js 公开站
deploy/
  nginx/          生产 Nginx 配置
scripts/
  deploy_prod.sh  生产部署脚本
.github/workflows/
  deploy-main.yml main 自动部署工作流
```

## 2. 开发环境

### 2.1 环境变量

复制根目录 `.env.example`：

```bash
cp .env.example .env
```

### 2.2 启动开发环境

```bash
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 docker compose up -d --build
```

开发环境默认暴露：

- Django：`http://127.0.0.1:8001`
- Django Health：`http://127.0.0.1:8001/api/health/`
- Studio Web：`http://127.0.0.1:3000/django-admin/next-editor/login`
- Public Web：`http://127.0.0.1:3003/solutions`
- AI Service Health：`http://127.0.0.1:8002/health`

### 2.3 开发环境最小验证

```bash
docker compose ps
docker compose exec -T web python manage.py check
curl -I http://127.0.0.1:8001/api/health/
curl -I http://127.0.0.1:3000/django-admin/next-editor/login
curl -I http://127.0.0.1:3003/solutions
```

## 3. 生产环境

### 3.1 生产 Compose

生产环境使用：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

生产版包含：

- `db`
- `redis`
- `web`
- `ai-service`
- `worker`
- `editor-web`
- `public-web`

- 生产环境不再使用容器内 Nginx 抢占宿主机 `80/443`
- 统一改为 Docker 服务监听宿主机 `127.0.0.1` 高位端口，再由服务器现有 BT/nginx 反代

生产内部端口：

- Django：`127.0.0.1:18001`
- FastAPI：`127.0.0.1:18002`
- Studio：`127.0.0.1:13000`
- Public Web：`127.0.0.1:13003`
- Postgres：`127.0.0.1:15432`
- Redis：`127.0.0.1:16379`

BT/nginx 反代规则：

- `/` -> `public-web`
- `/api/` -> Django
- `/django-admin/` -> Django Admin
- `/django/next-editor/` -> Studio

### 3.2 生产环境变量

先复制模板：

```bash
cp deploy/env.prod.example .env.prod
```

至少补齐：

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `CMS_SITE_URL`
- `POSTGRES_PASSWORD`
- `INTERNAL_API_TOKEN`
- 所有真实 AI / 阿里云凭证

### 3.3 生产部署命令

```bash
chmod +x scripts/deploy_prod.sh
./scripts/deploy_prod.sh
```

脚本会执行：

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml ps
```

## 4. GitHub Actions 自动部署

已提供工作流：

- `.github/workflows/deploy-main.yml`

触发条件：

- `main` 分支收到 `push`

工作流行为：

1. 在 GitHub Actions 中生成 `.env.prod`
2. 通过 `rsync` 同步仓库到生产机 `/root/cms官网后台`
3. 上传 `.env.prod`
4. 在服务器执行 `./scripts/deploy_prod.sh`，脚本会显式使用 `.env.prod`
5. 将 `deploy/nginx/cms.conf` 安装为 BT/nginx 站点配置并重载 nginx

### 4.1 需要配置的 GitHub Secrets

服务器：

- `PROD_SERVER_HOST`
- `PROD_SERVER_PASSWORD`

Django / 站点：

- `PROD_DJANGO_SETTINGS_MODULE`
- `PROD_SECRET_KEY`
- `PROD_ALLOWED_HOSTS`
- `PROD_CSRF_TRUSTED_ORIGINS`
- `PROD_CMS_SITE_URL`
- `PROD_INTERNAL_API_TOKEN`

数据库：

- `PROD_POSTGRES_DB`
- `PROD_POSTGRES_USER`
- `PROD_POSTGRES_PASSWORD`

前端：

- `PROD_NEXT_PUBLIC_DJANGO_BASE_URL`
- `PROD_NEXT_PUBLIC_EDITOR_BASE_URL`

AI / RAG：

- `PROD_AI_PROVIDER`
- `PROD_AI_PROMPT_VERSION`
- `PROD_SILICONFLOW_BASE_URL`
- `PROD_SILICONFLOW_API_KEY`
- `PROD_SILICONFLOW_CHAT_MODEL`
- `PROD_SILICONFLOW_FAST_MODEL`
- `PROD_SILICONFLOW_EMBEDDING_MODEL`
- `PROD_SILICONFLOW_EMBEDDING_DIMENSIONS`
- `PROD_SILICONFLOW_RERANK_MODEL`
- `PROD_RAG_PROVIDER`
- `PROD_RAG_DATABASE_URL`
- `PROD_RAG_CHUNK_TABLE`
- `PROD_RAG_SOURCE_TABLE`
- `PROD_RAG_SOURCE_TYPE`
- `PROD_RAG_ENABLE_RERANK`
- `PROD_RAG_FORCE_MOCK`
- `PROD_RAG_VECTOR_DIMENSIONS`
- `PROD_RAG_CHUNK_SIZE`
- `PROD_RAG_CHUNK_OVERLAP`

阿里云：

- `PROD_ALIYUN_ACCESS_KEY_ID`
- `PROD_ALIYUN_ACCESS_KEY_SECRET`
- `PROD_ALIYUN_REGION`
- `PROD_ALIYUN_DNS_REGION`
- `PROD_ALIYUN_DNS_DOMAINS`
- `PROD_ALIYUN_CMS_NAMESPACE`
- `PROD_ALIYUN_CMS_METRICS`

## 5. 服务器部署目标

当前生产目标服务器：

- 主机：`139.224.245.94`
- 部署目录：`/root/cms官网后台`

服务器当前已确认：

- Docker / Compose 可用
- 宿主机 `80/443` 已被 BT/nginx 占用
- 宿主机 `6379` 已被现有 redis 占用

因此生产部署必须走“高位本地端口 + BT/nginx 反代”，不能直接占用 `80/443/6379`

## 6. 当前限制

- GitHub Actions 自动部署依赖服务器 SSH 密码可正常登录；若服务器密码或 SSH 配置不正确，工作流会失败。
- 当前生产 Nginx 配置默认走 `80` 端口，未包含 HTTPS 证书签发和自动续期。
- 当前 `main` 自动部署工作流是“部署 main 到服务器”，不会自动合并任何其他分支。
