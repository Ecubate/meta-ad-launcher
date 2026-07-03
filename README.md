# Meta Ad Launcher (Adnova-style)

Internal bulk ad launcher for Meta. Pull creatives from Google Drive, bulk-create
Meta ads from a copy template — with **every Advantage+/AI feature OFF by default**
(no more toggling them off by hand in Ads Manager).

```
web/      React + Vite + TypeScript + Tailwind — the app (sidebar, onboarding, launcher)
server/   Express + TypeScript — Meta Marketing API + Google Drive + launch engine
          prisma/  SQLite data model (Postgres-ready)
```

## Quick start

```bash
npm install                                   # installs web + server workspaces
cp server/.env.example server/.env            # (or edit the generated server/.env)
npm run db:push --workspace server -- --accept-data-loss
npm run db:seed                               # seeds Ecubate → Walther Apparel
npm run dev                                   # web :5173, api :8787
```

> Node is required. If you don't have it: `nvm install --lts` (this repo was built on Node 24).

## Configuration (`server/.env`)

| Var | What |
|-----|------|
| `META_API_VERSION` | Graph API version to pin, e.g. `v21.0` |
| `META_APP_ID` / `META_APP_SECRET` | Your Meta Business app credentials |
| `META_SYSTEM_USER_TOKEN` | System User token (own accounts) with `ads_management`, `ads_read` |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Drive OAuth, OR set `GOOGLE_SERVICE_ACCOUNT_JSON` |
| `DATABASE_URL` | `file:./prisma/dev.db` (SQLite) or a `postgres://` URL |
| `TOKEN_ENCRYPTION_KEY` | 32+ random chars — encrypts stored access tokens |

## How it works

1. **Onboard an ad account** (5-step wizard): Facebook Page + Instagram, pixel, ad-naming
   convention, launch settings (multi-advertiser, launch-as-paused), and creative
   enhancements (all AI off).
2. **Sync creatives** from a Google Drive folder into the workspace library.
3. **Launch**: pick creatives + a copy template → the engine uploads media to Meta and
   runs the chain `adimages/advideos → campaign → ad set → ad creative → ad`, capturing
   per-ad errors. AI audience/placements/enhancements are opted out explicitly.

## Status

- ✅ Backend: Meta client (full launch chain, AI-off), Drive client, launch engine, naming, REST API
- ✅ Data model + SQLite, seeded demo tenant
- ✅ Web shell (sidebar / nav matching the reference)
- 🚧 Onboarding wizard UI + the bulk-launch table (in progress)

See `../meta-ad-launcher-architecture.md` for the full design + Meta API spec.
