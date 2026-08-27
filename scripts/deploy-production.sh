#!/usr/bin/env bash
set -euo pipefail

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_directory"

environment_file="$project_directory/.env"
umask 077
touch "$environment_file"
chmod 600 "$environment_file"

ensure_secret() {
  local key="$1"
  if grep -Eq "^${key}=.+$" "$environment_file"; then
    return
  fi
  printf '%s=%s\n' "$key" "$(openssl rand -hex 32)" >> "$environment_file"
}

set_value() {
  local key="$1"
  local value="$2"
  if grep -Eq "^${key}=" "$environment_file"; then
    sed -i "s|^${key}=.*$|${key}=${value}|" "$environment_file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$environment_file"
  fi
}

ensure_secret DB_PASSWORD
set_value INSTANCE_ID linux-tutor-production
set_value INITIAL_ADMIN_EMAIL eletromind.brasil@gmail.com
set_value INITIAL_ADMIN_PASSWORD 12345678
set_value APP_ORIGIN https://linux.eletromind.cloud
set_value COOKIE_SECURE true

compose=(docker compose -f compose.yaml -f compose.production.yaml)
"${compose[@]}" config --quiet
"${compose[@]}" up --build --detach --remove-orphans

for _attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:4173/api/health >/dev/null; then
    "${compose[@]}" exec -T app npm run lessons:validate
    "${compose[@]}" exec -T app npm run smoke
    echo "Deploy validado em https://linux.eletromind.cloud"
    exit 0
  fi
  sleep 2
done

echo "O Linux Tutor não ficou saudável após o deploy." >&2
"${compose[@]}" logs --no-color --tail=150 app database >&2
exit 1
