#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.prod ]]; then
  echo "缺少 .env.prod，无法执行生产部署" >&2
  exit 1
fi

export COMPOSE_DOCKER_CLI_BUILD=0
export DOCKER_BUILDKIT=0

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml ps
