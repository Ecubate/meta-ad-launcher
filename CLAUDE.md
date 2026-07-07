# Meta Ad Launcher — Claude Code instructions

Agency tool: an Adnova-style bulk Meta ad launcher. It is a deliberate **sibling**
of the Ecubate Agent platform, not part of it — the accepted architecture decisions
(pm2 + nginx + Certbot deploy, passport Google OAuth, Postgres, TypeScript + React)
live in `docs/architecture.md`. Read that before changing structure.

---

## Deploy target — the agency server (NOT the AI-tool box)

This tool runs on **box 2, the agency server** — never on the AI-tool box.

- **Server:** `159.69.195.123` (Hetzner, Nuremberg). App work over SSH as `ecubate@159.69.195.123`. On Mart's Mac the aliases are `agency` (root) and `agency-app` (ecubate user).
- **App dir:** `~/adlauncher`. Runs under **pm2** as `adlauncher` on port **3010**, behind nginx at **adlauncher.ecubate.com** (SSL via Certbot).
- **Database:** **PostgreSQL** on the box (`adlauncher` db/role). The repo keeps `server/prisma/schema.prisma` on `sqlite` for local dev; `deploy/deploy.sh` flips the provider to `postgresql` on every deploy.
- **Deploy:** on the box, `bash deploy/deploy.sh` (git pull → `npm ci` → build web+server → `prisma db push` → pm2). See `docs/deploy.md` / `docs/handoff-deploy.md`.

Do **NOT** deploy this onto the AI-tool box (`178.104.130.152` / `interface.ecubate.com` / aliases `ecubate` / `ecubate-app`). That box is the Ecubate Agent platform only. Keeping the two apart is the whole reason box 2 exists.

---

## Secrets

`server/.env` on the box holds the real credentials (Meta app secret, Google OAuth,
`DATABASE_URL`, encryption/session keys). **Never commit it.** `server/.env.example`
and `deploy/.env.production.example` show the expected shape.

`DEV_LOGIN=true` is an auth bypass for internal testing only — it must be `false`
before this is exposed on the public domain (this tool can spend ad budget; it must
never be open). Configure Google OAuth first, then flip it off.
