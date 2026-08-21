# Zane's Adventures

A mobile-first adventure journal. Each adventure has three tabs —
**Preparation**, **Plan**, **Live updates** — plus photos, comments,
reactions, and a share link for friends. Below the feed sits a
**bucket list** of places that aren't planned trips yet — a picture, a
destination, and a few lines on what tempts you. Content is available in
English, Latvian and Dutch, and the feed order is set by hand
(drag-to-reorder in admin mode) rather than newest-first.

## Stack

- **Cloudflare Worker** (`src/index.js`) — serves the static app and a
  small JSON API.
- **Cloudflare D1** — adventures, sections, comments, reactions.
- **Cloudflare R2** — uploaded photos.
- **Frontend** (`public/`) — a tiny vanilla-JS single-page app. No
  framework, no build step.

## Project structure

```
.
├── src/index.js          # Worker: API routes + static asset fallback
├── public/                # Frontend (served as static assets)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── migrations/            # D1 schema + seed data
└── wrangler.toml
```

## One-time Cloudflare setup

The site so far has been deployed as **static assets only**. To support a
database and photo uploads, this push adds a real Worker script with
bindings — a few one-time steps are needed in your Cloudflare account
before it will work (I can't create these resources for you from here).

You can do this either in the **dashboard** or with **wrangler CLI**
(`npx wrangler login` first). Dashboard steps below.

1. **Create the D1 database**
   Workers & Pages → **D1** → **Create database** → name it `wayfarer`.
   Copy the **Database ID** it gives you.

2. **Wire the database ID into `wrangler.toml`**
   Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.toml` with the
   ID from step 1, commit, and push — or just tell me the ID and I'll do it.

3. **Run the migrations** (creates tables + seeds the Andorra adventure)
   ```bash
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0001_init.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0002_seed_andorra.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0003_i18n.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0004_tabs_and_ordering.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0005_bucketlist.sql
   ```
   They can also be pasted into the D1 **Console** tab in the dashboard.

4. **Create the R2 bucket**
   Workers & Pages → **R2** → **Create bucket** → name it `wayfarer-photos`
   (must match `wrangler.toml`).

5. **Set the admin passcode**
   Your `newtest` Worker → **Settings** → **Variables and Secrets** →
   **Add** → name `ADMIN_KEY`, type **Secret**, value: a passcode you'll
   remember. This is what unlocks editing/uploading on the site (tap the
   🔑 icon, top right).

6. **Bind D1 + R2 to the Worker**
   If the dashboard doesn't pick up the bindings from `wrangler.toml`
   automatically on deploy, add them manually under the Worker's
   **Settings → Bindings**: a D1 binding named `DB` → `wayfarer`, and an
   R2 binding named `PHOTOS` → `wayfarer-photos`.

7. **Push to `main`** — Workers Builds will redeploy automatically.

Once that's done, the site is fully live: anyone with the link can view,
comment, and react from their phone; only you (with the passcode) can add
adventures, edit section text, and upload photos.

## Local development

```bash
npx wrangler dev
```

(Requires being logged in via `npx wrangler login`, and the D1/R2
resources above to exist — `wrangler dev --remote` talks to your real
Cloudflare resources.)
