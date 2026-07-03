# Architecture — Meta Ad Launcher

**Status:** Proposed (awaiting Mart's review)
**Date:** 2026-07-01
**Owner:** Geert

This ADR proposes how the Meta ad launcher aligns with the Ecubate Agent platform
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
Documented here so it's a conscious choice, not drift. Open question for Mart: acceptable,
or prefer to keep everything file-based?

---

## Decision 4 — Language & frontend (open — Mart to decide)

Two options, no unilateral choice:
- **(A) Mirror:** plain JS (ESM) + Express-rendered views, matching the platform exactly.
- **(B) Hybrid:** TypeScript + a small React/Vite SPA for the bulk-edit ad table only
  (the table is genuinely SPA-shaped), served by the same Express app.

**Why it's open:** Consistency (A) vs. UX/maintainability of a complex table (B). Mart owns
the standard. The current prototype is (B); it can be converted to (A) if required.

**Consequence:** Whichever is chosen is applied consistently. If (A), the existing
TS/React prototype is rewritten before any further feature work.

---

## Migration / next steps

1. Mart reviews Decisions 3 and 4.
2. On acceptance, create `Ecubate/<repo>`, add the nginx/pm2/Certbot deploy runbook.
3. Adopt passport Google OAuth before any deploy.
4. Continue feature build (launch table + Drive ingestion) on the agreed stack.
