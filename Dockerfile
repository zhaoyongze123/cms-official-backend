FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN set -eux; \
    unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i 's|http://deb.debian.org/debian|http://mirrors.aliyun.com/debian|g' /etc/apt/sources.list.d/debian.sources; \
        sed -i 's|http://security.debian.org/debian-security|http://mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list.d/debian.sources; \
    else \
        sed -i 's|http://deb.debian.org/debian|http://mirrors.aliyun.com/debian|g' /etc/apt/sources.list; \
        sed -i 's|http://security.debian.org/debian-security|http://mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list; \
    fi; \
    apt-get -o Acquire::Retries=5 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 update; \
    apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        libjpeg62-turbo-dev \
        zlib1g-dev \
        libwebp-dev \
        cron; \
    rm -rf /var/lib/apt/lists/*

COPY apps/cms-api/requirements /app/apps/cms-api/requirements
COPY apps/ai-service/requirements /app/apps/ai-service/requirements
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY; \
    pip install --no-cache-dir \
      -r /app/apps/cms-api/requirements/base.txt \
      -r /app/apps/ai-service/requirements/base.txt

COPY . .

COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/cron/aliyun_sync /etc/cron.d/aliyun_sync
RUN chmod 0644 /etc/cron.d/aliyun_sync && touch /var/log/cron.log

RUN chmod +x /entrypoint.sh

WORKDIR /app/apps/cms-api
RUN python manage.py collectstatic --noinput --settings=config.settings.production 2>/dev/null || true

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
