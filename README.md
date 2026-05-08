# 企业内容管理平台 (CMS)

基于 Django 构建的轻量级企业内容管理系统，提供文章发布、分类管理、媒体库与基础系统配置等能力。

## 1. 功能范围

- 内容管理：文章发布、分类、封面图、发布状态与定时发布
- 媒体库：图片/附件上传与管理
- 系统设置：站点标题、Logo、SEO 基础配置
- 用户与权限：基础角色与权限分配

## 2. 技术栈

- Python 3.12 + Django 5.1
- PostgreSQL 15
- Redis 7
- CKEditor（富文本）
- Django Jazzmin（后台 UI）
- Docker / Docker Compose

## 3. 环境要求

- Docker Engine 20.10+
- Docker Compose v2

## 4. 快速启动

1. 配置环境变量（参考 `.env.example`）
2. 构建并启动容器：
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```
3. 初始化数据库：
   ```bash
   docker compose exec web python manage.py migrate
   ```
4. 创建管理员：
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```
5. 访问：
   - 前台：`http://127.0.0.1:8001/`
   - 后台：`http://127.0.0.1:8001/django-admin/`

## 5. 权限初始化（可选）

```bash
docker compose exec web python manage.py setup_roles
```
