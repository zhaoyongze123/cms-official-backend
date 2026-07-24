#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_BRANCH="${APP_BRANCH:-main}"
APP_REPO="${APP_REPO:-}"
NGINX_SITE_PATH="${NGINX_SITE_PATH:-}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-0}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-/etc/init.d/nginx reload}"
PUBLIC_WEB_SMOKE_URL="${PUBLIC_WEB_SMOKE_URL:-http://127.0.0.1:13003}"
PUBLIC_WEB_EXPECTED_TEXT="${PUBLIC_WEB_EXPECTED_TEXT:-让云贴近业务}"
EDITOR_WEB_SMOKE_URL="${EDITOR_WEB_SMOKE_URL:-http://127.0.0.1:13000/django-admin/next-editor/login}"
PUBLIC_WEB_ENV_FILE="${PUBLIC_WEB_ENV_FILE:-.env.public-web.prod}"
REQUIRED_ENV_VARS=(
  SECRET_KEY
  ALLOWED_HOSTS
  CSRF_TRUSTED_ORIGINS
  CMS_SITE_URL
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  INTERNAL_API_TOKEN
  PUBLIC_WEB_REVALIDATE_TOKEN
)

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

if [[ ! -f "${PUBLIC_WEB_ENV_FILE}" ]]; then
  echo "[deploy] 缺少 ${PUBLIC_WEB_ENV_FILE}，无法继续" >&2
  exit 1
fi

export COMPOSE_DOCKER_CLI_BUILD=0
export DOCKER_BUILDKIT=0
COMPOSE_CMD=(docker compose --env-file .env.prod -f docker-compose.prod.yml)
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-yuncan-cms}"

print_compose_diagnostics() {
  echo "[deploy] 输出 Compose 状态"
  "${COMPOSE_CMD[@]}" ps || true

  echo "[deploy] 输出 web health 状态"
  docker inspect "${COMPOSE_PROJECT_NAME}-web-1" \
    --format '{{json .State.Health}}' 2>/dev/null || true

  echo "[deploy] 输出关键容器最近日志"
  "${COMPOSE_CMD[@]}" logs --tail 200 web ai-service worker db redis || true
}

validate_required_env() {
  local missing=0 key value

  for key in "${REQUIRED_ENV_VARS[@]}"; do
    value="$(grep -E "^${key}=" .env.prod | tail -n 1 | cut -d '=' -f2- || true)"
    if [[ -z "${value}" ]]; then
      echo "[deploy] .env.prod 缺少必填项: ${key}" >&2
      missing=1
    fi
  done

  if (( missing == 1 )); then
    echo "[deploy] 生产环境变量不完整，终止部署" >&2
    exit 1
  fi
}

validate_required_env

audit_public_web_env() {
  echo "[deploy] 审计 public-web 独立环境文件 ${PUBLIC_WEB_ENV_FILE}"
  grep -E '^(NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL|NEXT_PUBLIC_SITE_URL)=' "${PUBLIC_WEB_ENV_FILE}" || {
    echo "[deploy] ${PUBLIC_WEB_ENV_FILE} 缺少 public-web 必需变量" >&2
    exit 1
  }
  if grep -E '^(DJANGO_INTERNAL_BASE_URL|SECRET_KEY|POSTGRES_|REDIS_URL|INTERNAL_API_TOKEN|AI_SERVICE_URL)=' "${PUBLIC_WEB_ENV_FILE}" >/dev/null; then
    echo "[deploy] ${PUBLIC_WEB_ENV_FILE} 不应包含后端/内部变量" >&2
    grep -E '^(DJANGO_INTERNAL_BASE_URL|SECRET_KEY|POSTGRES_|REDIS_URL|INTERNAL_API_TOKEN|AI_SERVICE_URL)=' "${PUBLIC_WEB_ENV_FILE}" >&2 || true
    exit 1
  fi
}

audit_public_web_env

if [[ -n "${NGINX_SITE_PATH}" && "${DEPLOY_PATH}" == "${NGINX_SITE_PATH}" ]]; then
  echo "[deploy] DEPLOY_PATH 不能等于 NGINX_SITE_PATH，否则会把 nginx 配置文件路径当成代码目录" >&2
  exit 1
fi

cleanup_reserved_port_containers() {
  local port container_id container_name pid_list
  local reserved_ports=(15432 16379 18001 18002 13000 13003)

  for port in "${reserved_ports[@]}"; do
    while IFS= read -r container_id; do
      [[ -z "${container_id}" ]] && continue
      container_name="$(docker inspect --format '{{.Name}}' "${container_id}" 2>/dev/null | sed 's#^/##')"
      echo "[deploy] 端口 ${port} 被旧 Docker 容器 ${container_name:-${container_id}} 占用，先移除以释放端口"
      docker rm -f "${container_id}"
    done < <(docker ps --filter "publish=${port}" --format "{{.ID}}")

    if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :${port}" | grep -q ":${port}"; then
      echo "[deploy] 端口 ${port} 仍被宿主机进程占用，尝试终止后重试"
      ss -ltnp "sport = :${port}" || true
      pid_list="$(ss -ltnp "sport = :${port}" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
      if [[ -n "${pid_list}" ]]; then
        while IFS= read -r pid; do
          [[ -z "${pid}" ]] && continue
          echo "[deploy] 终止占用端口 ${port} 的进程 PID=${pid}"
          kill -TERM "${pid}" 2>/dev/null || true
        done <<< "${pid_list}"
        sleep 2

        if ss -ltn "sport = :${port}" | grep -q ":${port}"; then
          while IFS= read -r pid; do
            [[ -z "${pid}" ]] && continue
            echo "[deploy] 端口 ${port} 仍未释放，强制终止 PID=${pid}"
            kill -KILL "${pid}" 2>/dev/null || true
          done <<< "${pid_list}"
          sleep 1
        fi
      fi

      if ss -ltn "sport = :${port}" | grep -q ":${port}"; then
        echo "[deploy] 端口 ${port} 在自动终止后仍被占用，终止部署" >&2
        ss -ltnp "sport = :${port}" >&2 || true
        exit 1
      fi
    fi
  done
}

update_nginx_config() {
  if [[ -z "${NGINX_SITE_PATH}" ]]; then
    return 0
  fi

  if [[ -d "${NGINX_SITE_PATH}" ]]; then
    echo "[deploy] nginx 配置路径 ${NGINX_SITE_PATH} 当前是目录，备份后改回文件"
    mv "${NGINX_SITE_PATH}" "${NGINX_SITE_PATH}.dir.bak.$(date +%Y%m%d%H%M%S)"
  fi

  echo "[deploy] 更新 nginx 配置 ${NGINX_SITE_PATH}"
  mkdir -p "$(dirname "${NGINX_SITE_PATH}")"
  cp deploy/nginx/cms.conf "${NGINX_SITE_PATH}"
  nginx -t
  bash -lc "${NGINX_RELOAD_CMD}"
}

smoke_public_web() {
  echo "[deploy] 验证 public-web 首页"
  local home_html attempt
  for attempt in $(seq 1 40); do
    if home_html="$(curl -fsS --max-time 10 "${PUBLIC_WEB_SMOKE_URL}/")"; then
      break
    fi
    if (( attempt == 40 )); then
      echo "[deploy] public-web 首页在 ${attempt} 次尝试后仍不可用" >&2
      "${COMPOSE_CMD[@]}" ps >&2 || true
      "${COMPOSE_CMD[@]}" logs --tail 200 public-web >&2 || true
      exit 1
    fi
    sleep 5
  done
  if ! grep -q "${PUBLIC_WEB_EXPECTED_TEXT}" <<<"${home_html}"; then
    echo "[deploy] public-web 首页未包含预期文案：${PUBLIC_WEB_EXPECTED_TEXT}" >&2
    "${COMPOSE_CMD[@]}" logs --tail 200 public-web >&2 || true
    exit 1
  fi

  echo "[deploy] 验证 public-web 解决方案页"
  for attempt in $(seq 1 20); do
    if curl -fsSI --max-time 10 "${PUBLIC_WEB_SMOKE_URL}/solutions" >/dev/null; then
      return 0
    fi
    if (( attempt == 20 )); then
      echo "[deploy] public-web 解决方案页在 ${attempt} 次尝试后仍不可用" >&2
      "${COMPOSE_CMD[@]}" ps >&2 || true
      "${COMPOSE_CMD[@]}" logs --tail 200 public-web >&2 || true
      exit 1
    fi
    sleep 5
  done
}

smoke_editor_web() {
  echo "[deploy] 验证 editor-web 登录页"
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsSI --max-time 10 "${EDITOR_WEB_SMOKE_URL}" >/dev/null; then
      return 0
    fi
    if (( attempt == 30 )); then
      echo "[deploy] editor-web 登录页在 ${attempt} 次尝试后仍不可用" >&2
      "${COMPOSE_CMD[@]}" ps >&2 || true
      "${COMPOSE_CMD[@]}" logs --tail 200 editor-web >&2 || true
      exit 1
    fi
    sleep 5
  done
}

echo "[deploy] 构建后端镜像"
docker build -t cms-backend:prod .

echo "[deploy] 清理当前 Compose 项目旧容器"
"${COMPOSE_CMD[@]}" down --remove-orphans || true
cleanup_reserved_port_containers

echo "[deploy] 更新后端容器"
if ! "${COMPOSE_CMD[@]}" up -d --build --remove-orphans db redis web ai-service worker; then
  echo "[deploy] docker compose up 失败" >&2
  print_compose_diagnostics >&2
  exit 1
fi

echo "[deploy] 执行数据库迁移"
if ! "${COMPOSE_CMD[@]}" exec -T web python manage.py migrate --noinput; then
  echo "[deploy] 数据库迁移失败" >&2
  print_compose_diagnostics >&2
  exit 1
fi

echo "[deploy] 收集静态文件"
if ! "${COMPOSE_CMD[@]}" exec -T web python manage.py collectstatic --noinput; then
  echo "[deploy] collectstatic 失败" >&2
  print_compose_diagnostics >&2
  exit 1
fi

echo "[deploy] 输出容器状态"
"${COMPOSE_CMD[@]}" ps

update_nginx_config

echo "[deploy] 启动 public-web"
"${COMPOSE_CMD[@]}" up -d public-web
smoke_public_web

echo "[deploy] 启动 editor-web"
"${COMPOSE_CMD[@]}" up -d editor-web
smoke_editor_web

echo "[deploy] 完成"
