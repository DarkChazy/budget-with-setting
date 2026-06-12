#!/usr/bin/env bash
set -euo pipefail
mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
OUT="backups/budget-${TS}.sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-budget}" "${POSTGRES_DB:-budget}" | gzip > "$OUT"
echo ">> Wrote $OUT"