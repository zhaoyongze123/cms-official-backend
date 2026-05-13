#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_BRANCH="${APP_BRANCH:-main}"
APP_REPO="${APP_REPO:-}"
NGINX_SITE_PATH="${NGINX_SITE_PATH:-}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-0}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-/etc/init.d/nginx reload}"

echo "[deploy] 目标目录: ${DEPLOY_PATH}"
echo "[deploy] 目标分支: ${APP_BRANCH}"

if [[ -e "${DEPLOY_PATH}" && ! -d "${DEPLOY_PATH}" ]]; then
  echo "[deploy] 目标路径 ${DEPLOY_PATH} 已存在但不是目录，先删除旧文件"
  rm -f "${DEPLOY_PATH}"
fi

if [[ ! -d "${DEPLOY_PATH}" ]]; then
  echo "[deploy] 创建部署目录 ${DEPLOY_PATH}"
  mkdir -p "${DEPLOY_PATH}"
fi

cd "${DEPLOY_PATH}"

if [[ "${SKIP_GIT_SYNC}" != "1" ]]; then
  if [[ ! -d .git ]]; then
    if [[ -z "${APP_REPO}" ]]; then
      echo "[deploy] 首次部署缺少 APP_REPO，无法初始化仓库" >&2
      exit 1
    fi
    echo "[deploy] 首次部署，克隆仓库 ${APP_REPO}"
    git clone --branch "${APP_BRANCH}" "${APP_REPO}" .
  fi

  echo "[deploy] 拉取最新代码"
  git fetch --prune origin
  git checkout "${APP_BRANCH}"
  git reset --hard "origin/${APP_BRANCH}"
else
  echo "[deploy] 跳过 Git 同步，使用已上传代码"
fi

if [[ ! -f .env.prod ]]; then
  echo "[deploy] 缺少 .env.prod，无法继续" >&2
  exit 1
fi

export COMPOSE_DOCKER_CLI_BUILD=0
export DOCKER_BUILDKIT=0

echo "[deploy] 构建后端镜像"
docker build -t cms-backend:prod .

echo "[deploy] 更新生产容器"
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build --remove-orphans

echo "[deploy] 执行数据库迁移"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web python manage.py migrate --noinput

echo "[deploy] 收集静态文件"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput

echo "[deploy] 输出容器状态"
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

if [[ -n "${NGINX_SITE_PATH}" ]]; then
  echo "[deploy] 更新 nginx 配置 ${NGINX_SITE_PATH}"
  mkdir -p "$(dirname "${NGINX_SITE_PATH}")"
  cp deploy/nginx/cms.conf "${NGINX_SITE_PATH}"
  nginx -t
  bash -lc "${NGINX_RELOAD_CMD}"
fi

echo "[deploy] 完成"
