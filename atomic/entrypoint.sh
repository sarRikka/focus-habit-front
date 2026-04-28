#!/bin/bash
set -euo pipefail

# Sealos 推荐：entrypoint 只负责启动，不做构建。
# 请在发布前先完成 npm run build，确保 dist 已生成。
PORT="${PORT:-8080}"

if [ ! -d "dist" ]; then
  echo "错误：未找到 dist 目录，请先在开发环境执行 npm run build"
  exit 1
fi

# 生产预览服务，监听 0.0.0.0 以便容器外访问
exec npx vite preview --host 0.0.0.0 --port "${PORT}"
