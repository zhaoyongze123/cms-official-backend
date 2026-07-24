#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_BRANCH="${APP_BRANCH:-main}"
APP_REPO="${APP_REPO:-}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-1}"
ENV_FILE="${ENV_FILE:-.env.prod}"
PUBLIC_WEB_ENV_FILE="${PUBLIC_WEB_ENV_FILE:-.env.public-web.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-yuncan-cms}"
REGISTRY="${REGISTRY:-ghcr.io}"
GHCR_USERNAME="${GHCR_USERNAME:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"
ACR_REGISTRY="${ACR_REGISTRY:-}"
ACR_USERNAME="${ACR_USERNAME:-}"
ACR_PASSWORD="${ACR_PASSWORD:-}"
PUBLIC_WEB_SMOKE_URL="${PUBLIC_WEB_SMOKE_URL:-http://127.0.0.1:13003}"
PUBLIC_WEB_EXPECTED_TEXT="${PUBLIC_WEB_EXPECTED_TEXT:-让云贴近业务}"
EDITOR_WEB_SMOKE_URL="${EDITOR_WEB_SMOKE_URL:-http://127.0.0.1:13000/django-admin/next-editor/login}"
RESERVED_PORTS=(15432 16379 18001 18002 13000 13003)

echo "[deploy-pull] 目标目录: ${DEPLOY_PATH}"
echo "[deploy-pull] 目标分支: ${APP_BRANCH}"

if [[ ! -d "${DEPLOY_PATH}" ]]; then
  echo "[deploy-pull] 目标目录不存在: ${DEPLOY_PATH}" >&2
  exit 1
fi

cd "${DEPLOY_PATH}"

if [[ "${SKIP_GIT_SYNC}" != "1" ]]; then
  if [[ ! -d .git ]]; then
    if [[ -z "${APP_REPO}" ]]; then
      echo "[deploy-pull] 当前目录不是 Git 仓库，且未提供 APP_REPO，无法同步部署脚本与编排文件" >&2
      exit 1
    fi
    echo "[deploy-pull] 首次初始化部署仓库: ${APP_REPO}"
    git clone --branch "${APP_BRANCH}" "${APP_REPO}" .
  fi

  echo "[deploy-pull] 拉取最新部署仓库代码"
  git fetch --prune origin
  git checkout "${APP_BRANCH}"
  git reset --hard "origin/${APP_BRANCH}"
else
  echo "[deploy-pull] 默认跳过 Git 同步，使用当前目录已有部署文件并从镜像仓库拉取最新镜像"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[deploy-pull] 缺少环境文件: ${ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "${PUBLIC_WEB_ENV_FILE}" ]]; then
  echo "[deploy-pull] 缺少 public-web 环境文件: ${PUBLIC_WEB_ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[deploy-pull] 缺少编排文件: ${COMPOSE_FILE}" >&2
  exit 1
fi

if ! grep -q '^PUBLIC_WEB_REVALIDATE_TOKEN=.[^[:space:]]*' "${ENV_FILE}"; then
  echo "[deploy-pull] ${ENV_FILE} 缺少 PUBLIC_WEB_REVALIDATE_TOKEN" >&2
  exit 1
fi

COMPOSE_CMD=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")
export COMPOSE_PROJECT_NAME

audit_public_web_env() {
  echo "[deploy-pull] 审计 public-web 独立环境文件 ${PUBLIC_WEB_ENV_FILE}"
  grep -E '^(NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL|NEXT_PUBLIC_SITE_URL)=' "${PUBLIC_WEB_ENV_FILE}" || {
    echo "[deploy-pull] ${PUBLIC_WEB_ENV_FILE} 缺少 public-web 必需变量" >&2
    exit 1
  }
  if grep -E '^(DJANGO_INTERNAL_BASE_URL|SECRET_KEY|POSTGRES_|REDIS_URL|INTERNAL_API_TOKEN|AI_SERVICE_URL)=' "${PUBLIC_WEB_ENV_FILE}" >/dev/null; then
    echo "[deploy-pull] ${PUBLIC_WEB_ENV_FILE} 不应包含后端/内部变量" >&2
    grep -E '^(DJANGO_INTERNAL_BASE_URL|SECRET_KEY|POSTGRES_|REDIS_URL|INTERNAL_API_TOKEN|AI_SERVICE_URL)=' "${PUBLIC_WEB_ENV_FILE}" >&2 || true
    exit 1
  fi
}

docker_login_if_needed() {
  if [[ -n "${ACR_REGISTRY}" && -n "${ACR_USERNAME}" && -n "${ACR_PASSWORD}" ]]; then
    echo "[deploy-pull] 登录阿里云 ACR: ${ACR_REGISTRY}"
    printf '%s' "${ACR_PASSWORD}" | docker login "${ACR_REGISTRY}" -u "${ACR_USERNAME}" --password-stdin
    return 0
  fi

  if [[ -n "${GHCR_USERNAME}" && -n "${GHCR_TOKEN}" ]]; then
    echo "[deploy-pull] 登录 GHCR: ${REGISTRY}"
    printf '%s' "${GHCR_TOKEN}" | docker login "${REGISTRY}" -u "${GHCR_USERNAME}" --password-stdin
    return 0
  fi

  echo "[deploy-pull] 未提供镜像仓库凭据，继续使用当前宿主机已有登录态"
}

cleanup_reserved_ports() {
  local port cid pid
  for port in "${RESERVED_PORTS[@]}"; do
    while IFS= read -r cid; do
      [[ -z "${cid}" ]] && continue
      echo "[deploy-pull] 移除占用端口 ${port} 的旧容器 ${cid}"
      docker rm -f "${cid}" || true
    done < <(docker ps -a --filter "publish=${port}" --format "{{.ID}}")

    if command -v ss >/dev/null 2>&1 && ss -lnt "sport = :${port}" | grep -q ":${port}"; then
      while IFS= read -r pid; do
        [[ -z "${pid}" ]] && continue
        echo "[deploy-pull] 终止占用端口 ${port} 的宿主机进程 PID=${pid}"
        kill -TERM "${pid}" 2>/dev/null || true
      done < <(ss -ltnp "sport = :${port}" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)
      sleep 2
    fi

    if command -v ss >/dev/null 2>&1 && ss -lnt "sport = :${port}" | grep -q ":${port}"; then
      while IFS= read -r pid; do
        [[ -z "${pid}" ]] && continue
        echo "[deploy-pull] 强制终止占用端口 ${port} 的宿主机进程 PID=${pid}"
        kill -KILL "${pid}" 2>/dev/null || true
      done < <(ss -ltnp "sport = :${port}" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)
      sleep 1
    fi

    if command -v ss >/dev/null 2>&1 && ss -lnt "sport = :${port}" | grep -q ":${port}"; then
      echo "[deploy-pull] 端口 ${port} 仍被占用，终止部署" >&2
      ss -ltnp "sport = :${port}" >&2 || true
      exit 1
    fi
  done
}

wait_http() {
  local url="$1"
  local attempts="$2"
  local sleep_seconds="$3"
  local attempt=1
  while [[ "${attempt}" -le "${attempts}" ]]; do
    if curl -fsS --max-time 10 "${url}" >/dev/null; then
      return 0
    fi
    if [[ "${attempt}" -eq "${attempts}" ]]; then
      echo "[deploy-pull] 等待地址可用失败: ${url}" >&2
      return 1
    fi
    attempt=$((attempt + 1))
    sleep "${sleep_seconds}"
  done
}

smoke_public_web() {
  local home_html
  home_html="$(curl -fsS --max-time 10 "${PUBLIC_WEB_SMOKE_URL}/")"
  if ! grep -q "${PUBLIC_WEB_EXPECTED_TEXT}" <<<"${home_html}"; then
    echo "[deploy-pull] public-web 首页未包含预期文案: ${PUBLIC_WEB_EXPECTED_TEXT}" >&2
    exit 1
  fi
  curl -fsSI --max-time 10 "${PUBLIC_WEB_SMOKE_URL}/solutions" >/dev/null
}

smoke_editor_web() {
  curl -fsSI --max-time 10 "${EDITOR_WEB_SMOKE_URL}" >/dev/null
}

audit_public_web_env

docker_login_if_needed

echo "[deploy-pull] 停止当前 Compose 项目"
"${COMPOSE_CMD[@]}" down --remove-orphans || true
cleanup_reserved_ports

echo "[deploy-pull] 拉取最新镜像"
"${COMPOSE_CMD[@]}" pull db redis web ai-service worker public-web editor-web

echo "[deploy-pull] 启动后端核心服务"
"${COMPOSE_CMD[@]}" up -d --remove-orphans db redis web ai-service worker
wait_http "http://127.0.0.1:18001/" 24 5

echo "[deploy-pull] 执行数据库迁移"
"${COMPOSE_CMD[@]}" exec -T web python manage.py migrate --noinput

echo "[deploy-pull] 收集静态文件"
"${COMPOSE_CMD[@]}" exec -T web python manage.py collectstatic --noinput

echo "[deploy-pull] 启动 public-web"
"${COMPOSE_CMD[@]}" up -d --remove-orphans public-web
wait_http "${PUBLIC_WEB_SMOKE_URL}/solutions" 24 5
smoke_public_web

echo "[deploy-pull] 启动 editor-web"
"${COMPOSE_CMD[@]}" up -d --remove-orphans editor-web
wait_http "${EDITOR_WEB_SMOKE_URL}" 24 5
smoke_editor_web

echo "[deploy-pull] 输出当前容器状态"
"${COMPOSE_CMD[@]}" ps
docker image prune -f
docker system df

echo "[deploy-pull] 完成"
