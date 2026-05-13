# cms-api Django 工程主体

## 当前职责

`apps/cms-api/` 现在承载 Django 工程主体，包括独立的 `manage.py`、`config/`、`templates/` 和 `static/`。

## 依赖安装

在 `apps/cms-api/` 目录下执行：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
```

复制环境变量模板：

```bash
cp .env.example .env
```

最小运行还需要：

- PostgreSQL
- Redis
- `.env` 中的 Django / 数据库配置

安装完成后可执行：

```bash
python3 manage.py check
python3 manage.py test
```

为本地 Studio 监控页填充 analytics 快照：

```bash
python3 manage.py seed_analytics_snapshots --days 7
```

如果需要把草稿文章也一起填充：

```bash
python3 manage.py seed_analytics_snapshots --days 7 --include-drafts
```

## 当前业务 app

- `apps/simple_cms/`
- `apps/users/`
- `apps/media_library/`
- `apps/sys_settings/`
- `apps/aliyun_monitor/`
