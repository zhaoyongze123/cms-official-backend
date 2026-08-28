# 账号与权限交接

## 1. 敏感资料位置

本机私密交接目录：

~~~text
../cms官网后台-交接私密-20260828/
~~~

其中：

- access/服务器与数据库凭据.txt：服务器 SSH、数据库、后台账号和权限清单。
- production-env/.env.prod：生产 Django、数据库、Redis、AI、邮件、镜像等变量。
- production-env/.env.public-web.prod：Public Web 的公开运行变量。
- server/production-state.txt：服务器容器、镜像、数据目录、Nginx、Cron 的只读快照。

仓库文档只记录账号类别和配置变量名，不记录密码、Token、私钥或完整连接串。

## 2. 需要交接的权限类别

| 类别 | 用途 | 交接位置 |
| --- | --- | --- |
| 服务器 SSH 管理权限 | Docker、Nginx、磁盘、证书和部署脚本 | 私密凭据清单 |
| 生产目录权限 | /opt/yuncan-cms 和 /data/yuncan-cms | 服务器现场确认 |
| PostgreSQL 应用角色 | Django 业务读写 | 私密凭据清单 / .env.prod |
| PostgreSQL 运维角色 | Navicat 等人工维护操作 | 私密凭据清单 |
| Django 管理员 | 内容、站点设置、用户和权限 | 私密凭据清单 |
| GitHub 仓库管理员 | 分支保护、Actions、Secrets、Packages | GitHub 组织管理员 |
| GHCR / ACR | 构建推送和服务器拉取镜像 | GitHub Secrets / 服务器登录态 |
| 阿里云、微信、AI、SMTP | DNS/监控、微信分享、AI/RAG、线索通知 | .env.prod 与对应平台 |
| Nginx/TLS | 域名转发和证书续期 | 服务器 /etc/nginx、证书管理 |

## 3. 建议的接手动作

1. 用密码管理器逐项转交，不要把账号密码写进 GitHub Issue、README 或聊天记录。
2. 同事确认登录成功后，立即把个人账号加入 GitHub 仓库和服务器 sudo 组，避免继续共用 root。
3. 为服务器创建实名运维账号，确认 Docker 权限、Nginx reload 权限和备份目录权限后，再逐步减少 root 使用。
4. 交接完成后轮换 root 密码、数据库运维密码、GHCR/ACR Token、AI/微信/SMTP 密钥和 Django 管理员密码。
5. 轮换后同步更新服务器环境文件和密码管理器，并重新跑一次健康检查、线索表单和后台登录。

## 4. 最小权限原则

- GitHub Actions 只使用 contents: read 和 packages: write 所需权限。
- 服务器拉取镜像使用只读仓库凭据，不把 GitHub 管理员 Token 放到服务器。
- Public Web 只获得公开 API 地址，不获得数据库、Redis、AI 或内部 Token。
- 日常内容维护使用 Django staff 用户，不使用数据库超级用户改业务数据。
- 数据库导出文件和媒体包按生产数据处理，访问人员、保存位置和删除时间要登记。
