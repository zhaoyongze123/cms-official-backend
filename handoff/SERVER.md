# 生产服务器交接

以下内容来自 2026-08-28 的只读检查，生产服务器本身没有在本次整理中修改。

## 1. 主机与目录

~~~text
生产主机：139.224.245.94
源码与部署目录：/opt/yuncan-cms
持久化数据目录：/data/yuncan-cms
生产域名：https://www.yuncan.com
~~~

精确 SSH 密码、数据库密码、后台账号和环境变量在私密交接目录的 access/、production-env/ 中，不在本文件重复。

## 2. 容器服务与本机端口

| 服务 | 作用 | 本机端口 |
| --- | --- | --- |
| db | PostgreSQL 15 + pgvector | 127.0.0.1:15432 |
| redis | Redis 7/AOF | 127.0.0.1:16379 |
| web | Django/Gunicorn | 127.0.0.1:18001 |
| ai-service | FastAPI AI 服务 | 127.0.0.1:18002 |
| worker | AI/后台任务进程 | 无宿主机端口 |
| lead-notifier | 线索通知进程 | 无宿主机端口 |
| editor-web | Next.js Studio | 127.0.0.1:13000 |
| public-web | Next.js 官网 | 127.0.0.1:13003 |

对外流量由 Nginx 终止 TLS：

- /、/solutions、/articles/* 转到 Public Web。
- /api/*、/django/*、/django-admin/* 转到 Django。
- /django-admin/next-editor/* 转到 Studio Web。
- /django/media/*、/media/* 从 /data/yuncan-cms/media 提供或转发。

## 3. Nginx

仓库模板是 deploy/nginx/cms.conf，私密交接目录的 server/nginx-www.yuncan.com.conf 是生产机当时的配置快照。部署前先确认真实启用文件路径，再执行：

~~~bash
nginx -t
systemctl reload nginx
~~~

只改 sites-available 不会自动生效，必须确认 sites-enabled 的软链接或实际加载路径。不要把服务器上手工修过的配置直接覆盖仓库模板，先比较差异并把有效变更写回源码。

## 4. 当前已知风险

- 只读检查时 Nginx nginx -t 虽然成功，但有重复 server_name 警告，涉及 yuncan.com、www.yuncan.com 和 IP。需要清理重复站点配置，否则实际命中的 server block 可能依赖加载顺序。
- /opt/yuncan-cms/scripts/docker-prune.sh 被 root crontab 每周日 04:00 引用，但检查时文件不存在。应删除失效任务或补齐经过审查的清理脚本，不能让定时任务长期静默失败。
- 证书有两个到期节点：Let's Encrypt 证书记录为 2026-10-15，/etc/ssl/yuncan.com/ 下证书记录为 2026-09-10。接手人应确认每个域名实际使用的证书和自动续期任务。
- 服务器快照中的 Git HEAD 为旧提交 fe55eb9c254ca33183b15b1cd9a70b9c836778f0， 而本次源码基线为 320b6a37eec522cf957499113166d32945c5992b。部署前必须明确是使用远程镜像还是服务器本地源码，不要混用两个版本。
- 服务器保留了多个历史 Docker 镜像标签。清理前先确认回滚所需标签，再按镜像仓库和发布记录处理。

## 5. 服务器日常命令

~~~bash
cd /opt/yuncan-cms
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=200 web public-web editor-web
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web python manage.py migrate --plan
docker system df
~~~

生产机不要使用 docker compose down -v，除非已经确认要删除本机数据库和 Redis 数据卷。不要在服务器上把 .env.prod、数据库 dump 或日志直接上传到公开仓库。

## 6. 接手顺序

1. 使用私密清单登录并确认 Docker、Nginx、磁盘和证书状态。
2. 核对 /opt/yuncan-cms 当前源码、Compose 文件和镜像标签。
3. 备份 /data/yuncan-cms/postgres、media 和当前 .env。
4. 先在非生产环境按 DEPLOYMENT.md 做一次镜像拉取和完整数据库恢复演练。
5. 生产切换时保留旧镜像和数据库备份，完成健康检查后再清理历史资源。
