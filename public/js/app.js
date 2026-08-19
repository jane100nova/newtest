// Zane's Adventures — tiny vanilla-JS SPA. No framework, no build step.

const $app = document.getElementById("app");
const $adminToggle = document.getElementById("admin-toggle");
const ADMIN_KEY_STORAGE = "wa_admin_key";
const REACTION_EMOJIS = ["🔥", "😍", "🥾", "🎉"];
const SECTION_META = {
  prepare: { emoji: "🎒" },
  plan: { emoji: "🗺️" },
  experience: { emoji: "🌄" },
  reflect: { emoji: "💭" },
};

// ---------- small utils ----------

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function relativeTime(iso) {
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

function isAdmin() {
  return !!getAdminKey();
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (isAdmin()) headers["x-admin-key"] = getAdminKey();
  if (options.body && !(options.body instanceof FormData)) {
    headers["content-type"] = "application/json";
  }
  const res = await fetch(`/api/${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

function reactedKey(slug, emoji) {
  return `wa_reacted_${slug}_${emoji}`;
}

// ---------- routing ----------

function navigate(path) {
  history.pushState({}, "", path);
  render();
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a) return;
  e.preventDefault();
  navigate(a.getAttribute("href"));
});

window.addEventListener("popstate", render);

async function render() {
  const path = location.pathname;
  updateAdminToggle();

  if (path === "/" || path === "") return renderHome();

  const adventureMatch = path.match(/^\/adventure\/([^/]+)\/?$/);
  if (adventureMatch) return renderAdventure(adventureMatch[1]);

  $app.innerHTML = `<div class="empty-state"><h2>Not found</h2><p>That page doesn't exist.</p><a class="btn" href="/" data-link>Go home</a></div>`;
}

function updateAdminToggle() {
  $adminToggle.classList.toggle("active", isAdmin());
}

// ---------- admin login ----------

$adminToggle.addEventListener("click", async () => {
  if (isAdmin()) {
    if (confirm("Log out of admin mode?")) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      toast("Logged out");
      updateAdminToggle();
      render();
    }
    return;
  }

  const key = prompt("Enter admin passcode:");
  if (!key) return;
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
  try {
    const { ok } = await api("admin/verify", { method: "POST" });
    if (!ok) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      toast("Wrong passcode");
      return;
    }
    toast("Admin mode on");
    updateAdminToggle();
    render();
  } catch {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    toast("Couldn't verify — try again");
  }
});

// ---------- home / feed ----------

async function renderHome() {
  $app.innerHTML = `<p class="empty-state">Loading adventures…</p>`;
  let adventures = [];
  try {
    ({ adventures } = await api("adventures"));
  } catch {
    $app.innerHTML = `<p class="empty-state">Couldn't load adventures. Pull to refresh?</p>`;
    return;
  }

  const cards = adventures.length
    ? adventures.map(adventureCardHtml).join("")
    : `<div class="empty-state"><h2>No adventures yet</h2><p>Tap the + button to add your first one.</p></div>`;

  $app.innerHTML = `
    <h1 class="page-title">🏔️ Zane's Adventures</h1>
    <p class="page-subtitle">How I prepare, the plan, how I experience it, and how I feel afterwards.</p>
    ${cards}
  `;

  if (isAdmin()) {
    const fab = document.createElement("button");
    fab.className = "fab";
    fab.textContent = "+";
    fab.title = "New adventure";
    fab.addEventListener("click", openNewAdventureModal);
    document.body.appendChild(fab);
    $app.dataset.hasFab = "1";
  }
}

function adventureCardHtml(a) {
  const cover = a.cover_key
    ? `<img src="/photos/${encodeURIComponent(a.cover_key)}" alt="" loading="lazy" />`
    : "";
  return `
    <a class="adventure-card" href="/adventure/${a.slug}" data-link>
      <div class="adventure-card-cover">
        <span class="status-badge ${a.status === "completed" ? "completed" : ""}">${a.status === "completed" ? "Completed" : "Upcoming"}</span>
        ${cover}
      </div>
      <div class="adventure-card-body">
        <h2>${escapeHtml(a.title)}</h2>
        <div class="adventure-meta">${escapeHtml(a.destination || "")}${a.date_label ? " · " + escapeHtml(a.date_label) : ""}</div>
        <p>${escapeHtml(a.summary || "")}</p>
      </div>
    </a>
  `;
}

function openNewAdventureModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>New adventure</h2>
      <form id="new-adventure-form">
        <div class="field"><label>Title</label><input name="title" required placeholder="e.g. Andorra" /></div>
        <div class="field"><label>Destination</label><input name="destination" placeholder="e.g. Andorra" /></div>
        <div class="field"><label>When</label><input name="date_label" placeholder="e.g. September 2026" /></div>
        <div class="field"><label>Status</label>
          <select name="status"><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select>
        </div>
        <div class="field"><label>Summary</label><textarea name="summary" placeholder="One or two sentences"></textarea></div>
        <div class="field"><label>Source link (optional)</label><input name="source_url" placeholder="https://…" /></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline btn-block" id="cancel-modal">Cancel</button>
          <button type="submit" class="btn btn-block">Create</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#cancel-modal").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#new-adventure-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    try {
      const { slug } = await api("adventures", { method: "POST", body: JSON.stringify(payload) });
      overlay.remove();
      document.querySelectorAll(".fab").forEach((f) => f.remove());
      navigate(`/adventure/${slug}`);
    } catch (err) {
      toast(err.message);
    }
  });
}

// ---------- adventure detail ----------

async function renderAdventure(slug) {
  document.querySelectorAll(".fab").forEach((f) => f.remove());
  $app.innerHTML = `<p class="empty-state">Loading…</p>`;

  let adventure;
  try {
    ({ adventure } = await api(`adventures/${slug}`));
  } catch {
    $app.innerHTML = `<div class="empty-state"><h2>Not found</h2><a class="btn" href="/" data-link>Go home</a></div>`;
    return;
  }

  const admin = isAdmin();
  const cover = adventure.cover_key
    ? `<img src="/photos/${encodeURIComponent(adventure.cover_key)}" alt="" />`
    : "";

  $app.innerHTML = `
    <a class="back-link" href="/" data-link>← All adventures</a>
    <div class="detail-cover">${cover}</div>
    <div class="detail-header">
      <h1>${escapeHtml(adventure.title)}</h1>
      <div class="detail-meta">${escapeHtml(adventure.destination || "")}${adventure.date_label ? " · " + escapeHtml(adventure.date_label) : ""} · ${adventure.status === "completed" ? "Completed" : "Upcoming"}</div>
      ${adventure.summary ? `<p class="detail-summary">${escapeHtml(adventure.summary)}</p>` : ""}
      ${adventure.source_url ? `<a class="source-link" href="${escapeHtml(adventure.source_url)}" target="_blank" rel="noopener">View original plan ↗</a>` : ""}
    </div>

    <div class="action-row">
      <div class="reactions" id="reactions"></div>
      <button class="btn btn-outline btn-small" id="share-btn">📤 Share</button>
    </div>

    <div id="sections"></div>

    <div class="comments">
      <h3>💬 Comments</h3>
      <form class="comment-form" id="comment-form">
        <input name="name" placeholder="Your name" required maxlength="60" />
        <textarea name="body" placeholder="Say something…" required maxlength="2000"></textarea>
        <button type="submit" class="btn btn-block">Post comment</button>
      </form>
      <div id="comment-list"></div>
    </div>
  `;

  renderReactions(adventure);
  renderSections(adventure, admin);
  renderComments(adventure.comments);

  document.getElementById("share-btn").addEventListener("click", () => shareAdventure(adventure));
  document.getElementById("comment-form").addEventListener("submit", (e) => submitComment(e, adventure.slug));
}

function renderReactions(adventure) {
  const el = document.getElementById("reactions");
  el.innerHTML = REACTION_EMOJIS.map((emoji) => {
    const count = adventure.reactions[emoji] || 0;
    const reacted = !!localStorage.getItem(reactedKey(adventure.slug, emoji));
    return `<button class="reaction-btn ${reacted ? "reacted" : ""}" data-emoji="${emoji}">
      <span>${emoji}</span><span class="reaction-count">${count}</span>
    </button>`;
  }).join("");

  el.querySelectorAll(".reaction-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const emoji = btn.dataset.emoji;
      const key = reactedKey(adventure.slug, emoji);
      if (localStorage.getItem(key)) return; // already reacted this session/device
      try {
        const { count } = await api(`adventures/${adventure.slug}/reactions`, {
          method: "POST",
          body: JSON.stringify({ emoji }),
        });
        localStorage.setItem(key, "1");
        btn.classList.add("reacted");
        btn.querySelector(".reaction-count").textContent = count;
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

function renderSections(adventure, admin) {
  const el = document.getElementById("sections");
  el.innerHTML = adventure.sections.map((s) => sectionHtml(s, admin)).join("");

  adventure.sections.forEach((s) => wireSection(adventure.slug, s, admin));
}

function sectionHtml(s, admin) {
  const meta = SECTION_META[s.type] || { emoji: "📍" };
  const bodyHtml = s.body
    ? `<div class="section-body" data-view>${escapeHtml(s.body)}</div>`
    : `<div class="section-body empty" data-view>${admin ? "Nothing here yet — tap Edit to add your notes." : "Nothing here yet."}</div>`;

  const photos = s.photos.map((p) => `<img src="/photos/${encodeURIComponent(p.r2_key)}" alt="${escapeHtml(p.caption || "")}" loading="lazy" />`).join("");
  const addTile = admin ? `<div class="photo-add-tile" data-add-photo="${s.type}">＋</div>` : "";

  return `
    <div class="section-card" data-section="${s.type}" data-section-id="${s.id}">
      <div class="section-card-head">
        <h3>${meta.emoji} ${escapeHtml(s.title)}</h3>
        ${admin ? `<button class="edit-btn" data-edit>✏️ Edit</button>` : ""}
      </div>
      ${bodyHtml}
      ${(s.photos.length || admin) ? `<div class="photo-strip">${photos}${addTile}</div>` : ""}
    </div>
  `;
}

function wireSection(slug, section, admin) {
  const card = document.querySelector(`[data-section-id="${section.id}"]`);
  if (!card) return;

  if (admin) {
    card.querySelector("[data-edit]")?.addEventListener("click", () => {
      const viewEl = card.querySelector("[data-view]");
      const textarea = document.createElement("textarea");
      textarea.value = section.body;
      viewEl.replaceWith(textarea);
      const editBtn = card.querySelector("[data-edit]");
      editBtn.textContent = "💾 Save";
      editBtn.onclick = async () => {
        try {
          await api(`sections/${section.id}`, { method: "PATCH", body: JSON.stringify({ body: textarea.value }) });
          section.body = textarea.value;
          toast("Saved");
          renderAdventure(slug);
        } catch (err) {
          toast(err.message);
        }
      };
    });

    card.querySelector("[data-add-photo]")?.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        const caption = prompt("Caption (optional):") || "";
        const fd = new FormData();
        fd.append("file", file);
        fd.append("section_type", section.type);
        fd.append("caption", caption);
        try {
          await api(`adventures/${slug}/photos`, { method: "POST", body: fd });
          toast("Photo uploaded");
          renderAdventure(slug);
        } catch (err) {
          toast(err.message);
        }
      });
      input.click();
    });
  }
}

function renderComments(comments) {
  const el = document.getElementById("comment-list");
  if (!comments.length) {
    el.innerHTML = `<p class="empty-state">No comments yet — be the first.</p>`;
    return;
  }
  el.innerHTML = comments.map((c) => `
    <div class="comment">
      <div class="comment-head"><span class="comment-name">${escapeHtml(c.name)}</span><span>${relativeTime(c.created_at)}</span></div>
      <p class="comment-body">${escapeHtml(c.body)}</p>
    </div>
  `).join("");
}

async function submitComment(e, slug) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const payload = { name: fd.get("name"), body: fd.get("body") };
  try {
    await api(`adventures/${slug}/comments`, { method: "POST", body: JSON.stringify(payload) });
    form.reset();
    renderAdventure(slug);
  } catch (err) {
    toast(err.message);
  }
}

async function shareAdventure(adventure) {
  const url = `${location.origin}/adventure/${adventure.slug}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: adventure.title, text: adventure.summary || "", url });
    } catch {
      /* user cancelled */
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied!");
  } catch {
    prompt("Copy this link:", url);
  }
}

render();
