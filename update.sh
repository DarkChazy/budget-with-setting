#!/usr/bin/env bash
set -euo pipefail
git pull --ff-only
docker compose build app
docker compose up -d app
docker compose ps