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
COMPOSE_CMD=(docker compose --env-file .env.prod -f docker-compose.prod.yml)

if [[ -n "${NGINX_SITE_PATH}" && "${DEPLOY_PATH}" == "${NGINX_SITE_PATH}" ]]; then
  echo "[deploy] DEPLOY_PATH 不能等于 NGINX_SITE_PATH，否则会把 nginx 配置文件路径当成代码目录" >&2
  exit 1
fi

cleanup_reserved_port_containers() {
  local port container_id container_name
  local reserved_ports=(18001 18002 13000 13003)

  for port in "${reserved_ports[@]}"; do
    while IFS= read -r container_id; do
      [[ -z "${container_id}" ]] && continue
      container_name="$(docker inspect --format '{{.Name}}' "${container_id}" 2>/dev/null | sed 's#^/##')"
      echo "[deploy] 端口 ${port} 被旧 Docker 容器 ${container_name:-${container_id}} 占用，先移除以释放端口"
      docker rm -f "${container_id}"
    done < <(docker ps --filter "publish=${port}" --format "{{.ID}}")

    if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :${port}" | grep -q ":${port}"; then
      echo "[deploy] 端口 ${port} 仍被非 Docker 进程占用，请先在服务器释放该端口" >&2
      ss -ltnp "sport = :${port}" >&2 || true
      exit 1
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

wait_for_service_health() {
  local service_name="$1"
  local max_attempts="${2:-40}"
  local attempt=1
  local container_id health_status

  container_id="$("${COMPOSE_CMD[@]}" ps -q "${service_name}")"
  if [[ -z "${container_id}" ]]; then
    echo "[deploy] 未找到服务 ${service_name} 对应容器，无法等待健康状态" >&2
    exit 1
  fi

  while (( attempt <= max_attempts )); do
    health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"
    case "${health_status}" in
      healthy|running)
        echo "[deploy] 服务 ${service_name} 已就绪，状态=${health_status}"
        return 0
        ;;
      unhealthy|exited|dead)
        echo "[deploy] 服务 ${service_name} 状态异常：${health_status}" >&2
        docker logs "${container_id}" --tail 200 >&2 || true
        exit 1
        ;;
    esac
    sleep 3
    attempt=$((attempt + 1))
  done

  echo "[deploy] 等待服务 ${service_name} 就绪超时，最后状态=${health_status:-unknown}" >&2
  docker logs "${container_id}" --tail 200 >&2 || true
  exit 1
}

smoke_public_web() {
  echo "[deploy] 验证 public-web 首页"
  local home_html attempt
  for attempt in 1 2 3 4 5; do
    if home_html="$(curl -fsS --max-time 10 "${PUBLIC_WEB_SMOKE_URL}/")"; then
      break
    fi
    if (( attempt == 5 )); then
      echo "[deploy] public-web 首页在 ${attempt} 次尝试后仍不可用" >&2
      exit 1
    fi
    sleep 3
  done
  if ! grep -q "${PUBLIC_WEB_EXPECTED_TEXT}" <<<"${home_html}"; then
    echo "[deploy] public-web 首页未包含预期文案：${PUBLIC_WEB_EXPECTED_TEXT}" >&2
    exit 1
  fi

  echo "[deploy] 验证 public-web 解决方案页"
  for attempt in 1 2 3 4 5; do
    if curl -fsSI --max-time 10 "${PUBLIC_WEB_SMOKE_URL}/solutions" >/dev/null; then
      return 0
    fi
    if (( attempt == 5 )); then
      echo "[deploy] public-web 解决方案页在 ${attempt} 次尝试后仍不可用" >&2
      exit 1
    fi
    sleep 3
  done
}

echo "[deploy] 构建后端镜像"
docker build -t cms-backend:prod .

echo "[deploy] 清理当前 Compose 项目旧容器"
"${COMPOSE_CMD[@]}" down --remove-orphans || true
cleanup_reserved_port_containers

echo "[deploy] 更新生产容器"
"${COMPOSE_CMD[@]}" up -d --build --remove-orphans

echo "[deploy] 执行数据库迁移"
"${COMPOSE_CMD[@]}" exec -T web python manage.py migrate --noinput

echo "[deploy] 收集静态文件"
"${COMPOSE_CMD[@]}" exec -T web python manage.py collectstatic --noinput

echo "[deploy] 输出容器状态"
"${COMPOSE_CMD[@]}" ps

wait_for_service_health public-web
update_nginx_config
smoke_public_web

echo "[deploy] 完成"
