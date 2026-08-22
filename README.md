# Zane's Adventures

A mobile-first adventure journal. Each adventure has three tabs —
**Preparation**, **Plan**, **Live updates** — plus photos, comments,
reactions, and a share link for friends.

Each adventure can also show the **route actually walked** — an
OpenStreetMap map of the track with a scrubbable elevation profile and
summary stats (distance, ascent, moving time, highest point, average
heart rate, max speed). Tracks come from Garmin via Strava; see
**Strava setup** below.

**Preparation** counts down to the departure date ("21 days to
departure") and holds a feed of training photos, each a full-width
picture with a one-sentence caption. **Live updates** is the same feed,
for posting a picture and a line from the trip itself. **Plan** keeps a
compact thumbnail strip, since its images are reference material.

The feed is split into **Upcoming adventures** and **Past adventures**,
by each adventure's status. Below both sits a **bucket list** of places
that aren't planned trips yet — a name, a destination, a picture and
three lines on why you want to go. Content is available in English,
Latvian and Dutch, and the order within each group is set by hand
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
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0006_bucketlist_title.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0007_departure_date.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0008_strava.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0009_site_text.sql
   npx wrangler d1 execute wayfarer --remote --file=./migrations/0010_caption_translations.sql
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

## Wording and translations

Photo captions are written in **English** and machine-translated to Latvian
and Dutch on save, by Workers AI (the `[ai]` binding in `wrangler.toml`,
model `@cf/meta/m2m100-1.2b`). Editing a caption while viewing in Latvian
or Dutch overwrites just that language by hand; editing the English one
re-translates the other two. If Workers AI is unavailable the columns stay
empty and the English caption shows through.

The app's own wording — tab names, headings, button labels — can be
rewritten without a deploy. In admin mode, tap **Site text** on the home
page, pick a language, filter to the string you want and edit it.
Overrides live in the `site_text` table and layer over the built-in
defaults; emptying a field restores the original. Rewritten strings are
flagged in the editor.

A **completed** adventure hides tabs that have no text and no photos, so
a past trip doesn't show an empty Preparation or Plan. Admin still sees
every tab (marked with a dashed outline) so content can be added to one
the public can't see yet.

## Strava setup (for route maps)

Garmin Connect syncs activities to Strava, and Strava pushes them here —
so the watch never talks to this site directly. Set it up once:

1. **Turn on Garmin → Strava sync.** In Garmin Connect, connect your
   Strava account so completed activities upload automatically.

2. **Create a Strava API application** at
   <https://www.strava.com/settings/api>. Set **Authorization Callback
   Domain** to your site's domain only — no `https://`, no path
   (e.g. `newtest.example.workers.dev`). Note the **Client ID** and
   **Client Secret**.

3. **Add three secrets to the Worker** (Settings → Variables and Secrets,
   or `npx wrangler secret put NAME`):

   | Name | Value |
   |---|---|
   | `STRAVA_CLIENT_ID` | from step 2 |
   | `STRAVA_CLIENT_SECRET` | from step 2 |
   | `STRAVA_VERIFY_TOKEN` | any random string you invent |

4. **Connect.** Open the site in admin mode (🔑) — a Strava strip appears
   under the title. Tap **Connect** and approve on Strava. You'll be sent
   back and the strip will show your name.

5. **Backfill and automate.** **Sync recent** imports your last 10
   activities (tap again for older ones). **Auto-sync** registers a
   webhook so future activities arrive on their own, within seconds of
   Garmin uploading them.

6. **Attach a track to an adventure.** Open the adventure in admin mode
   and use **Link activity** under Route. Link several for a multi-day
   trek — the map draws each day and the stats add up.

Nothing is shown publicly until an activity is linked to an adventure.
Tokens live in the `strava_auth` table; **Disconnect** deletes them and
leaves the imported activities in place.

## Local development

```bash
npx wrangler dev
```

(Requires being logged in via `npx wrangler login`, and the D1/R2
resources above to exist — `wrangler dev --remote` talks to your real
Cloudflare resources.)
