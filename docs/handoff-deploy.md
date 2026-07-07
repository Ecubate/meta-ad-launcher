# Deploy Handoff — adlauncher.ecubate.com

Everything to take this repo live on the Hetzner box. ~15 minutes for someone with
DNS access to ecubate.com + SSH to the box. Full detail: `docs/deploy.md`.

- **Repo:** `git@github.com:Ecubate/meta-ad-launcher.git`
- **Subdomain:** `adlauncher.ecubate.com`
- **Box:** Hetzner `178.104.130.152` (the `ecubate-app` host)
- **Port:** `3010` (free — the Agent apps use 3000/3001/3002/9000)

## 1. DNS (ecubate.com zone)
Add an A record:
```
adlauncher.ecubate.com   A   178.104.130.152
```

## 2. One-time box setup
```bash
# Postgres
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE DATABASE adlauncher;"
sudo -u postgres psql -c "CREATE USER adlauncher WITH PASSWORD '<pick-one>';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE adlauncher TO adlauncher;"

# Code
git clone git@github.com:Ecubate/meta-ad-launcher.git ~/adlauncher
cd ~/adlauncher

# Switch Prisma to Postgres: edit server/prisma/schema.prisma → provider = "postgresql"
# Env: copy the template and fill CHANGE_ME values
cp deploy/.env.production.example server/.env && nano server/.env
#   → set DB password, rotated META_APP_SECRET, Google creds,
#     and generate secrets: openssl rand -hex 32  (TOKEN_ENCRYPTION_KEY, SESSION_SECRET)

# nginx + SSL
sudo cp deploy/nginx-adlauncher.ecubate.com.conf /etc/nginx/sites-available/adlauncher
sudo ln -s /etc/nginx/sites-available/adlauncher /etc/nginx/sites-enabled/adlauncher
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d adlauncher.ecubate.com
```

## 3. Deploy
```bash
cd ~/adlauncher && bash deploy/deploy.sh
```
→ live at **https://adlauncher.ecubate.com**

## 4. Register OAuth redirect URIs
- **Meta app** (Facebook Login → Settings → Valid OAuth Redirect URIs):
  `https://adlauncher.ecubate.com/api/meta/oauth/callback`
- **Google Cloud OAuth client** (Authorized redirect URIs):
  `https://adlauncher.ecubate.com/api/drive/oauth/callback`
  `https://adlauncher.ecubate.com/api/auth/google/callback`

## Updates later
`cd ~/adlauncher && bash deploy/deploy.sh` (pulls latest + rebuilds + pm2 reload).

## Notes
- Additive only — new port, new nginx site, new DB. Doesn't touch the Agent apps.
- Nightly DB backup: `pg_dump adlauncher > ~/backups/adlauncher-$(date +%F).sql` in cron.
