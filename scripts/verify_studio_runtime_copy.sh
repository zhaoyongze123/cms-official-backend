#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STUDIO_DIR="$ROOT_DIR/apps/studio-web"
DJANGO_BASE_URL="${DJANGO_BASE_URL:-http://127.0.0.1:8001}"
STUDIO_BASE_PATH="/django-admin/next-editor"
VERIFY_ADMIN_USERNAME="${VERIFY_ADMIN_USERNAME:-codex-studio-check}"
VERIFY_ADMIN_PASSWORD="${VERIFY_ADMIN_PASSWORD:-codex-local-only-verify-pass}"

log() {
  printf '[studio-runtime-check] %s\n' "$1"
}

wait_http() {
  local url="$1"
  local retries="${2:-60}"
  local sleep_seconds="${3:-2}"

  for _ in $(seq 1 "$retries"); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  log "等待超时: $url"
  return 1
}

wait_editor_web_healthy() {
  local retries="${1:-90}"
  local sleep_seconds="${2:-2}"

  for _ in $(seq 1 "$retries"); do
    if docker compose ps --format json | node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
if (!input) process.exit(1);
const rows = input.split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
const target = rows.find((row) => row.Service === "editor-web");
if (!target) process.exit(1);
const health = String(target.Health || "");
if (target.State !== "running" || !health.includes("healthy")) process.exit(1);
' >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  log "editor-web 健康检查超时"
  docker compose ps
  return 1
}

assert_body_contains() {
  local url="$1"
  local expected="$2"
  local body
  body="$(curl -fsS "$url")"
  if ! grep -Fq "$expected" <<<"$body"; then
    log "页面未命中预期文案: $url -> $expected"
    return 1
  fi
}

assert_body_contains_with_cookie() {
  local cookie_jar="$1"
  local url="$2"
  local expected="$3"
  local body
  body="$(curl -fsS -b "$cookie_jar" "$url")"
  if ! grep -Fq "$expected" <<<"$body"; then
    log "页面未命中预期文案: $url -> $expected"
    return 1
  fi
}

assert_redirect_to_login() {
  local headers
  headers="$(curl -sSI "$DJANGO_BASE_URL$STUDIO_BASE_PATH/studio" || true)"
  grep -Fq "location: $STUDIO_BASE_PATH/login" <<<"$(tr '[:upper:]' '[:lower:]' <<<"$headers")"
}

ensure_verification_admin() {
  docker compose exec -T \
    -e VERIFY_ADMIN_USERNAME="$VERIFY_ADMIN_USERNAME" \
    -e VERIFY_ADMIN_PASSWORD="$VERIFY_ADMIN_PASSWORD" \
    web python manage.py shell <<'PY'
from django.contrib.auth import get_user_model
import os

User = get_user_model()
username = os.environ["VERIFY_ADMIN_USERNAME"]
password = os.environ["VERIFY_ADMIN_PASSWORD"]
user, _ = User.objects.get_or_create(
    username=username,
    defaults={
        "email": f"{username}@cms.local",
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
    },
)
user.is_staff = True
user.is_superuser = True
user.is_active = True
user.set_password(password)
user.save(update_fields=["email", "is_staff", "is_superuser", "is_active", "password"])
print(f"verification_admin={user.username}")
PY
}

login_with_django_admin() {
  local cookie_jar="$1"
  local login_html csrf_token

  login_html="$(curl -fsS -c "$cookie_jar" "$DJANGO_BASE_URL/django-admin/login/?next=$STUDIO_BASE_PATH/studio")"
  csrf_token="$(sed -n 's/.*name="csrfmiddlewaretoken" value="\([^"]*\)".*/\1/p' <<<"$login_html" | head -n 1)"
  if [[ -z "$csrf_token" ]]; then
    log "未能从 Django Admin 登录页提取 csrfmiddlewaretoken"
    return 1
  fi

  local response_headers
  response_headers="$(
    curl -sS -D - -o /dev/null \
      -b "$cookie_jar" \
      -c "$cookie_jar" \
      -e "$DJANGO_BASE_URL/django-admin/login/?next=$STUDIO_BASE_PATH/studio" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data-urlencode "csrfmiddlewaretoken=$csrf_token" \
      --data-urlencode "username=$VERIFY_ADMIN_USERNAME" \
      --data-urlencode "password=$VERIFY_ADMIN_PASSWORD" \
      --data-urlencode "next=$STUDIO_BASE_PATH/studio" \
      "$DJANGO_BASE_URL/django-admin/login/?next=$STUDIO_BASE_PATH/studio"
  )"

  grep -Eq '^location: /django-admin/next-editor/studio/?\r?$' <<<"$(tr '[:upper:]' '[:lower:]' <<<"$response_headers")"
}

cd "$ROOT_DIR"

log "执行 apps/studio-web lint"
npm --prefix "$STUDIO_DIR" run lint

log "执行 apps/studio-web test"
npm --prefix "$STUDIO_DIR" run test

log "执行 apps/studio-web build"
npm --prefix "$STUDIO_DIR" run build

log "等待 Django 与 editor-web 运行态稳定"
wait_http "$DJANGO_BASE_URL/api/health/"
wait_editor_web_healthy
wait_http "$DJANGO_BASE_URL$STUDIO_BASE_PATH/login"

log "校验 Studio 无登录态时的重定向"
assert_redirect_to_login

log "准备本地登录态验收账号"
ensure_verification_admin >/dev/null

log "校验公开可访问页面文案"
assert_body_contains "$DJANGO_BASE_URL$STUDIO_BASE_PATH/login" "请先完成 Django 登录后再进入 AI SEO Studio。"
assert_body_contains "$DJANGO_BASE_URL$STUDIO_BASE_PATH/django-admin/articles/new" "新建文章仍待接入 Django"

log "校验带登录态的反代页面"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT
login_with_django_admin "$COOKIE_JAR"
assert_body_contains_with_cookie "$COOKIE_JAR" "$DJANGO_BASE_URL$STUDIO_BASE_PATH/studio" "工作台壳层已经具备继续接入业务模块的固定骨架。"
assert_body_contains_with_cookie "$COOKIE_JAR" "$DJANGO_BASE_URL$STUDIO_BASE_PATH/studio" "工作台设置"
assert_body_contains_with_cookie "$COOKIE_JAR" "$DJANGO_BASE_URL$STUDIO_BASE_PATH/studio/settings" "工作台设置页已切到 Django Session 运行态。"
assert_body_contains_with_cookie "$COOKIE_JAR" "$DJANGO_BASE_URL$STUDIO_BASE_PATH/studio/analytics" "SEO 监控面板已接入 Django 真数据。"

log "Studio 运行态文案验收通过"
