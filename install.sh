#!/usr/bin/env bash
set -euo pipefail
if [ ! -f .env ]; then
  cp .env.example .env
  echo ">> Created .env from .env.example — edit it before continuing."
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo ">> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi
docker compose build
docker compose up -d
sleep 5
docker compose ps
echo ">> Done. App on :80, DB on 127.0.0.1:5432."
echo ">> Register your first user at http://<host>/register"