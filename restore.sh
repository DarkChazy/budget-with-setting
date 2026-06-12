#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then echo "Usage: $0 <backup.sql.gz>"; exit 1; fi
read -p "This wipes the DB. Type YES: " ans
[ "$ans" = "YES" ] || exit 1
docker compose exec -T db psql -U "${POSTGRES_USER:-budget}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-budget};"
docker compose exec -T db psql -U "${POSTGRES_USER:-budget}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB:-budget};"
gunzip -c "$FILE" | docker compose exec -T db psql -U "${POSTGRES_USER:-budget}" -d "${POSTGRES_DB:-budget}"