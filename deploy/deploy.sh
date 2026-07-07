#!/usr/bin/env bash
#
# Repeatable deploy for the Meta Ad Launcher (run ON the Hetzner box).
# First-time box setup (Node, pm2, Postgres, nginx, Certbot, server/.env) is a
# one-time thing — see docs/deploy.md. This script does the app deploy/update.
#
# Usage:  bash deploy/deploy.sh
#
set -euo pipefail

# Cap Node's heap so the TypeScript build doesn't OOM on the 2 GB agency box —
# Prisma's generated client types are memory-heavy and tsc hits the default
# ~950 MB limit. Overridable via the environment.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

# ===== edit these once =====
APP_DIR="${APP_DIR:-$HOME/adlauncher}"                 # where the repo lives on the box
REPO="git@github.com:Ecubate/meta-ad-launcher.git"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3010}"                                   # must match server/.env PORT + nginx
# ===========================

echo "▶ Deploying $REPO ($BRANCH) → $APP_DIR"

# 1. Get the latest code
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 1b. Production uses Postgres (repo stays SQLite for local dev). Idempotent:
# the git reset above restored sqlite; this flips it to postgresql each deploy.
sed -i 's/provider = "sqlite"/provider = "postgresql"/' server/prisma/schema.prisma

# 2. Install + build (web → web/dist served by the API; server → server/dist)
npm ci
npm run build --workspace web
npm run build --workspace server

# 3. Sync the database schema (Postgres in prod — see server/.env DATABASE_URL).
# Prisma does NOT auto-load server/.env from the repo root, so export it first,
# otherwise `prisma db push` errors with "Environment variable not found: DATABASE_URL".
if [ -f server/.env ]; then set -a; . server/.env; set +a; fi
npx prisma db push --schema server/prisma/schema.prisma

# 4. Start / reload under pm2 (env is read from server/.env)
if pm2 describe adlauncher >/dev/null 2>&1; then
  pm2 restart adlauncher
else
  pm2 start "node dist/index.js" --name adlauncher --cwd "$APP_DIR/server"
fi
pm2 save

sleep 2
echo "✔ Deployed. Health check:"
curl -fsS "http://localhost:$PORT/api/health" && echo || echo "  (server not responding on :$PORT — check: pm2 logs adlauncher)"
