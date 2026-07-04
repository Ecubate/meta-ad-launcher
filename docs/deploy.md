# Deploy Runbook — Meta Ad Launcher

Mirrors the Ecubate Agent platform's model: a Node app under **pm2**, behind **nginx**,
SSL via **Certbot**. No Docker. In production the Express server serves both the API and
the built web app (single origin), so there's one process and one nginx block.

> The launcher is its own app — deploy it alongside the Agent apps, not inside them.

---

## 0. One-time prerequisites on the box
- Node (v20+), nginx, Certbot already present (they are, for the Agent platform).
- **Postgres**: `sudo apt install postgresql`, then create a DB + user:
  ```sql
  CREATE DATABASE adlauncher;
  CREATE USER adlauncher WITH PASSWORD '...';
  GRANT ALL PRIVILEGES ON DATABASE adlauncher TO adlauncher;
  ```

## 1. Switch the data layer to Postgres
In `server/prisma/schema.prisma` change the datasource provider:
```prisma
datasource db { provider = "postgresql"  url = env("DATABASE_URL") }
```
Set `DATABASE_URL="postgresql://adlauncher:...@localhost:5432/adlauncher"` in `.env`,
then create the tables: `npx prisma db push` (or `prisma migrate deploy` with migrations).

## 2. Production `.env` (server/.env)
| Var | Prod value |
|-----|-----------|
| `PORT` | e.g. `3010` (a free port; nginx proxies to it) |
| `DATABASE_URL` | the Postgres URL above |
| `SESSION_SECRET` | long random string |
| `TOKEN_ENCRYPTION_KEY` | long random string (encrypts stored Meta tokens) |
| `DEV_LOGIN` | `false` (disable the local dev login!) |
| `ALLOWED_EMAIL_DOMAIN` | `ecubate.com` (lock Google login to your domain) |
| `META_APP_ID` / `META_APP_SECRET` | your app creds |
| `META_OAUTH_REDIRECT` | `https://ads.ecubate.com/api/meta/oauth/callback` |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `GOOGLE_REDIRECT_URI` | Drive OAuth, prod callback |
Register the prod redirect URIs in the Meta app + Google Cloud OAuth client.

## 3. Build
```bash
npm ci
npm run build --workspace web      # → web/dist (served by the API)
npm run build --workspace server   # → server/dist (tsc)
npx prisma generate --schema server/prisma/schema.prisma
```

## 4. Run under pm2
```bash
pm2 start "node dist/index.js" --name adlauncher --cwd server
pm2 save
```
(Env is read from `server/.env`.) Verify: `curl localhost:3010/api/health`.

## 5. nginx site — `ads.ecubate.com`
`/etc/nginx/sites-available/adlauncher` (symlink into `sites-enabled/`), modeled on the
Agent site (long timeouts + no buffering for any streaming):
```nginx
server {
  server_name ads.ecubate.com;
  location / {
    proxy_pass http://localhost:3010;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_read_timeout 600s; proxy_send_timeout 600s;
    proxy_buffering off;
  }
}
```
`sudo nginx -t && sudo systemctl reload nginx`, then SSL:
```bash
sudo certbot --nginx -d ads.ecubate.com
```

## 6. Deploy / update flow
```bash
git pull
npm ci
npm run build --workspace web && npm run build --workspace server
npx prisma db push --schema server/prisma/schema.prisma   # if schema changed
pm2 restart adlauncher
```

## Production checklist (before going live)
- [ ] `DEV_LOGIN=false`, `ALLOWED_EMAIL_DOMAIN` set
- [ ] Fresh `SESSION_SECRET` + `TOKEN_ENCRYPTION_KEY` (not the dev defaults)
- [ ] Postgres (not SQLite); nightly `pg_dump` backup cron
- [ ] Meta + Google prod redirect URIs registered
- [ ] Meta app **Live** + (for client accounts) App Review + Business Verification
- [ ] Rotate any secrets that were ever in dev/chat
