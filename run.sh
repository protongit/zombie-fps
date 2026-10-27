#!/usr/bin/env bash
# Arranca Calle Muerta (servidor estático + WebSocket para co-op).
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-${PORT:-8123}}"
echo "Calle Muerta -> http://localhost:${PORT}/"
if ! command -v node >/dev/null 2>&1; then
  echo "Necesitas Node.js 20 o superior. O usa Docker: docker compose up -d --build" >&2
  exit 1
fi
if [ ! -d node_modules/ws ]; then
  npm install --omit=dev
fi
exec env PORT="$PORT" node server.mjs
