#!/bin/sh
set -e

cd /app/apps/cms-api

python manage.py migrate --noinput

# Do not block app startup if cron is unavailable in the runtime.
if command -v cron >/dev/null 2>&1; then
  cron || true
fi

# Run an immediate sync in background; periodic sync is handled by cron.
(python manage.py sync_aliyun >> /var/log/cron.log 2>&1 || true) &

exec "$@"
