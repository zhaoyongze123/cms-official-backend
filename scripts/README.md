# scripts

这里预留给仓库级脚本入口说明。

当前已提供：

- `verify_studio_runtime_copy.sh`
  - 用途：执行 `apps/studio-web` 的 `lint`、`test`、`build`，等待名为 `editor-web` 的 Studio 容器健康，并通过 Django 反代入口校验关键页面文案、未登录重定向与带登录态的 `/studio` 页面。
  - 运行方式：在仓库根目录执行 `bash scripts/verify_studio_runtime_copy.sh`
  - 默认会在本地开发库中 upsert 一个仅供验收使用的管理员账号 `codex-studio-check`。如需覆盖，可通过环境变量传入 `VERIFY_ADMIN_USERNAME`、`VERIFY_ADMIN_PASSWORD`。
