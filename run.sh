#!/usr/bin/env bash
# Arranca el servidor local para Calle Muerta.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8123}"
echo "Calle Muerta -> http://localhost:${PORT}/index.html"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx serve -l "$PORT"
else
  echo "Necesitas python3 o npx instalados." >&2
  exit 1
fi
