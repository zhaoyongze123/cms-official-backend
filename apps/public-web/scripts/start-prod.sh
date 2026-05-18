#!/bin/sh
set -eu

cd /app/apps/public-web

if [ ! -d node_modules/next ]; then
  npm ci --include=dev
fi

needs_build=0

if [ ! -f .next/BUILD_ID ]; then
  needs_build=1
elif find app src public scripts \
  -type f \
  -newer .next/BUILD_ID \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
elif find . \
  -maxdepth 1 \
  \( -name 'package.json' -o -name 'package-lock.json' -o -name 'tsconfig.json' -o -name 'next.config.*' -o -name 'postcss.config.*' -o -name 'eslint.config.*' \) \
  -type f \
  -newer .next/BUILD_ID \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
fi

if [ "${needs_build}" -eq 1 ]; then
  npm run build
fi

exec npm run start -- --hostname 0.0.0.0 --port 3003
