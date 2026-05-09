#!/usr/bin/env bash

set -euo pipefail

# Docker Desktop 4.57 上多服务 compose build 默认走 BuildKit/Bake 时会触发
# x-docker-expose-session-sharedkey 非可打印字符异常，这里统一走兼容参数。
export COMPOSE_DOCKER_CLI_BUILD=0
export DOCKER_BUILDKIT=0

docker compose build web ai-service worker
docker compose up -d
