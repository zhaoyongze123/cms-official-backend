# Git 与 GitHub Actions 接手步骤

本文面向第一次接手本项目的同事。源码包不包含旧 .git 历史和本机依赖，建议重新初始化一个干净仓库。

## 1. 初始化本地仓库

~~~bash
tar -xzf cms官网后台-源码部署包-20260828.tar.gz
cd cms官网后台

git init -b main
git add .
git commit -m "chore: initialize cms project"
git remote add origin https://github.com/<组织或账号>/cms-official-backend.git
git push -u origin main
~~~

如果使用现有仓库，则直接 git clone，不要把私密交接目录复制进源码目录后执行 git add .。

## 2. GitHub 仓库设置

1. 创建一个私有 GitHub 仓库，或使用现有 cms-official-backend 仓库。
2. 将默认分支设为 main。
3. 建议保护 main：要求 Pull Request、至少一次审核和 Actions 检查通过后才能合并。
4. 确认 Actions 权限允许工作流读写 Packages。
5. 配置 Actions Variables：
   - CMS_SITE_URL：生产官网地址，例如 https://www.example.com。
   - CMS_ADMIN_SITE_URL：后台地址；如果后台和官网同域，填写同一个地址。
   - ACR_REGISTRY、ACR_NAMESPACE：使用阿里云 ACR 时填写。
6. 配置 Actions Secrets：
   - ACR_USERNAME
   - ACR_PASSWORD

GHCR 使用工作流内置 GITHUB_TOKEN，不需要把个人密码写入仓库。服务器如果主动拉取私有 GHCR 镜像，还要在服务器单独配置只读 Package Token。

## 3. 触发与验收

推送到 main 或在 Actions 页面手动执行 workflow_dispatch。先看 verify，再看 build-and-push，最后的 deploy-ready 只是说明服务器需要主动执行部署脚本。

生产机执行：

~~~bash
cd /opt/yuncan-cms
docker compose --env-file .env.prod -f docker-compose.prod.yml config -q
bash scripts/deploy_pull_prod.sh
~~~

若 Actions 失败，先修复对应阶段，不要在生产机直接修改源码绕过检查。若镜像已推送但生产机失败，保留失败日志、容器状态和镜像标签，再决定重试或回滚。

## 4. 新增或修改变量

- 只在 .env.example、.env.prod.example、.env.public-web.prod.example 中提交变量名和安全示例值。
- 真实 Token、密码、私钥、生产数据库导出、用户线索和媒体卷只能进入密码管理器、服务器私有文件或加密交接包。
- 前端以 NEXT_PUBLIC_ 开头的变量会进入浏览器，不能放密钥。
- 修改 Compose 服务、Nginx 路由或环境变量后，必须在 PR 中说明影响的服务和验证命令。
