# 数据库与媒体交接

## 1. 交付文件

私密交接目录中的：

~~~text
database/cms_initial.sql
media/cms_media.tar.gz
~~~

cms_initial.sql 是一次完整的 PostgreSQL plain-text dump，不是增量 SQL。它包含数据库创建语句、vector 扩展、40 张表、序列、索引、约束和 40 个表的数据段；文件开头会先 DROP DATABASE IF EXISTS wagtailcms，随后创建并连接到 wagtailcms。

媒体包包含 Django media/ 下的媒体目录和文件，例如 library/、上传图片、文件和 PDF。数据库记录中的媒体路径与媒体包需要一起交接。

## 2. 数据敏感性

数据库包含文章、站点设置、产品选项、知识库、用户、后台日志、会话和联系线索等数据。它包含个人信息和认证相关数据，只能放在受控的私密存储中。不要提交到 GitHub、公开网盘或工单附件。

## 3. 恢复到全新生产环境

以下操作会覆盖目标数据库。执行前先确认目标主机和环境文件，并做一次现有数据库备份；不要在仍有业务连接时直接恢复。

~~~bash
cd /opt/yuncan-cms

# 先停掉会连接数据库的服务，只保留 PostgreSQL。
docker compose --env-file .env.prod -f docker-compose.prod.yml stop \
  web ai-service worker lead-notifier editor-web public-web
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db

# 从宿主机把完整 dump 输入容器内 psql。
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db \
  sh -lc 'psql -U "$POSTGRES_USER" -d postgres' \
  < /交接目录/database/cms_initial.sql
~~~

该 SQL 自带 DROP DATABASE、CREATE DATABASE 和 \connect，不要再把它当作只针对某一张表的增量文件执行。执行用户必须有创建和删除数据库的权限；生产 Compose 默认的 PostgreSQL 管理角色应满足这一点。

恢复媒体文件：

~~~bash
mkdir -p /data/yuncan-cms/media
tar -xzf /交接目录/media/cms_media.tar.gz -C /data/yuncan-cms/media
~~~

完成后启动服务并执行迁移、静态文件收集：

~~~bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d \
  redis web ai-service worker lead-notifier
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web \
  python manage.py migrate --noinput
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web \
  python manage.py collectstatic --noinput
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d \
  public-web editor-web
~~~

## 4. 恢复校验

~~~bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db \
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM simple_cms_article;"'
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web \
  python manage.py check
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web \
  python manage.py showmigrations
curl -fsS -H 'Host: www.yuncan.com' http://127.0.0.1:18001/api/health/
~~~

抽查文章、产品选项、站点设置和媒体 URL。不要只看容器是 Up，还要确认页面能读到数据库内容，图片能从 /django/media/ 或 /media/ 访问。

## 5. 后续备份规则

- 数据库至少保留一份定期物理/逻辑备份和一份异地加密副本。
- 生产发布前先备份 PostgreSQL，涉及迁移时保留恢复点。
- /data/yuncan-cms/media 与数据库同等重要，不能只备份 SQL。
- Redis 主要是缓存和队列状态，不替代 PostgreSQL 备份；生产目录仍要保留其 AOF 以便故障恢复。
