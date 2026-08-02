#!/usr/bin/env bash
set -euo pipefail

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_directory"

docker compose up --build -d

for _attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:4173/api/health >/dev/null; then
    echo "Linux Tutor disponível em http://127.0.0.1:4173"
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open http://127.0.0.1:4173 >/dev/null 2>&1 || true
    fi
    exit 0
  fi
  sleep 1
done

echo "O serviço não ficou pronto a tempo. Consulte: docker compose logs app" >&2
exit 1
