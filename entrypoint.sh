#!/bin/bash
set -euo pipefail

app_env=${1:-development}
project_root="$(cd "$(dirname "$0")" && pwd)"
frontend_dir="${project_root}/atomic"

if [ ! -d "${frontend_dir}" ]; then
  echo "错误：未找到 atomic 目录，无法启动前端服务"
  exit 1
fi

dev_commands() {
  echo "Development environment detected"
  cd "${frontend_dir}"
  npm install
  exec npm run dev -- --host 0.0.0.0 --port 3000 --strictPort
}

prod_commands() {
  echo "Production environment detected"
  cd "${frontend_dir}"
  npm install
  npm run build
  PORT="${PORT:-3000}"
  if [ ! -d "dist" ]; then
    echo "错误：未找到 dist 目录，请先执行 npm run build"
    exit 1
  fi
  exec npx vite preview --host 0.0.0.0 --port "${PORT}"
}

if [ "$app_env" = "production" ] || [ "$app_env" = "prod" ]; then
  prod_commands
else
  dev_commands
fi
