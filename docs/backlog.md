# Build Backlog — Meta Ad Launcher

Status as of 2026-07-04. Grouped by priority. "✅ done" = built + verified this far.

## ✅ Already built
- App shell, dark theme, icon set; auth (Google OAuth scaffolding + dev-login, session gating, logout)
- Screens: Launch table, Load-Creatives modal, Creatives, Launched Ads, Drafts, Default Ad Copy,
  Ad Copy Templates (+create modal), Creative Enhancements, Configure Placements, Launch Settings
- Data model (SQLite), REST API, naming engine
- Meta engine: campaign + ad set **proven live**; image upload proven; creative/ad blocked only by app Dev mode

---

## Tier 1 — Make it genuinely usable end-to-end (own accounts)
1. **"Connect Facebook" OAuth flow** — replace the `.env` token with a real per-workspace Facebook
   OAuth that fetches + stores (encrypted) the ads token; handle ~60-day user-token expiry / reconnect.
2. **Wire Placements into the engine** — Configure Placements is saved but NOT applied to ad-set
   `targeting` (publisher_platforms / positions). Currently a no-op at launch.
3. **Full Creative-Enhancement mapping** — only a subset of the per-ad-type toggles map to
   `degrees_of_freedom_spec`. Map the rest; validate against the API version.
4. **Real Google Drive ingestion** — add the bulk-link paste (up to 100 links, per Adnova) and set up
   Drive credentials (service account or OAuth). Today: folder-ID sync only, no creds.
5. **Copy variations → multiple ads** — expand multiple primary texts / headlines into ad combinations
   (currently only the first value is used).
6. **Meta app → Live mode** (external) — unblocks creative + ad creation.

## Tier 2 — Adnova exact-mirror parity (seen in screenshots, not yet built)
7. **Bulk Edit** — edit fields across selected launch-table rows.
8. **Group Creatives** — the toolbar grouping action.
9. **Ad-set "Duplicate"** mode — duplicate an existing ad set (only attach-existing + new-campaign built).
10. **More creative sources** in Load-Creatives — Creative Hub (boards), Existing Ads, Organic Posts,
    Local Device, Dropbox, Frame.io, Air. Only Google Drive built.
11. **Per-row naming placeholders** — fill `{{influencer}}/{{product}}/{{offer}}/{{concept}}` per ad at
    launch (the naming convention exists in settings; per-ad fill not wired).
12. **Meta-populated dropdowns** — Ad Profiles (Page/IG) and Pixel are free-text; wire them to the
    discovery endpoints (need a token) as real dropdowns.
13. **Launch table UX** — list/grid toggle, search-by-ad-name, pagination.
14. **Reopen a Draft** into the launch table to edit/launch (drafts currently only list).
15. **Ad Copy Templates** — "Load From Existing Ads", "Import CSV", and editing an existing template
    (only create/delete built).
16. **Creatives library** — richer columns + filters (Boards, Launch Status, Uploader, Tags, Custom
    Fields, Extension) + Upload button.
17. **Onboarding wizard** — the 5-step modal (first screenshots) as a guided flow; today it's settings pages.
18. **Partnership Ads** — placeholder only (decide if in scope).

## Tier 3 — Production hardening
19. **Postgres** migration (SQLite → Postgres per ADR).
20. **Persistent session store** (currently in-memory MemoryStore — leaks, single-instance only).
21. **Real workspace/account switching** — the switchers are display-only; add switching + create flows.
22. **Job durability** — launches run in-process (p-limit); a restart mid-launch loses progress. Consider a queue for large batches.
23. **Tests** — none yet (at least the engine + naming + API).
24. **Cleanup** — prune unused `lucide-react`; fix the `prisma/prisma/dev.db` double-path quirk; real `TOKEN_ENCRYPTION_KEY`.

## Tier 4 — External / blocked (not code)
25. Flip Meta app to **Live mode** (creative/ad).
26. **Meta App Review + Business Verification** — required for *client* accounts.
27. **Google OAuth creds** (real SSO) + **Drive creds**.
28. **Deploy** — pm2/nginx/certbot runbook, Postgres on the box, GitHub repo (Mart's domain).
