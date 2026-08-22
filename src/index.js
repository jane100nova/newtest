// Wayfarer worker: serves the static app and a small JSON API backed by
// D1 (adventures/sections/comments/reactions) and R2 (photos).

const SECTION_DEFAULTS = [
  { type: "prepare", title: "Preparation", sort_order: 1 },
  { type: "plan", title: "Plan", sort_order: 2 },
  { type: "experience", title: "Live updates", sort_order: 3 },
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

function isAdmin(request, env) {
  const key = (request.headers.get("x-admin-key") || "").trim();
  const expected = (env.ADMIN_KEY || "").trim();
  return !!expected && !!key && key === expected;
}

function requireAdmin(request, env) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, { status: 401 });
  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || crypto.randomUUID().slice(0, 8);
}

// Departure dates come from an <input type="date">, i.e. YYYY-MM-DD. Anything
// else is dropped rather than stored, so the countdown can trust the column.
function cleanDate(value) {
  const s = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

async function getAdventureBySlug(env, slug) {
  const adventure = await env.DB.prepare("SELECT * FROM adventures WHERE slug = ?").bind(slug).first();
  if (!adventure) return null;

  // Activities arrive from migration 0008; degrade rather than 500 without it.
  let activities = [];
  try {
    ({ results: activities } = await env.DB
      .prepare("SELECT * FROM activities WHERE adventure_id = ? ORDER BY start_date")
      .bind(adventure.id)
      .all());
  } catch {
    activities = [];
  }

  const [sections, photos, comments, reactions] = await Promise.all([
    env.DB.prepare("SELECT * FROM sections WHERE adventure_id = ? ORDER BY sort_order").bind(adventure.id).all(),
    env.DB.prepare("SELECT * FROM photos WHERE adventure_id = ? ORDER BY created_at").bind(adventure.id).all(),
    env.DB.prepare("SELECT * FROM comments WHERE adventure_id = ? ORDER BY created_at DESC").bind(adventure.id).all(),
    env.DB.prepare("SELECT emoji, count FROM reactions WHERE adventure_id = ?").bind(adventure.id).all(),
  ]);

  const photosByType = {};
  for (const p of photos.results) {
    (photosByType[p.section_type] ||= []).push(p);
  }

  const reactionMap = {};
  for (const r of reactions.results) reactionMap[r.emoji] = r.count;

  return {
    ...adventure,
    sections: sections.results.map((s) => ({ ...s, photos: photosByType[s.type] || [] })),
    cover_photos: photosByType.cover || [],
    comments: comments.results,
    reactions: reactionMap,
    activities: activities.map((a) => ({ ...a, track: JSON.parse(a.track || "[]") })),
  };
}

// Captions are authored in English; Workers AI fills in the other two so a
// photo reads in every language. A failed translation leaves the column empty,
// and the frontend falls back to the English text.
const TRANSLATE_MODEL = "@cf/meta/m2m100-1.2b";
const CAPTION_LANGS = ["lv", "nl"];

async function translateCaption(env, text) {
  const source = String(text || "").trim();
  const out = { lv: "", nl: "" };
  if (!source || !env.AI) return out;

  for (const target of CAPTION_LANGS) {
    try {
      const res = await env.AI.run(TRANSLATE_MODEL, {
        text: source,
        source_lang: "en",
        target_lang: target,
      });
      out[target] = String(res?.translated_text || "").trim().slice(0, 200);
    } catch {
      // Model unavailable or over quota — leave it blank rather than fail.
    }
  }
  return out;
}

async function storeCaptionTranslations(env, photoId, text) {
  const { lv, nl } = await translateCaption(env, text);
  if (!lv && !nl) return;
  await env.DB.prepare("UPDATE photos SET caption_lv = ?, caption_nl = ? WHERE id = ?")
    .bind(lv, nl, photoId)
    .run();
}

// ---------------------------------------------------------------- Strava --
// Garmin Connect syncs activities to Strava; Strava pushes them here. We keep
// one athlete's tokens (row id = 1) and a downsampled copy of each track.

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_SCOPE = "activity:read_all";
const TRACK_MAX_POINTS = 1200;
const STREAM_KEYS = "latlng,altitude,time,heartrate,velocity_smooth,distance";

function round(value, places) {
  if (typeof value !== "number" || !isFinite(value)) return null;
  const m = 10 ** places;
  return Math.round(value * m) / m;
}

function stravaAuthRow(env) {
  return env.DB.prepare("SELECT * FROM strava_auth WHERE id = 1").first();
}

// A full-resolution track is one point per second — far more than a phone-sized
// map or chart can show. Keep every Nth point, plus the last one.
function buildTrack(streams) {
  const latlng = streams?.latlng?.data;
  if (!Array.isArray(latlng) || !latlng.length) return [];

  const alt = streams?.altitude?.data || [];
  const time = streams?.time?.data || [];
  const hr = streams?.heartrate?.data || [];
  const vel = streams?.velocity_smooth?.data || [];
  const dist = streams?.distance?.data || [];

  const at = (i) => {
    const pair = latlng[i] || [];
    return [
      round(pair[0], 5),
      round(pair[1], 5),
      round(alt[i], 1),
      Number.isFinite(time[i]) ? time[i] : null,
      Number.isFinite(hr[i]) ? hr[i] : null,
      round(vel[i], 2),
      Number.isFinite(dist[i]) ? Math.round(dist[i]) : null,
    ];
  };

  const n = latlng.length;
  const step = Math.max(1, Math.ceil(n / TRACK_MAX_POINTS));
  const out = [];
  for (let i = 0; i < n; i += step) out.push(at(i));
  if ((n - 1) % step !== 0) out.push(at(n - 1));
  return out;
}

// Access tokens last ~6 hours; the refresh token is the durable half.
async function stravaAccessToken(env) {
  const row = await stravaAuthRow(env);
  if (!row?.refresh_token) return null;

  const now = Math.floor(Date.now() / 1000);
  if (row.access_token && row.expires_at > now + 120) return row.access_token;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });
  if (!res.ok) return null;

  const tok = await res.json();
  await env.DB.prepare(
    `UPDATE strava_auth SET access_token = ?, refresh_token = ?, expires_at = ?,
       updated_at = datetime('now') WHERE id = 1`
  )
    .bind(tok.access_token, tok.refresh_token, tok.expires_at)
    .run();
  return tok.access_token;
}

async function stravaGet(env, path, params = {}) {
  const token = await stravaAccessToken(env);
  if (!token) throw new Error("Strava is not connected");

  const target = new URL(`${STRAVA_API}/${path}`);
  for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);

  const res = await fetch(target, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 429) throw new Error("Strava rate limit reached — try again later");
  if (!res.ok) throw new Error(`Strava request failed (${res.status})`);
  return res.json();
}

// Upsert, so re-syncing an activity refreshes its data without detaching it
// from the adventure it was linked to (adventure_id is left out of the UPDATE).
async function importActivity(env, activityId) {
  const a = await stravaGet(env, `activities/${activityId}`);

  let streams = {};
  try {
    streams = await stravaGet(env, `activities/${activityId}/streams`, {
      keys: STREAM_KEYS,
      key_by_type: "true",
    });
  } catch {
    // Treadmill runs and other GPS-less activities have no streams. The
    // summary is still worth keeping.
  }

  await env.DB.prepare(
    `INSERT INTO activities (id, name, sport_type, start_date, moving_time, elapsed_time,
       distance_m, ascent_m, elev_high, elev_low, average_speed, max_speed,
       average_heartrate, max_heartrate, track, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, sport_type = excluded.sport_type,
       start_date = excluded.start_date, moving_time = excluded.moving_time,
       elapsed_time = excluded.elapsed_time, distance_m = excluded.distance_m,
       ascent_m = excluded.ascent_m, elev_high = excluded.elev_high,
       elev_low = excluded.elev_low, average_speed = excluded.average_speed,
       max_speed = excluded.max_speed, average_heartrate = excluded.average_heartrate,
       max_heartrate = excluded.max_heartrate, track = excluded.track,
       synced_at = datetime('now')`
  )
    .bind(
      a.id,
      a.name || "",
      a.sport_type || a.type || "",
      a.start_date || "",
      a.moving_time || 0,
      a.elapsed_time || 0,
      a.distance || 0,
      a.total_elevation_gain || 0,
      a.elev_high ?? null,
      a.elev_low ?? null,
      a.average_speed ?? null,
      a.max_speed ?? null,
      a.average_heartrate ?? null,
      a.max_heartrate ?? null,
      JSON.stringify(buildTrack(streams))
    )
    .run();

  return a.id;
}

async function handleApi(request, env, url, ctx) {
  const parts = url.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const method = request.method;

  // GET /api/adventures
  if (method === "GET" && parts.length === 1 && parts[0] === "adventures") {
    const columns = `id, slug, title, destination, date_label, status,
                     summary, summary_lv, summary_nl, cover_key, created_at, depart_on`;
    let results;
    try {
      ({ results } = await env.DB.prepare(
        `SELECT ${columns}, sort_order FROM adventures ORDER BY sort_order ASC, created_at DESC`
      ).all());
    } catch {
      // sort_order is added by migration 0004. Until that has been run, fall
      // back to newest-first rather than failing the whole feed.
      ({ results } = await env.DB.prepare(
        `SELECT ${columns} FROM adventures ORDER BY created_at DESC`
      ).all());
    }
    return json({ adventures: results });
  }

  // POST /api/adventures  (admin)
  if (method === "POST" && parts.length === 1 && parts[0] === "adventures") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    if (!body.title) return json({ error: "title required" }, { status: 400 });
    const slug = body.slug ? slugify(body.slug) : slugify(body.title);

    const exists = await env.DB.prepare("SELECT id FROM adventures WHERE slug = ?").bind(slug).first();
    if (exists) return json({ error: "an adventure with that slug already exists" }, { status: 409 });

    const common = [
      slug,
      body.title,
      body.destination || "",
      body.date_label || "",
      body.status === "completed" ? "completed" : "upcoming",
      body.summary || "",
      body.source_url || "",
      cleanDate(body.depart_on) || null,
    ];

    let result;
    try {
      const minOrder = await env.DB.prepare("SELECT MIN(sort_order) AS m FROM adventures").first();
      result = await env.DB.prepare(
        `INSERT INTO adventures (slug, title, destination, date_label, status, summary, source_url, depart_on, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(...common, (minOrder?.m ?? 0) - 1)
        .run();
    } catch {
      // Pre-migration fallback (see the feed query above).
      result = await env.DB.prepare(
        `INSERT INTO adventures (slug, title, destination, date_label, status, summary, source_url, depart_on)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(...common)
        .run();
    }

    const adventureId = result.meta.last_row_id;
    for (const s of SECTION_DEFAULTS) {
      await env.DB.prepare(
        "INSERT INTO sections (adventure_id, type, title, body, sort_order) VALUES (?, ?, ?, '', ?)"
      )
        .bind(adventureId, s.type, s.title, s.sort_order)
        .run();
    }

    return json({ slug }, { status: 201 });
  }

  // POST /api/adventures/reorder  (admin) — body: { slugs: [...] } in display order
  if (method === "POST" && parts.length === 2 && parts[0] === "adventures" && parts[1] === "reorder") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const slugs = Array.isArray(body.slugs) ? body.slugs : null;
    if (!slugs || !slugs.length) return json({ error: "slugs array required" }, { status: 400 });
    if (slugs.length > 500) return json({ error: "too many slugs" }, { status: 400 });

    await env.DB.batch(
      slugs.map((slug, i) =>
        env.DB.prepare("UPDATE adventures SET sort_order = ? WHERE slug = ?").bind(i, String(slug))
      )
    );

    return json({ ok: true });
  }

  // GET /api/adventures/:slug
  if (method === "GET" && parts.length === 2 && parts[0] === "adventures") {
    const adventure = await getAdventureBySlug(env, parts[1]);
    if (!adventure) return json({ error: "not found" }, { status: 404 });
    return json({ adventure });
  }

  // PATCH /api/adventures/:slug  (admin)
  if (method === "PATCH" && parts.length === 2 && parts[0] === "adventures") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const fields = ["title", "destination", "date_label", "status", "summary", "summary_lv", "summary_nl", "source_url", "depart_on"];
    const updates = fields.filter((f) => body[f] !== undefined);
    if (updates.length === 0) return json({ error: "nothing to update" }, { status: 400 });

    await env.DB.prepare(
      `UPDATE adventures SET ${updates.map((f) => `${f} = ?`).join(", ")} WHERE slug = ?`
    )
      .bind(...updates.map((f) => (f === "depart_on" ? cleanDate(body[f]) || null : body[f])), parts[1])
      .run();

    return json({ ok: true });
  }

  // POST /api/adventures/:slug/comments
  if (method === "POST" && parts.length === 3 && parts[0] === "adventures" && parts[2] === "comments") {
    const adventure = await env.DB.prepare("SELECT id FROM adventures WHERE slug = ?").bind(parts[1]).first();
    if (!adventure) return json({ error: "not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const name = (body.name || "").trim().slice(0, 60);
    const text = (body.body || "").trim().slice(0, 2000);
    if (!name || !text) return json({ error: "name and body required" }, { status: 400 });

    const result = await env.DB.prepare(
      "INSERT INTO comments (adventure_id, name, body) VALUES (?, ?, ?)"
    )
      .bind(adventure.id, name, text)
      .run();

    const comment = await env.DB.prepare("SELECT * FROM comments WHERE id = ?").bind(result.meta.last_row_id).first();
    return json({ comment }, { status: 201 });
  }

  // POST /api/adventures/:slug/reactions
  if (method === "POST" && parts.length === 3 && parts[0] === "adventures" && parts[2] === "reactions") {
    const adventure = await env.DB.prepare("SELECT id FROM adventures WHERE slug = ?").bind(parts[1]).first();
    if (!adventure) return json({ error: "not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const emoji = (body.emoji || "").trim();
    if (!emoji || [...emoji].length > 4) return json({ error: "invalid emoji" }, { status: 400 });

    await env.DB.prepare(
      `INSERT INTO reactions (adventure_id, emoji, count) VALUES (?, ?, 1)
       ON CONFLICT(adventure_id, emoji) DO UPDATE SET count = count + 1`
    )
      .bind(adventure.id, emoji)
      .run();

    const row = await env.DB.prepare("SELECT count FROM reactions WHERE adventure_id = ? AND emoji = ?")
      .bind(adventure.id, emoji)
      .first();

    return json({ emoji, count: row.count });
  }

  // PATCH /api/sections/:id  (admin)
  if (method === "PATCH" && parts.length === 2 && parts[0] === "sections") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    if (typeof body.body !== "string") return json({ error: "body required" }, { status: 400 });

    const column = { en: "body", lv: "body_lv", nl: "body_nl" }[body.lang] || "body";
    await env.DB.prepare(`UPDATE sections SET ${column} = ? WHERE id = ?`).bind(body.body, parts[1]).run();
    return json({ ok: true });
  }

  // POST /api/adventures/:slug/photos  (admin, multipart/form-data: file, section_type, caption)
  if (method === "POST" && parts.length === 3 && parts[0] === "adventures" && parts[2] === "photos") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const adventure = await env.DB.prepare("SELECT id FROM adventures WHERE slug = ?").bind(parts[1]).first();
    if (!adventure) return json({ error: "not found" }, { status: 404 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const sectionType = form?.get("section_type") || "cover";
    const caption = (form?.get("caption") || "").toString().slice(0, 200);

    if (!file || typeof file === "string") return json({ error: "file required" }, { status: 400 });
    if (!file.type?.startsWith("image/")) return json({ error: "only images are allowed" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return json({ error: "image too large (10MB max)" }, { status: 400 });

    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `${parts[1]}/${sectionType}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    await env.PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

    const result = await env.DB.prepare(
      "INSERT INTO photos (adventure_id, section_type, r2_key, caption) VALUES (?, ?, ?, ?)"
    )
      .bind(adventure.id, sectionType, key, caption)
      .run();

    if (sectionType === "cover") {
      await env.DB.prepare("UPDATE adventures SET cover_key = ? WHERE id = ?").bind(key, adventure.id).run();
    }

    // Translating takes a moment; don't hold up the upload response for it.
    if (caption.trim()) {
      ctx?.waitUntil(storeCaptionTranslations(env, result.meta.last_row_id, caption));
    }

    const photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?").bind(result.meta.last_row_id).first();
    return json({ photo }, { status: 201 });
  }

  // PATCH /api/photos/:id  (admin) — the caption, so a typo isn't permanent
  if (method === "PATCH" && parts.length === 2 && parts[0] === "photos") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    if (typeof body.caption !== "string") return json({ error: "caption required" }, { status: 400 });

    // Edits target the language being viewed, matching how section bodies and
    // summaries already work. Only the English one drives a re-translation.
    const column = { en: "caption", lv: "caption_lv", nl: "caption_nl" }[body.lang] || "caption";
    const text = body.caption.trim().slice(0, 200);

    await env.DB.prepare(`UPDATE photos SET ${column} = ? WHERE id = ?`).bind(text, parts[1]).run();
    if (column === "caption" && text) {
      ctx?.waitUntil(storeCaptionTranslations(env, parts[1], text));
    }
    return json({ ok: true });
  }

  // DELETE /api/photos/:id  (admin)
  if (method === "DELETE" && parts.length === 2 && parts[0] === "photos") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?").bind(parts[1]).first();
    if (!photo) return json({ error: "not found" }, { status: 404 });

    await env.PHOTOS.delete(photo.r2_key);
    await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(parts[1]).run();
    return json({ ok: true });
  }

  // ---- Bucket list ----

  // GET /api/bucketlist
  if (method === "GET" && parts.length === 1 && parts[0] === "bucketlist") {
    try {
      const { results } = await env.DB.prepare(
        "SELECT * FROM bucketlist ORDER BY sort_order ASC, created_at DESC"
      ).all();
      return json({ bucketlist: results });
    } catch {
      // Table arrives in migration 0005; report empty rather than failing
      // the whole home page before it has been run.
      return json({ bucketlist: [] });
    }
  }

  // POST /api/bucketlist  (admin)
  if (method === "POST" && parts.length === 1 && parts[0] === "bucketlist") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const destination = (body.destination || "").trim().slice(0, 120);
    // The name heads the card. Fall back to the destination so an entry that
    // only names a place still gets a heading rather than an empty one.
    const title = ((body.title || "").trim() || destination).slice(0, 120);
    if (!title) return json({ error: "name required" }, { status: 400 });

    const minOrder = await env.DB.prepare("SELECT MIN(sort_order) AS m FROM bucketlist").first();
    const result = await env.DB.prepare(
      "INSERT INTO bucketlist (title, destination, tempt, sort_order) VALUES (?, ?, ?, ?)"
    )
      .bind(title, destination, (body.tempt || "").slice(0, 600), (minOrder?.m ?? 0) - 1)
      .run();

    const item = await env.DB.prepare("SELECT * FROM bucketlist WHERE id = ?")
      .bind(result.meta.last_row_id)
      .first();
    return json({ item }, { status: 201 });
  }

  // PATCH /api/bucketlist/:id  (admin)
  if (method === "PATCH" && parts.length === 2 && parts[0] === "bucketlist") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    // Per-field caps: a name/destination is a label, the tempt is a few lines.
    const LIMITS = { title: 120, destination: 120, tempt: 600, tempt_lv: 600, tempt_nl: 600 };
    const updates = Object.keys(LIMITS).filter((f) => body[f] !== undefined);
    if (!updates.length) return json({ error: "nothing to update" }, { status: 400 });

    await env.DB.prepare(
      `UPDATE bucketlist SET ${updates.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`
    )
      .bind(...updates.map((f) => String(body[f]).slice(0, LIMITS[f])), parts[1])
      .run();

    return json({ ok: true });
  }

  // DELETE /api/bucketlist/:id  (admin)
  if (method === "DELETE" && parts.length === 2 && parts[0] === "bucketlist") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const item = await env.DB.prepare("SELECT * FROM bucketlist WHERE id = ?").bind(parts[1]).first();
    if (!item) return json({ error: "not found" }, { status: 404 });

    if (item.cover_key) await env.PHOTOS.delete(item.cover_key);
    await env.DB.prepare("DELETE FROM bucketlist WHERE id = ?").bind(parts[1]).run();
    return json({ ok: true });
  }

  // POST /api/bucketlist/reorder  (admin) — body: { ids: [...] } in display order
  if (method === "POST" && parts.length === 2 && parts[0] === "bucketlist" && parts[1] === "reorder") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : null;
    if (!ids || !ids.length) return json({ error: "ids array required" }, { status: 400 });
    if (ids.length > 500) return json({ error: "too many ids" }, { status: 400 });

    await env.DB.batch(
      ids.map((id, i) =>
        env.DB.prepare("UPDATE bucketlist SET sort_order = ? WHERE id = ?").bind(i, Number(id))
      )
    );
    return json({ ok: true });
  }

  // POST /api/bucketlist/:id/photo  (admin, multipart/form-data: file)
  if (method === "POST" && parts.length === 3 && parts[0] === "bucketlist" && parts[2] === "photo") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const item = await env.DB.prepare("SELECT * FROM bucketlist WHERE id = ?").bind(parts[1]).first();
    if (!item) return json({ error: "not found" }, { status: 404 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") return json({ error: "file required" }, { status: 400 });
    if (!file.type?.startsWith("image/")) return json({ error: "only images are allowed" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return json({ error: "image too large (10MB max)" }, { status: 400 });

    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `bucketlist/${parts[1]}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    await env.PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

    // Replacing a picture shouldn't leave the old object behind in R2.
    if (item.cover_key) await env.PHOTOS.delete(item.cover_key);
    await env.DB.prepare("UPDATE bucketlist SET cover_key = ? WHERE id = ?").bind(key, parts[1]).run();

    return json({ cover_key: key }, { status: 201 });
  }

  // ---- Strava ----

  // GET /api/strava/webhook — Strava's subscription handshake (public by design)
  if (method === "GET" && parts.length === 2 && parts[0] === "strava" && parts[1] === "webhook") {
    const expected = (env.STRAVA_VERIFY_TOKEN || "").trim();
    if (!expected || url.searchParams.get("hub.verify_token") !== expected) {
      return json({ error: "bad verify token" }, { status: 403 });
    }
    return json({ "hub.challenge": url.searchParams.get("hub.challenge") });
  }

  // POST /api/strava/webhook — an activity was created, updated or deleted.
  // Strava retries unless it gets a fast 200, so the import runs after the
  // response rather than inside it.
  if (method === "POST" && parts.length === 2 && parts[0] === "strava" && parts[1] === "webhook") {
    const event = await request.json().catch(() => ({}));
    if (event.object_type === "activity") {
      const auth = await stravaAuthRow(env);
      // Only act on the athlete we're actually connected to.
      if (auth?.athlete_id && Number(event.owner_id) === Number(auth.athlete_id)) {
        if (event.aspect_type === "delete") {
          ctx?.waitUntil(
            env.DB.prepare("DELETE FROM activities WHERE id = ?").bind(event.object_id).run()
          );
        } else {
          ctx?.waitUntil(importActivity(env, event.object_id).catch(() => {}));
        }
      }
    }
    return json({ ok: true });
  }

  // GET /api/strava/status  (admin)
  if (method === "GET" && parts.length === 2 && parts[0] === "strava" && parts[1] === "status") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const auth = await stravaAuthRow(env).catch(() => null);
    let count = 0;
    try {
      ({ count } = await env.DB.prepare("SELECT COUNT(*) AS count FROM activities").first());
    } catch {
      count = 0;
    }
    return json({
      configured: !!(env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET),
      connected: !!auth?.refresh_token,
      athlete: auth?.athlete_name || "",
      activities: count,
    });
  }

  // POST /api/strava/connect  (admin) — returns the URL to send the browser to.
  // A redirect can't carry the admin header, so the `state` value is what
  // proves the callback belongs to a connect we started.
  if (method === "POST" && parts.length === 2 && parts[0] === "strava" && parts[1] === "connect") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    if (!env.STRAVA_CLIENT_ID) return json({ error: "STRAVA_CLIENT_ID is not set" }, { status: 400 });

    const state = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO strava_auth (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state"
    )
      .bind(state)
      .run();

    const authorize = new URL("https://www.strava.com/oauth/authorize");
    authorize.searchParams.set("client_id", env.STRAVA_CLIENT_ID);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("redirect_uri", `${url.origin}/api/strava/callback`);
    authorize.searchParams.set("approval_prompt", "auto");
    authorize.searchParams.set("scope", STRAVA_SCOPE);
    authorize.searchParams.set("state", state);
    return json({ url: authorize.toString() });
  }

  // GET /api/strava/callback — Strava sends the browser back here
  if (method === "GET" && parts.length === 2 && parts[0] === "strava" && parts[1] === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const auth = await stravaAuthRow(env);

    if (!code || !state || !auth?.state || state !== auth.state) {
      return Response.redirect(`${url.origin}/?strava=failed`, 302);
    }

    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return Response.redirect(`${url.origin}/?strava=failed`, 302);

    const tok = await res.json();
    const name = `${tok.athlete?.firstname || ""} ${tok.athlete?.lastname || ""}`.trim();
    await env.DB.prepare(
      `UPDATE strava_auth SET athlete_id = ?, athlete_name = ?, access_token = ?,
         refresh_token = ?, expires_at = ?, scope = ?, state = '',
         updated_at = datetime('now') WHERE id = 1`
    )
      .bind(
        tok.athlete?.id ?? null,
        name,
        tok.access_token || "",
        tok.refresh_token || "",
        tok.expires_at || 0,
        url.searchParams.get("scope") || ""
      )
      .run();

    return Response.redirect(`${url.origin}/?strava=connected`, 302);
  }

  // POST /api/strava/disconnect  (admin) — drops the tokens, keeps the activities
  if (method === "POST" && parts.length === 2 && parts[0] === "strava" && parts[1] === "disconnect") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM strava_auth WHERE id = 1").run();
    return json({ ok: true });
  }

  // POST /api/strava/sync  (admin) — pull a page of recent activities.
  // Ten at a time: each one costs two Strava calls, and a Worker request has a
  // subrequest budget.
  if (method === "POST" && parts.length === 2 && parts[0] === "strava" && parts[1] === "sync") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const page = Math.max(1, Math.min(20, Number(body.page) || 1));

    const list = await stravaGet(env, "athlete/activities", { per_page: "10", page: String(page) });
    let imported = 0;
    const failed = [];
    for (const a of Array.isArray(list) ? list : []) {
      try {
        await importActivity(env, a.id);
        imported++;
      } catch (err) {
        failed.push({ id: a.id, error: String(err.message || err) });
      }
    }
    return json({ imported, failed, page, more: Array.isArray(list) && list.length === 10 });
  }

  // POST /api/strava/webhook/subscribe  (admin) — registers this site with Strava
  if (method === "POST" && parts.length === 3 && parts[0] === "strava" && parts[1] === "webhook" && parts[2] === "subscribe") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    if (!env.STRAVA_VERIFY_TOKEN) return json({ error: "STRAVA_VERIFY_TOKEN is not set" }, { status: 400 });

    const res = await fetch(`${STRAVA_API}/push_subscriptions`, {
      method: "POST",
      body: new URLSearchParams({
        client_id: env.STRAVA_CLIENT_ID || "",
        client_secret: env.STRAVA_CLIENT_SECRET || "",
        callback_url: `${url.origin}/api/strava/webhook`,
        verify_token: env.STRAVA_VERIFY_TOKEN,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return json({ ok: res.ok, detail: data }, { status: res.ok ? 200 : 400 });
  }

  // ---- Activities ----

  // GET /api/activities  (admin) — the picker for attaching one to an adventure
  if (method === "GET" && parts.length === 1 && parts[0] === "activities") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const { results } = await env.DB.prepare(
      `SELECT a.id, a.name, a.sport_type, a.start_date, a.distance_m, a.ascent_m,
              a.source, a.adventure_id, v.title AS adventure_title
       FROM activities a
       LEFT JOIN adventures v ON v.id = a.adventure_id
       ORDER BY a.start_date DESC LIMIT 50`
    ).all();
    return json({ activities: results });
  }

  // POST /api/adventures/:slug/activities  (admin) — attach
  if (method === "POST" && parts.length === 3 && parts[0] === "adventures" && parts[2] === "activities") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const adventure = await env.DB.prepare("SELECT id FROM adventures WHERE slug = ?").bind(parts[1]).first();
    if (!adventure) return json({ error: "not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const id = Number(body.activity_id);
    if (!id) return json({ error: "activity_id required" }, { status: 400 });

    await env.DB.prepare("UPDATE activities SET adventure_id = ? WHERE id = ?").bind(adventure.id, id).run();
    return json({ ok: true });
  }

  // POST /api/activities/import  (admin) — a GPX/TCX file, already parsed and
  // downsampled by the browser. Cloudflare caps CPU per request, and chewing
  // through tens of thousands of track points server-side would blow it.
  if (method === "POST" && parts.length === 2 && parts[0] === "activities" && parts[1] === "import") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const track = Array.isArray(body.track) ? body.track.slice(0, 2000) : [];
    if (!track.length) return json({ error: "no track points found in that file" }, { status: 400 });

    const numOrNull = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
    const num = (v) => Number(v) || 0;

    // Uploads count down from -1, keeping clear of Strava's positive ids.
    const low = await env.DB.prepare("SELECT MIN(id) AS m FROM activities WHERE id < 0").first();
    const id = Math.min(-1, (low?.m ?? 0) - 1);

    await env.DB.prepare(
      `INSERT INTO activities (id, source, name, sport_type, start_date, moving_time,
         elapsed_time, distance_m, ascent_m, elev_high, elev_low, average_speed,
         max_speed, average_heartrate, max_heartrate, track, synced_at)
       VALUES (?, 'upload', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        id,
        String(body.name || "Untitled activity").slice(0, 120),
        String(body.sport_type || "").slice(0, 40),
        String(body.start_date || "").slice(0, 40),
        Math.round(num(body.moving_time)),
        Math.round(num(body.elapsed_time)),
        num(body.distance_m),
        num(body.ascent_m),
        numOrNull(body.elev_high),
        numOrNull(body.elev_low),
        numOrNull(body.average_speed),
        numOrNull(body.max_speed),
        numOrNull(body.average_heartrate),
        numOrNull(body.max_heartrate),
        JSON.stringify(track)
      )
      .run();

    return json({ id, points: track.length }, { status: 201 });
  }

  // DELETE /api/activities/:id  (admin) — detaches by default; ?purge=1 also
  // removes the activity, for an upload that shouldn't have happened.
  if (method === "DELETE" && parts.length === 2 && parts[0] === "activities") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    if (url.searchParams.get("purge") === "1") {
      await env.DB.prepare("DELETE FROM activities WHERE id = ?").bind(parts[1]).run();
      return json({ ok: true, purged: true });
    }
    await env.DB.prepare("UPDATE activities SET adventure_id = NULL WHERE id = ?").bind(parts[1]).run();
    return json({ ok: true });
  }

  // ---- Editable site wording ----

  // GET /api/site-text — public: the app needs it to render
  if (method === "GET" && parts.length === 1 && parts[0] === "site-text") {
    const text = { en: {}, lv: {}, nl: {} };
    try {
      const { results } = await env.DB.prepare("SELECT key, lang, value FROM site_text").all();
      for (const row of results) {
        if (text[row.lang]) text[row.lang][row.key] = row.value;
      }
    } catch {
      // Table arrives in migration 0009; no overrides is a valid answer.
    }
    return json({ text });
  }

  // PUT /api/site-text  (admin) — { lang, values: { key: value } }.
  // An empty value removes the override, restoring the built-in wording.
  if (method === "PUT" && parts.length === 1 && parts[0] === "site-text") {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const lang = ["en", "lv", "nl"].includes(body.lang) ? body.lang : null;
    if (!lang) return json({ error: "lang must be en, lv or nl" }, { status: 400 });
    if (!body.values || typeof body.values !== "object") {
      return json({ error: "values required" }, { status: 400 });
    }

    const entries = Object.entries(body.values).slice(0, 400);
    if (!entries.length) return json({ ok: true, changed: 0 });

    await env.DB.batch(
      entries.map(([key, value]) => {
        const text = String(value ?? "").slice(0, 600);
        return text
          ? env.DB.prepare(
              `INSERT INTO site_text (key, lang, value, updated_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(key, lang) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
            ).bind(String(key).slice(0, 80), lang, text)
          : env.DB.prepare("DELETE FROM site_text WHERE key = ? AND lang = ?").bind(String(key).slice(0, 80), lang);
      })
    );

    return json({ ok: true, changed: entries.length });
  }

  // POST /api/admin/verify
  if (method === "POST" && parts.length === 2 && parts[0] === "admin" && parts[1] === "verify") {
    // `configured` distinguishes "no ADMIN_KEY secret bound to this Worker"
    // from "passcode didn't match" — otherwise both look identical.
    return json({ ok: isAdmin(request, env), configured: !!(env.ADMIN_KEY || "").trim() });
  }

  return json({ error: "not found" }, { status: 404 });
}

async function handlePhoto(env, key) {
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response("not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url, ctx);
      } catch (err) {
        return json({ error: "server error", message: String(err) }, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/photos/")) {
      return handlePhoto(env, decodeURIComponent(url.pathname.slice("/photos/".length)));
    }

    return env.ASSETS.fetch(request);
  },
};
