# Meta Ad Launcher — Claude Code instructions

Adnova-style bulk Meta ad launcher (TypeScript + React SPA + Express, Prisma). Sibling to the
Ecubate Agent platform — see the architecture ADR in `docs/`.

## Where this deploys — the agency server (box 2)

This tool runs on the **agency** Hetzner box, NOT the AI-tool box:

- **Server:** `159.69.195.123` (Nuremberg). SSH: `ecubate@159.69.195.123` (app user, daily work) or
  `root@159.69.195.123` for system-level changes.
- **App dir:** `/home/ecubate/adlauncher`. Runs under **pm2** as `adlauncher` on **:3010**.
- **Domain (target):** `adlauncher.ecubate.com` via nginx + Certbot — wired up only once it is safe to be
  public (see security note below).
- Never deploy this onto the AI-tool box (`interface.ecubate.com` / `178.104.130.152`). That box is the
  Ecubate Agent only.

## Deploy

Run `bash deploy/deploy.sh` **on the box** (git pull → npm ci → build → `prisma db push` → pm2 restart).
The repo keeps `provider = "sqlite"` for local dev; `deploy.sh` flips it to `postgresql` for prod on each
run. Coordinate first — only one person runs a deploy at a time (concurrent runs collide on the box).

## Security — this tool can spend ad budget

- It must never be publicly reachable without real auth. `DEV_LOGIN=true` is a login **bypass** for internal
  testing only (reach it via an SSH tunnel to `:3010`, e.g. `ssh -L 3010:localhost:3010 ecubate@159.69.195.123`).
- Do NOT put it behind the public domain + SSL while `DEV_LOGIN=true`. Go public only after Google OAuth is
  configured and `DEV_LOGIN=false`.

## Secrets

Live in `server/.env` on the box (git-ignored). Never commit secrets. Rotate `META_APP_SECRET` if it leaks.
