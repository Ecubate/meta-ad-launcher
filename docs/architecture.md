# Architecture — Meta Ad Launcher

**Status:** Accepted (2026-07-01, by Geert) — Decisions 3 & 4 ratified as recommended.
**Date:** 2026-07-01
**Owner:** Geert
**Note for Mart:** Decisions 1 & 2 mirror the Agent platform. Decisions 3 (Postgres) and
4 (TypeScript + React table) are deliberate, contained divergences justified below — flag
async if you'd prefer otherwise; the rework is bounded to this isolated repo.

This ADR sets how the Meta ad launcher aligns with the Ecubate Agent platform
(`docs/architecture.md` in `Ecubate/Agent`). It follows the same format. Anything
accepted here becomes the standard for this tool; anything contradicting it is debt.

---

## Context

- The Ecubate Agent platform (Mart) is: Node + Express (ESM, **plain JS**), server-rendered
  `interface/` + static `public/`, **file-based** state (JSON/CSV/md, no DB), auth via
  **passport Google OAuth**, deployed with **pm2 + nginx + Certbot** on the Hetzner box
  (`ecubate-app`), one subdomain per app. No Docker. GitHub `Ecubate/Agent`.
- The Meta ad launcher is a different shape of app: an Adnova-style **bulk ad launcher** —
  a data-entry-heavy table (100+ ads/batch), OAuth tokens that can **spend money**, and
  launch history that must be queried. It is CRUD/transactional, not agentic.
- Goal: make it a **sibling** to the Agent platform — same operational conventions, same
  box, same deploy — diverging only where the launcher's nature genuinely requires it.

---

## Decision 1 — Deploy exactly like the Agent platform (pm2 + nginx + Certbot)

The launcher deploys as a new **pm2** app on a free port behind an **nginx** `server{}`
block for a new subdomain (e.g. `ads.ecubate.com`), SSL via **Certbot**. No Docker.

**Why:** Matches the running infra. One operational model for the team to maintain.
Reuses the box already paid for. My earlier Docker recommendation is withdrawn.

**Consequence:** A deploy runbook mirrors the Agent's (git pull → `npm ci` →
`pm2 restart`). Repo lives at `github.com/Ecubate/<name>`.

---

## Decision 2 — Auth via passport + Google OAuth (same as the platform)

The "money-safety" gate uses **passport + passport-google-oauth20 + express-session**,
restricted to Ecubate Google accounts — identical to the interface.

**Why:** This tool can spend ad budget; it must never be open. Reusing Mart's exact auth
pattern means one login model and no new auth surface to reason about.

**Consequence:** No custom auth. Session + passport middleware protects every route.

---

## Decision 3 — Use a database (deliberate divergence from file-based state)

The launcher uses **Postgres** (SQLite acceptable for local dev) via a thin data layer —
NOT file-based state.

**Why:** The Agent platform is file-based because its data is per-account context the
agent re-reads. The launcher's data is different: encrypted OAuth tokens, a bulk-edit ad
table, and launch history/status that must be queried and updated transactionally.
File-based state would be fragile and slow for this. This is the one divergence with the
strongest justification.

**Consequence:** Adds Postgres to the box (a service the platform doesn't currently run).
Local dev uses SQLite; production uses Postgres via the same data layer. Documented here so
it's a conscious choice, not drift.

**Status: Accepted** (2026-07-01). Mart may flag async.

---

## Decision 4 — TypeScript + React SPA for the launch table (Accepted)

The tool is built in **TypeScript**, with a **React/Vite SPA** for the app UI (the bulk-edit
ad table is genuinely SPA-shaped), served by the same Express app that exposes the API.

**Why:** (1) This tool touches ad budget — TypeScript's type safety materially reduces the
class of bugs that matter most here. (2) The launch table is a live 100-row editable grid
with bulk edit + variations; server-rendered views would be painful to build and maintain.
This diverges from the platform's plain-JS/Express-rendered convention, deliberately and
in a contained way (one isolated repo).

**Consequence:** Applied consistently across the tool. If Mart later requires plain-JS
parity, the conversion is bounded to this repo. **Status: Accepted** (2026-07-01).

---

## Migration / next steps

1. ✅ Decisions accepted (2026-07-01). Build proceeds on the agreed stack.
2. Feature build order: onboarding/settings → creatives + Drive → ad copy → launch table.
3. Before any deploy: adopt passport Google OAuth; Mart creates `Ecubate/<repo>` + the
   nginx/pm2/Certbot deploy runbook (his domain).
4. Mart may flag Decisions 3/4 async; rework is bounded to this repo.
