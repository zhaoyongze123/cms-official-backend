#!/bin/sh
set -eu

cd /app/apps/studio-web

if [ ! -d node_modules/next ]; then
  npm ci --include=dev
fi

if [ ! -f node_modules/@cms/editor-protocol/package.json ] || find /app/packages/editor-protocol \
  -type f \
  -newer node_modules/@cms/editor-protocol/package.json \
  -print -quit 2>/dev/null | grep -q .; then
  npm install --include=dev /app/packages/editor-protocol
fi

needs_build=0

if [ ! -f .next/BUILD_ID ]; then
  needs_build=1
elif find app components lib scripts \
  -type f \
  -newer .next/BUILD_ID \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
elif find /app/packages/editor-protocol \
  -type f \
  -newer .next/BUILD_ID \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
elif find . \
  -maxdepth 1 \
  \( -name 'package.json' -o -name 'package-lock.json' -o -name 'tsconfig.json' -o -name 'next.config.*' -o -name 'postcss.config.*' -o -name 'eslint.config.*' -o -name 'vitest.config.*' \) \
  -type f \
  -newer .next/BUILD_ID \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
fi

if [ "${needs_build}" -eq 1 ]; then
  npm run build
fi

exec npm run start -- --hostname 0.0.0.0 --port 3000
