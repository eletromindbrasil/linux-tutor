#!/usr/bin/env bash
set -euo pipefail

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_directory"

umask 077
if [[ ! -f .env ]]; then
  touch .env
fi

generated_configuration=false

if ! grep -Eq '^DB_PASSWORD=.+$' .env; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL é necessário para gerar o segredo do banco." >&2
    exit 1
  fi
  database_password="$(openssl rand -hex 32)"
  echo "DB_PASSWORD=$database_password" >> .env
  generated_configuration=true
fi

if ! grep -Eq '^INSTANCE_ID=.+$' .env; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL é necessário para gerar o identificador da implantação." >&2
    exit 1
  fi
  instance_id="linux-tutor-$(openssl rand -hex 8)"
  echo "INSTANCE_ID=$instance_id" >> .env
  generated_configuration=true
fi

if ! grep -Eq '^INITIAL_ADMIN_EMAIL=.+$' .env; then
  echo "INITIAL_ADMIN_EMAIL=eletromind.brasil@gmail.com" >> .env
fi
if ! grep -Eq '^INITIAL_ADMIN_PASSWORD=.+$' .env; then
  echo "INITIAL_ADMIN_PASSWORD=12345678" >> .env
fi
if ! grep -Eq '^COOKIE_SECURE=.+$' .env; then
  echo "COOKIE_SECURE=false" >> .env
fi

chmod 600 .env
if [[ "$generated_configuration" == true ]]; then
  echo "Configuração segura criada em .env"
fi

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
