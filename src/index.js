// Wayfarer worker: serves the static app and a small JSON API backed by
// D1 (adventures/sections/comments/reactions) and R2 (photos).

const SECTION_DEFAULTS = [
  { type: "prepare", title: "How I Prepare", sort_order: 1 },
  { type: "plan", title: "The Plan", sort_order: 2 },
  { type: "experience", title: "How I Experience It", sort_order: 3 },
  { type: "reflect", title: "How I Feel Afterwards", sort_order: 4 },
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key");
  return !!env.ADMIN_KEY && !!key && key === env.ADMIN_KEY;
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

async function getAdventureBySlug(env, slug) {
  const adventure = await env.DB.prepare("SELECT * FROM adventures WHERE slug = ?").bind(slug).first();
  if (!adventure) return null;

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
  };
}

async function handleApi(request, env, url) {
  const parts = url.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const method = request.method;

  // GET /api/adventures
  if (method === "GET" && parts.length === 1 && parts[0] === "adventures") {
    const { results } = await env.DB.prepare(
      "SELECT id, slug, title, destination, date_label, status, summary, cover_key, created_at FROM adventures ORDER BY created_at DESC"
    ).all();
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

    const result = await env.DB.prepare(
      `INSERT INTO adventures (slug, title, destination, date_label, status, summary, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        slug,
        body.title,
        body.destination || "",
        body.date_label || "",
        body.status === "completed" ? "completed" : "upcoming",
        body.summary || "",
        body.source_url || ""
      )
      .run();

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
    const fields = ["title", "destination", "date_label", "status", "summary", "summary_lv", "summary_nl", "source_url"];
    const updates = fields.filter((f) => body[f] !== undefined);
    if (updates.length === 0) return json({ error: "nothing to update" }, { status: 400 });

    await env.DB.prepare(
      `UPDATE adventures SET ${updates.map((f) => `${f} = ?`).join(", ")} WHERE slug = ?`
    )
      .bind(...updates.map((f) => body[f]), parts[1])
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

    const photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?").bind(result.meta.last_row_id).first();
    return json({ photo }, { status: 201 });
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

  // POST /api/admin/verify
  if (method === "POST" && parts.length === 2 && parts[0] === "admin" && parts[1] === "verify") {
    return json({ ok: isAdmin(request, env) });
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
        return await handleApi(request, env, url);
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
