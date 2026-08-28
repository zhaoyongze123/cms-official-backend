# 项目交接入口

更新时间：2026-08-28

本目录是交给后续维护人员的公开交接说明。当前源码基线为 `320b6a37eec522cf957499113166d32945c5992b`，仓库地址为 `https://github.com/zhaoyongze123/cms-official-backend`。

## 先看什么

1. [DEPLOYMENT.md](DEPLOYMENT.md)：第一次部署、日常发布、回滚和 GitHub Actions 发布链路。
2. [GIT-AND-ACTIONS.md](GIT-AND-ACTIONS.md)：同事从源码包初始化 Git 仓库、绑定 GitHub 和配置 Actions 的操作步骤。
3. [DATABASE.md](DATABASE.md)：完整数据库初始化文件的内容、恢复方式和媒体文件恢复方式。
4. [SERVER.md](SERVER.md)：生产服务器目录、容器、端口、Nginx 路由和已知运维风险。
5. [ACCESS.md](ACCESS.md)：账号、权限和敏感凭据交接规则。

## 交付物分层

### 源码仓库

仓库中保留可以审查和重新构建的项目文件：

- Django CMS、FastAPI AI Service、Studio Web、Public Web。
- 数据库迁移、业务管理命令、前后端测试和共享契约。
- Dockerfile、生产/开发 Compose、Nginx 模板、部署脚本。
- `.github/workflows/deploy-main.yml` GitHub Actions 工作流。
- `docs/assets/` 中 README 实际引用的预览图片。

### 本机私密交接目录

完整数据库、媒体数据、生产环境变量、账号密码和服务器快照位于仓库同级的：

```text
../cms官网后台-交接私密-20260828/
```

该目录不在 Git 仓库内，也不应上传 GitHub。它的文件权限已收紧，交接时应通过密码管理器或加密存储转交，不要直接发到群聊。

### 源码部署包

本次整理会在仓库同级生成一个不含 `.git`、依赖缓存、构建缓存和生产密钥的源码包：

```text
../cms官网后台-源码部署包-20260828.tar.gz
```

它适合交给同事初始化一个新 Git 仓库或上传到内部制品库。完整数据不放进该包，数据交接看 `DATABASE.md`。

## 系统边界

```text
浏览器
  ├─ Nginx / HTTPS
  │    ├─ Public Web (Next.js)
  │    ├─ Studio Web (Next.js，嵌入 Django Admin)
  │    └─ Django API / Admin
  └─ Django
       ├─ PostgreSQL 15 + pgvector
       ├─ Redis 7
       └─ FastAPI AI Service / Worker / Lead Notifier
```

状态事实源在 Django 和 PostgreSQL：Public Web、Studio Web 通过 API 或反代读取，不要在前端另建一份文章、设置或产品数据。

## 接手第一天必须确认

- GitHub 仓库、Actions、GHCR/ACR 镜像权限能否登录。
- 生产服务器 SSH、Docker、Nginx 和 `/data/yuncan-cms` 数据目录权限。
- `.env.prod` 和 `.env.public-web.prod` 是否与当前域名、镜像仓库一致。
- 数据库恢复演练是否成功，媒体文件是否能访问。
- Nginx 重复 `server_name` 警告和失效的 `docker-prune.sh` 定时任务是否已处理。
- TLS 证书到期时间和续期负责人是否已经登记。
