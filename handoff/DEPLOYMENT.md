# 部署手册

## 1. 发布链路

当前生产发布分成两个阶段：

1. GitHub Actions 在 main 的 push 或手动触发后，执行测试、构建前端和后端镜像，并推送到 GHCR；如果配置了 ACR，还会同步到 ACR。
2. 生产服务器执行 scripts/deploy_pull_prod.sh，主动登录镜像仓库、拉取镜像、迁移数据库、收集静态文件并做页面健康检查。

GitHub Actions 当前不会 SSH 登录生产服务器，也不会自动执行第二阶段。.github/workflows/deploy-main.yml 最后的 deploy-ready 只是输出提示，这一点不要按“自动上线”理解。

## 2. 生产目录

默认生产目录和数据目录如下：

~~~text
/opt/yuncan-cms/
├── .env.prod                    # 私密，不进 Git
├── .env.public-web.prod         # 私密，不进 Git
├── docker-compose.prod.yml
├── Dockerfile
├── apps/
├── docker/
├── deploy/nginx/cms.conf
└── scripts/deploy_pull_prod.sh

/data/yuncan-cms/
├── postgres/                    # PostgreSQL 数据卷
├── redis/                       # Redis AOF 数据
├── media/                       # Django 媒体文件
├── static/                      # collectstatic 产物
└── public-web-assets/            # 服务器上的公共站资源
~~~

生产 Compose 启动 8 个服务：db、redis、web、ai-service、worker、lead-notifier、editor-web、public-web。

## 3. 首次接手部署

### 准备主机

- Linux 主机安装 Docker Engine 和 Docker Compose v2。
- 安装 git、curl、nginx；服务器主动拉取镜像时不依赖 GitHub Runner 的入站 SSH。
- 创建 /opt/yuncan-cms 和 /data/yuncan-cms/{postgres,redis,media,static,public-web-assets}。
- 确认 80/443 对外开放，15432、16379、18001、18002、13000、13003 仅绑定 127.0.0.1。

### 获取源码和环境文件

推荐直接克隆仓库：

~~~bash
git clone https://github.com/zhaoyongze123/cms-official-backend.git /opt/yuncan-cms
cd /opt/yuncan-cms
git checkout main
~~~

将私密交接目录中的 .env.prod 和 .env.public-web.prod 放到 /opt/yuncan-cms/。不要把它们改名为示例文件，也不要提交到 Git。

生产配置至少要确认：SECRET_KEY、ALLOWED_HOSTS、CSRF_TRUSTED_ORIGINS、CMS_SITE_URL、PostgreSQL 连接信息、INTERNAL_API_TOKEN、PUBLIC_WEB_REVALIDATE_TOKEN 和三个业务镜像地址。Public Web 只应读取 NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL、NEXT_PUBLIC_SITE_URL 等公开变量，不能把数据库或后端 Token 放进 .env.public-web.prod。

### 首次启动

~~~bash
cd /opt/yuncan-cms
docker compose --env-file .env.prod -f docker-compose.prod.yml config -q
docker login <镜像仓库地址>
bash scripts/deploy_pull_prod.sh
~~~

脚本默认 SKIP_GIT_SYNC=1，使用当前目录文件，只拉镜像。若服务器需要每次先同步仓库代码：

~~~bash
SKIP_GIT_SYNC=0 \
APP_BRANCH=main \
APP_REPO=https://github.com/zhaoyongze123/cms-official-backend.git \
bash scripts/deploy_pull_prod.sh
~~~

开启仓库同步后，脚本会把工作树重置到 origin/main，服务器上手工改过的源码会被覆盖。生产环境变量仍需单独保留，因为它们被 .gitignore 排除。

## 4. 日常发布

1. 同事把代码合并到 main。
2. Actions 的 verify 阶段通过后，build-and-push 推送镜像。
3. 生产机执行 cd /opt/yuncan-cms && bash scripts/deploy_pull_prod.sh。
4. 检查 docker compose ... ps、/api/health/、Public Web 首页、/solutions 和 Studio 登录页。

生产环境建议把业务镜像从 latest 改为 Actions 生成的 sha-<完整 commit> 标签，发布记录和回滚会更清楚；数据库镜像固定 pg15，Redis 镜像固定 7-alpine。

## 5. GitHub Actions 配置

工作流文件：.github/workflows/deploy-main.yml。

必需或按使用情况配置：

- GitHub Packages 权限：工作流使用内置 GITHUB_TOKEN 推送 GHCR。
- Repository Variables：CMS_SITE_URL、CMS_ADMIN_SITE_URL；使用 ACR 时再配 ACR_REGISTRY、ACR_NAMESPACE。
- Repository Secrets：使用 ACR 时配置 ACR_USERNAME、ACR_PASSWORD。
- 服务器主动拉取 GHCR 时，应在服务器配置 GHCR 登录态，或向脚本传入 GHCR_USERNAME、GHCR_TOKEN。

Actions 中使用的 mock 数据库、Redis、AI 配置只用于 CI，不能复制到生产环境。工作流会执行 Django check/test、FastAPI pytest、Studio lint/test/build、Public Web build 和 JSON Schema 校验。

## 6. 直接在服务器构建

如果镜像仓库不可用，可以使用 scripts/deploy_prod.sh 在服务器从源码构建。它会构建后端镜像、停止当前 Compose 项目、启动后端服务、迁移数据库、收集静态文件、更新 Nginx，然后启动两个 Next.js 服务。

使用前必须设置 NGINX_SITE_PATH 指向真正的 Nginx 站点配置文件，并先备份数据库和 /data/yuncan-cms/media。脚本默认会执行 Git 同步和 git reset --hard origin/main，生产机有未提交改动时不要直接运行。

## 7. 回滚

应用回滚：

1. 找到上一次成功 Actions 的 commit SHA。
2. 在 .env.prod 中把 BACKEND_IMAGE、STUDIO_IMAGE、PUBLIC_IMAGE 改成对应的 sha-<commit> 标签。
3. 运行 docker compose ... pull 和 bash scripts/deploy_pull_prod.sh。

数据库回滚不能只靠镜像标签。涉及迁移时必须先做 PostgreSQL 快照或逻辑备份，再按 DATABASE.md 的恢复步骤操作；不要在没有备份的情况下执行 down -v。

## 8. 常见故障检查

~~~bash
cd /opt/yuncan-cms
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=200 web public-web editor-web
curl -fsS -H 'Host: www.yuncan.com' http://127.0.0.1:18001/api/health/
curl -I --max-time 10 http://127.0.0.1:13003/
curl -I --max-time 10 http://127.0.0.1:13000/django-admin/next-editor/login
nginx -t
~~~

curl: (56) Recv failure: Connection reset by peer 先看对应容器是否在重启、健康检查是否失败和最近 200 行日志，不要先反复刷新浏览器。Public Web 首页验收文案失败时，先确认 public-web 使用的镜像标签和 NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL，再检查 Django API 是否健康。
