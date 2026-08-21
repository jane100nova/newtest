// Zane's Adventures — tiny vanilla-JS SPA. No framework, no build step.

const $app = document.getElementById("app");
const $adminToggle = document.getElementById("admin-toggle");
const $langSwitch = document.getElementById("lang-switch");
const ADMIN_KEY_STORAGE = "wa_admin_key";
const LANG_STORAGE = "wa_lang";
const REACTION_EMOJIS = ["🔥", "😍", "🥾", "🎉"];
const SECTION_META = {
  prepare: { icon: "backpack" },
  plan: { icon: "map" },
  experience: { icon: "sunrise" },
};

// ---------- icons ----------
// Inline stroke icons (24x24, currentColor) so they inherit text colour and
// stay crisp at any size — no icon font, no external requests.
const ICONS = {
  mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  backpack: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M10 6V4.5a2 2 0 0 1 4 0V6"/><path d="M8 14h8"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
  sunrise: '<path d="M12 2v6"/><path d="m5.6 10.6 1.4 1.4"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m18.4 10.6-1.4 1.4"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" x2="15.4" y1="13.5" y2="17.5"/><line x1="15.4" x2="8.6" y1="6.5" y2="10.5"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  externalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
};

function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

// ---------- translations ----------

const STRINGS = {
  en: {
    upcoming: "Upcoming", completed: "Completed",
    upcomingAdventures: "Upcoming adventures", pastAdventures: "Past adventures",
    loadingAdventures: "Loading adventures…",
    couldntLoad: "Couldn't load adventures. Pull to refresh?",
    noAdventuresTitle: "No adventures yet",
    noAdventuresBody: "Tap the + button to add your first one.",
    allAdventures: "All adventures",
    notFoundTitle: "Not found", notFoundBody: "That page doesn't exist.", goHome: "Go home",
    loading: "Loading…",
    share: "Share",
    comments: "Comments",
    namePlaceholder: "Your name",
    commentPlaceholder: "Say something…",
    postComment: "Post comment",
    noComments: "No comments yet — be the first.",
    bucketList: "Bucket list",
    bucketListIntro: "Places I haven't planned yet — but keep coming back to.",
    bucketEmpty: "Nothing on the list yet.",
    addPlace: "Add a place", editPlace: "Edit place",
    fieldName: "Name", placeNamePlaceholder: "e.g. Trek to Everest Base Camp",
    placeDestPlaceholder: "e.g. Nepal",
    fieldTempt: "Why I want to go", temptHint: "Three short lines works best.",
    temptPlaceholder: "Why this place keeps pulling at you…",
    deletePlaceConfirm: "Remove this place from the bucket list?",
    deleted: "Removed", delete: "Delete", addPhoto: "Add photo",
    newAdventure: "New adventure", editAdventure: "Edit adventure",
    saveChanges: "Save changes", orderSaved: "Order saved", dragHint: "Drag the handle to reorder",
    fieldTitle: "Title", fieldDestination: "Destination", fieldWhen: "When",
    fieldStatus: "Status", fieldSummary: "Summary", fieldSource: "Source link (optional)",
    titlePlaceholder: "e.g. Andorra", whenPlaceholder: "e.g. September 2026",
    summaryPlaceholder: "One or two sentences", sourcePlaceholder: "https://…",
    cancel: "Cancel", create: "Create",
    edit: "Edit", save: "Save",
    editHint: "Tip: \"## \" for a header, \"-> \" for a bullet, blank line for a new paragraph, **bold** to highlight.",
    nothingHereAdmin: "Nothing here yet — tap Edit to add your notes.",
    nothingHerePublic: "Nothing here yet.",
    viewOriginalPlan: "View original plan",
    enterPasscode: "Enter admin passcode:",
    logoutConfirm: "Log out of admin mode?",
    noPasscodeSet: "No passcode is set on the server yet.",
    wrongPasscode: "Wrong passcode", adminOn: "Admin mode on", loggedOut: "Logged out",
    couldntVerify: "Couldn't verify — try again",
    captionPrompt: "Caption (optional):",
    savedToast: "Saved", photoUploaded: "Photo uploaded", uploading: "Uploading…",
    addCover: "Add cover photo", changeCover: "Change cover",
    linkCopied: "Link copied!", copyLinkPrompt: "Copy this link:",
    sectionTitles: { prepare: "Preparation", plan: "Plan", experience: "Live updates" },
  },
  lv: {
    upcoming: "Gaidāms", completed: "Pabeigts",
    upcomingAdventures: "Gaidāmie piedzīvojumi", pastAdventures: "Aizvadītie piedzīvojumi",
    loadingAdventures: "Ielādē piedzīvojumus…",
    couldntLoad: "Neizdevās ielādēt. Pamēģini atsvaidzināt?",
    noAdventuresTitle: "Vēl nav neviena piedzīvojuma",
    noAdventuresBody: "Pieskaries + pogai, lai pievienotu pirmo.",
    allAdventures: "Visi piedzīvojumi",
    notFoundTitle: "Nav atrasts", notFoundBody: "Šāda lapa neeksistē.", goHome: "Uz sākumu",
    loading: "Ielādē…",
    share: "Dalīties",
    comments: "Komentāri",
    namePlaceholder: "Tavs vārds",
    commentPlaceholder: "Uzraksti kaut ko…",
    postComment: "Publicēt komentāru",
    noComments: "Vēl nav komentāru — esi pirmais.",
    bucketList: "Sapņu saraksts",
    bucketListIntro: "Vietas, ko vēl neesmu ieplānojis — bet pie kurām domās atgriežos.",
    bucketEmpty: "Sarakstā vēl nekā nav.",
    addPlace: "Pievienot vietu", editPlace: "Rediģēt vietu",
    fieldName: "Nosaukums", placeNamePlaceholder: "piem., Pārgājiens uz Everesta bāzes nometni",
    placeDestPlaceholder: "piem., Nepāla",
    fieldTempt: "Kāpēc gribu turp doties", temptHint: "Vislabāk der trīs īsas rindas.",
    temptPlaceholder: "Kāpēc šī vieta tevi sauc…",
    deletePlaceConfirm: "Noņemt šo vietu no saraksta?",
    deleted: "Noņemts", delete: "Dzēst", addPhoto: "Pievienot foto",
    newAdventure: "Jauns piedzīvojums", editAdventure: "Rediģēt piedzīvojumu",
    saveChanges: "Saglabāt izmaiņas", orderSaved: "Secība saglabāta", dragHint: "Velc rokturi, lai mainītu secību",
    fieldTitle: "Nosaukums", fieldDestination: "Galamērķis", fieldWhen: "Kad",
    fieldStatus: "Statuss", fieldSummary: "Kopsavilkums", fieldSource: "Avota saite (nav obligāta)",
    titlePlaceholder: "piem., Andora", whenPlaceholder: "piem., 2026. gada septembris",
    summaryPlaceholder: "Viens vai divi teikumi", sourcePlaceholder: "https://…",
    cancel: "Atcelt", create: "Izveidot",
    edit: "Rediģēt", save: "Saglabāt",
    editHint: "Padoms: \"## \" virsrakstam, \"-> \" sarakstam, tukša rinda jaunai rindkopai, **bold** izcēlumam.",
    nothingHereAdmin: "Šeit vēl nekā nav — pieskaries Rediģēt, lai pievienotu piezīmes.",
    nothingHerePublic: "Šeit vēl nekā nav.",
    viewOriginalPlan: "Skatīt oriģinālo plānu",
    enterPasscode: "Ievadi administratora paroli:",
    logoutConfirm: "Iziet no administratora režīma?",
    noPasscodeSet: "Serverī vēl nav iestatīta parole.",
    wrongPasscode: "Nepareiza parole", adminOn: "Administratora režīms ieslēgts", loggedOut: "Izgājis",
    couldntVerify: "Neizdevās pārbaudīt — mēģini vēlreiz",
    captionPrompt: "Paraksts (nav obligāts):",
    savedToast: "Saglabāts", photoUploaded: "Foto augšupielādēts", uploading: "Augšupielādē…",
    addCover: "Pievienot vāka foto", changeCover: "Mainīt vāka foto",
    linkCopied: "Saite nokopēta!", copyLinkPrompt: "Nokopē šo saiti:",
    sectionTitles: { prepare: "Sagatavošanās", plan: "Plāns", experience: "Jaunumi" },
  },
  nl: {
    upcoming: "Aankomend", completed: "Voltooid",
    upcomingAdventures: "Aankomende avonturen", pastAdventures: "Afgelopen avonturen",
    loadingAdventures: "Avonturen laden…",
    couldntLoad: "Laden mislukt. Probeer te vernieuwen?",
    noAdventuresTitle: "Nog geen avonturen",
    noAdventuresBody: "Tik op de + knop om je eerste avontuur toe te voegen.",
    allAdventures: "Alle avonturen",
    notFoundTitle: "Niet gevonden", notFoundBody: "Deze pagina bestaat niet.", goHome: "Naar home",
    loading: "Laden…",
    share: "Delen",
    comments: "Reacties",
    namePlaceholder: "Jouw naam",
    commentPlaceholder: "Schrijf iets…",
    postComment: "Reactie plaatsen",
    noComments: "Nog geen reacties — wees de eerste.",
    bucketList: "Verlanglijst",
    bucketListIntro: "Plekken die ik nog niet gepland heb — maar waar ik steeds aan denk.",
    bucketEmpty: "Nog niets op de lijst.",
    addPlace: "Plek toevoegen", editPlace: "Plek bewerken",
    fieldName: "Naam", placeNamePlaceholder: "bijv. Trektocht naar Everest Base Camp",
    placeDestPlaceholder: "bijv. Nepal",
    fieldTempt: "Waarom ik erheen wil", temptHint: "Drie korte regels werkt het best.",
    temptPlaceholder: "Waarom deze plek blijft trekken…",
    deletePlaceConfirm: "Deze plek van de lijst verwijderen?",
    deleted: "Verwijderd", delete: "Verwijderen", addPhoto: "Foto toevoegen",
    newAdventure: "Nieuw avontuur", editAdventure: "Avontuur bewerken",
    saveChanges: "Wijzigingen opslaan", orderSaved: "Volgorde opgeslagen", dragHint: "Sleep de greep om te herordenen",
    fieldTitle: "Titel", fieldDestination: "Bestemming", fieldWhen: "Wanneer",
    fieldStatus: "Status", fieldSummary: "Samenvatting", fieldSource: "Bronlink (optioneel)",
    titlePlaceholder: "bijv. Andorra", whenPlaceholder: "bijv. september 2026",
    summaryPlaceholder: "Een of twee zinnen", sourcePlaceholder: "https://…",
    cancel: "Annuleren", create: "Aanmaken",
    edit: "Bewerken", save: "Opslaan",
    editHint: "Tip: \"## \" voor een kop, \"-> \" voor een opsomming, lege regel voor een nieuwe alinea, **bold** om te markeren.",
    nothingHereAdmin: "Hier staat nog niets — tik op Bewerken om iets toe te voegen.",
    nothingHerePublic: "Hier staat nog niets.",
    viewOriginalPlan: "Bekijk het originele plan",
    enterPasscode: "Voer de beheerderscode in:",
    logoutConfirm: "Beheerdersmodus verlaten?",
    noPasscodeSet: "Er is nog geen code ingesteld op de server.",
    wrongPasscode: "Onjuiste code", adminOn: "Beheerdersmodus aan", loggedOut: "Uitgelogd",
    couldntVerify: "Kon niet verifiëren — probeer opnieuw",
    captionPrompt: "Bijschrift (optioneel):",
    savedToast: "Opgeslagen", photoUploaded: "Foto geüpload", uploading: "Uploaden…",
    addCover: "Omslagfoto toevoegen", changeCover: "Omslagfoto wijzigen",
    linkCopied: "Link gekopieerd!", copyLinkPrompt: "Kopieer deze link:",
    sectionTitles: { prepare: "Voorbereiding", plan: "Plan", experience: "Live updates" },
  },
};

let lang = localStorage.getItem(LANG_STORAGE) || "en";
if (!STRINGS[lang]) lang = "en";
function t(key) {
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}

function setLang(next) {
  if (!STRINGS[next] || next === lang) return;
  lang = next;
  localStorage.setItem(LANG_STORAGE, lang);
  updateLangSwitch();
  render();
}

function updateLangSwitch() {
  $langSwitch.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

$langSwitch.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-lang]");
  if (btn) setLang(btn.dataset.lang);
});

// Field name for a given language, with fallback to English when the
// translation hasn't been filled in yet.
function localized(obj, base) {
  const key = lang === "en" ? base : `${base}_${lang}`;
  const value = obj[key];
  return value && String(value).trim() ? value : obj[base];
}

// ---------- small utils ----------

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function inlineMd(raw) {
  const escaped = escapeHtml(raw);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Small, safe subset of markdown for section bodies:
// "## " headers, "-> " / "- " bullets, blank-line paragraphs, **bold** highlights.
function mdToHtml(raw) {
  const lines = String(raw ?? "").split("\n");
  let html = "";
  let listBuffer = [];
  let paraBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      html += "<ul>" + listBuffer.map((li) => `<li>${inlineMd(li)}</li>`).join("") + "</ul>";
      listBuffer = [];
    }
  };
  const flushPara = () => {
    if (paraBuffer.length) {
      html += `<p>${inlineMd(paraBuffer.join(" "))}</p>`;
      paraBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flushList(); flushPara();
      html += `<h4>${inlineMd(line.slice(3))}</h4>`;
    } else if (line.startsWith("-> ")) {
      flushPara();
      listBuffer.push(line.slice(3));
    } else if (line.startsWith("- ")) {
      flushPara();
      listBuffer.push(line.slice(2));
    } else if (line === "") {
      flushList(); flushPara();
    } else {
      flushList();
      paraBuffer.push(line);
    }
  }
  flushList();
  flushPara();
  return html;
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
  updateLangSwitch();

  if (path === "/" || path === "") return renderHome();

  const adventureMatch = path.match(/^\/adventure\/([^/]+)\/?$/);
  if (adventureMatch) return renderAdventure(adventureMatch[1]);

  $app.innerHTML = `<div class="empty-state"><h2>${t("notFoundTitle")}</h2><p>${t("notFoundBody")}</p><a class="btn" href="/" data-link>${t("goHome")}</a></div>`;
}

function updateAdminToggle() {
  $adminToggle.classList.toggle("active", isAdmin());
}

// ---------- admin login ----------

$adminToggle.addEventListener("click", async () => {
  if (isAdmin()) {
    if (confirm(t("logoutConfirm"))) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      toast(t("loggedOut"));
      updateAdminToggle();
      render();
    }
    return;
  }

  const key = prompt(t("enterPasscode"));
  if (!key || !key.trim()) return;
  localStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
  try {
    const { ok, configured } = await api("admin/verify", { method: "POST" });
    if (!ok) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      toast(configured === false ? t("noPasscodeSet") : t("wrongPasscode"));
      return;
    }
    toast(t("adminOn"));
    updateAdminToggle();
    render();
  } catch {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    toast(t("couldntVerify"));
  }
});

// ---------- home / feed ----------

async function renderHome() {
  // Bucket-list actions re-render the home view, so clear any existing FAB
  // first — otherwise a new one is appended on every refresh.
  document.querySelectorAll(".fab").forEach((f) => f.remove());
  $app.innerHTML = `<p class="empty-state">${t("loadingAdventures")}</p>`;
  let adventures = [];
  try {
    ({ adventures } = await api("adventures"));
  } catch {
    $app.innerHTML = `<p class="empty-state">${t("couldntLoad")}</p>`;
    return;
  }

  const admin = isAdmin();
  let bucketlist = [];
  try {
    ({ bucketlist } = await api("bucketlist"));
  } catch {
    bucketlist = [];
  }

  // The feed is split by status: what's still ahead, then what's already been
  // lived. A group with nothing in it is left out rather than shown empty.
  const upcoming = adventures.filter((a) => a.status !== "completed");
  const past = adventures.filter((a) => a.status === "completed");

  const cards = adventures.length
    ? `<div id="feed">${feedGroupHtml("upcoming", upcoming, admin)}${feedGroupHtml("past", past, admin)}</div>`
    : `<div class="empty-state"><h2>${t("noAdventuresTitle")}</h2><p>${t("noAdventuresBody")}</p></div>`;

  $app.innerHTML = `
    <h1 class="page-title">Zane&rsquo;s Adventures</h1>
    ${admin && adventures.length > 1 ? `<p class="drag-hint">${icon("grip", 14)}<span>${t("dragHint")}</span></p>` : ""}
    ${cards}
    ${bucketListHtml(bucketlist, admin)}
  `;

  wireBucketList(bucketlist, admin);

  if (admin) {
    // Each group drags on its own, but the order saved is global (see
    // enableDragReorder) so the two groups can't fight over sort_order.
    document.querySelectorAll("[data-feed-list]").forEach((list) => enableDragReorder(list));

    const fab = document.createElement("button");
    fab.className = "fab";
    fab.innerHTML = icon("plus", 24);
    fab.title = t("newAdventure");
    fab.addEventListener("click", () => openAdventureModal());
    document.body.appendChild(fab);
  }
}

// One titled block of the feed. `kind` is "upcoming" or "past".
function feedGroupHtml(kind, items, admin) {
  if (!items.length) return "";
  const past = kind === "past";
  return `
    <section class="feed-group${past ? " past" : ""}">
      <div class="feed-group-head">
        <h2>${icon(past ? "flag" : "calendar", 18)}<span>${past ? t("pastAdventures") : t("upcomingAdventures")}</span></h2>
        <span class="feed-count">${items.length}</span>
      </div>
      <div class="adventure-list" data-feed-list>${items.map((a) => adventureCardHtml(a, admin)).join("")}</div>
    </section>
  `;
}

function bucketListHtml(items, admin) {
  const cards = items.length
    ? items.map((it) => bucketCardHtml(it, admin)).join("")
    : `<p class="bucket-empty">${t("bucketEmpty")}</p>`;

  return `
    <section class="bucket-section">
      <div class="bucket-head">
        <h2>${icon("compass", 20)}<span>${t("bucketList")}</span></h2>
        ${admin ? `<button class="btn btn-outline btn-small" id="add-place" type="button">${icon("plus", 15)}<span>${t("addPlace")}</span></button>` : ""}
      </div>
      <p class="bucket-intro">${t("bucketListIntro")}</p>
      <div class="bucket-grid">${cards}</div>
    </section>
  `;
}

function bucketCardHtml(it, admin) {
  const tempt = localized(it, "tempt") || "";
  const title = (it.title || "").trim();
  // Entries made before the name field existed only have a destination, so it
  // stands in as the heading — and isn't then repeated on the line below.
  const name = title || it.destination;
  const place = title && it.destination && it.destination !== title ? it.destination : "";
  const img = it.cover_key
    ? `<img src="/photos/${encodeURIComponent(it.cover_key)}" alt="" loading="lazy" />`
    : `<div class="bucket-placeholder">${icon("mountain", 26)}</div>`;

  return `
    <article class="bucket-card" data-bucket-id="${it.id}">
      <div class="bucket-photo">
        ${img}
        ${admin ? `<button class="bucket-photo-btn" data-bucket-photo type="button" aria-label="${t("addPhoto")}">${icon("camera", 15)}</button>` : ""}
      </div>
      <div class="bucket-body">
        <h3>${escapeHtml(name)}</h3>
        ${place ? `<p class="bucket-place">${icon("pin", 12)}<span>${escapeHtml(place)}</span></p>` : ""}
        <p class="bucket-tempt">${escapeHtml(tempt)}</p>
        ${admin ? `<div class="bucket-actions">
          <button class="edit-btn" data-bucket-edit type="button">${icon("pencil", 14)}<span>${t("edit")}</span></button>
          <button class="edit-btn danger" data-bucket-delete type="button" aria-label="${t("delete")}">${icon("trash", 14)}</button>
        </div>` : ""}
      </div>
    </article>
  `;
}

function wireBucketList(items, admin) {
  if (!admin) return;
  const byId = new Map(items.map((it) => [String(it.id), it]));

  document.getElementById("add-place")?.addEventListener("click", () => openPlaceModal());

  document.querySelectorAll(".bucket-card").forEach((card) => {
    const id = card.dataset.bucketId;
    const item = byId.get(id);

    card.querySelector("[data-bucket-edit]")?.addEventListener("click", () => openPlaceModal(item));

    card.querySelector("[data-bucket-photo]")?.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async () => {
        const original = input.files[0];
        if (!original) return;
        toast(t("uploading"));
        const file = await downscaleImage(original, 1200);
        const fd = new FormData();
        fd.append("file", file);
        try {
          await api(`bucketlist/${id}/photo`, { method: "POST", body: fd });
          toast(t("photoUploaded"));
          renderHome();
        } catch (err) {
          toast(err.message);
        }
      });
      input.click();
    });

    card.querySelector("[data-bucket-delete]")?.addEventListener("click", async () => {
      if (!confirm(t("deletePlaceConfirm"))) return;
      try {
        await api(`bucketlist/${id}`, { method: "DELETE" });
        toast(t("deleted"));
        renderHome();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

// Add or edit one bucket-list place. Like the adventure form, the "what
// tempts me" field targets the column for the language you're viewing.
function openPlaceModal(item = null) {
  const editing = !!item;
  const temptField = editing && lang !== "en" ? `tempt_${lang}` : "tempt";
  const temptValue = editing ? (item[temptField] || "") : "";
  const langNote = temptField === "tempt" ? "" : ` (${lang.toUpperCase()})`;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editing ? t("editPlace") : t("addPlace")}</h2>
      <form id="place-form">
        <div class="field"><label>${t("fieldName")}</label>
          <input name="title" required maxlength="120" placeholder="${t("placeNamePlaceholder")}" value="${escapeHtml(editing ? (item.title || item.destination || "") : "")}" /></div>
        <div class="field"><label>${t("fieldDestination")}</label>
          <input name="destination" maxlength="120" placeholder="${t("placeDestPlaceholder")}" value="${escapeHtml(editing ? item.destination || "" : "")}" /></div>
        <div class="field">
          <label>${t("fieldTempt")}${langNote}</label>
          <textarea name="${temptField}" rows="3" maxlength="600" placeholder="${t("temptPlaceholder")}">${escapeHtml(temptValue)}</textarea>
          <p class="edit-hint">${t("temptHint")}</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline btn-block" id="cancel-modal">${t("cancel")}</button>
          <button type="submit" class="btn btn-block">${editing ? t("saveChanges") : t("create")}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#cancel-modal").addEventListener("click", () => overlay.remove());

  overlay.querySelector("#place-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (editing) {
        await api(`bucketlist/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("bucketlist", { method: "POST", body: JSON.stringify(payload) });
      }
      overlay.remove();
      toast(t("savedToast"));
      renderHome();
    } catch (err) {
      toast(err.message);
    }
  });
}

// Drag-to-reorder for the feed. Uses pointer events (not HTML5 drag-and-drop,
// which doesn't fire on touch) and a dedicated handle, so ordinary taps on a
// card still navigate and vertical scrolling is unaffected.
function enableDragReorder(list) {
  let dragging = null;
  let orderAtStart = null;

  // Read across the whole feed, not just the list being dragged, so the saved
  // sort_order stays globally unique: the upcoming block, then the past one.
  const currentOrder = () =>
    [...document.querySelectorAll("#feed .adventure-card-wrap")].map((el) => el.dataset.slug);

  const onMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const others = [...list.querySelectorAll(".adventure-card-wrap:not(.dragging)")];
    const before = others.find((el) => {
      const box = el.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    if (before) list.insertBefore(dragging, before);
    else list.appendChild(dragging);
  };

  const onUp = async () => {
    if (!dragging) return;
    dragging.classList.remove("dragging");
    list.classList.remove("reordering");
    dragging = null;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);

    const slugs = currentOrder();
    if (slugs.join("|") === orderAtStart) return; // nothing actually moved

    try {
      await api("adventures/reorder", { method: "POST", body: JSON.stringify({ slugs }) });
      toast(t("orderSaved"));
    } catch (err) {
      toast(err.message);
    }
  };

  list.querySelectorAll("[data-drag-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragging = handle.closest(".adventure-card-wrap");
      if (!dragging) return;
      orderAtStart = currentOrder().join("|");
      dragging.classList.add("dragging");
      list.classList.add("reordering");
      document.addEventListener("pointermove", onMove, { passive: false });
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  });
}

function adventureCardHtml(a, admin = false) {
  const cover = a.cover_key
    ? `<img src="/photos/${encodeURIComponent(a.cover_key)}" alt="" loading="lazy" />`
    : "";
  const summary = localized(a, "summary");
  // The group heading already says upcoming vs past, so the badge carries the
  // more useful fact — when — and falls back to the status if no date is set.
  const when = a.date_label || (a.status === "completed" ? t("completed") : t("upcoming"));
  return `
    <div class="adventure-card-wrap" data-slug="${escapeHtml(a.slug)}">
      <a class="adventure-card" href="/adventure/${a.slug}" data-link>
        <div class="adventure-card-cover">
          <span class="status-badge ${a.status === "completed" ? "completed" : ""}">${escapeHtml(when)}</span>
          ${cover}
        </div>
        <div class="adventure-card-body">
          <h2>${escapeHtml(a.title)}</h2>
          ${a.destination ? `<div class="adventure-meta">${icon("pin", 13)}<span>${escapeHtml(a.destination)}</span></div>` : ""}
          <p>${escapeHtml(summary || "")}</p>
        </div>
      </a>
      ${admin ? `<button class="drag-handle" data-drag-handle type="button" aria-label="${t("dragHint")}">${icon("grip", 18)}</button>` : ""}
    </div>
  `;
}

// Create (no argument) or edit (pass the adventure) — same form either way.
// The summary field targets the column for the currently selected language,
// so you edit the LV summary while viewing in Latvian.
function openAdventureModal(adventure = null) {
  const editing = !!adventure;
  const summaryField = editing && lang !== "en" ? `summary_${lang}` : "summary";
  const summaryValue = editing ? (adventure[summaryField] || "") : "";
  const langNote = summaryField === "summary" ? "" : ` (${lang.toUpperCase()})`;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editing ? t("editAdventure") : t("newAdventure")}</h2>
      <form id="adventure-form">
        <div class="field"><label>${t("fieldTitle")}</label>
          <input name="title" required placeholder="${t("titlePlaceholder")}" value="${escapeHtml(editing ? adventure.title : "")}" /></div>
        <div class="field"><label>${t("fieldDestination")}</label>
          <input name="destination" placeholder="${t("titlePlaceholder")}" value="${escapeHtml(editing ? adventure.destination || "" : "")}" /></div>
        <div class="field"><label>${t("fieldWhen")}</label>
          <input name="date_label" placeholder="${t("whenPlaceholder")}" value="${escapeHtml(editing ? adventure.date_label || "" : "")}" /></div>
        <div class="field"><label>${t("fieldStatus")}</label>
          <select name="status">
            <option value="upcoming"${editing && adventure.status !== "completed" ? " selected" : ""}>${t("upcoming")}</option>
            <option value="completed"${editing && adventure.status === "completed" ? " selected" : ""}>${t("completed")}</option>
          </select></div>
        <div class="field"><label>${t("fieldSummary")}${langNote}</label>
          <textarea name="${summaryField}" placeholder="${t("summaryPlaceholder")}">${escapeHtml(summaryValue)}</textarea></div>
        <div class="field"><label>${t("fieldSource")}</label>
          <input name="source_url" placeholder="${t("sourcePlaceholder")}" value="${escapeHtml(editing ? adventure.source_url || "" : "")}" /></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline btn-block" id="cancel-modal">${t("cancel")}</button>
          <button type="submit" class="btn btn-block">${editing ? t("saveChanges") : t("create")}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#cancel-modal").addEventListener("click", () => overlay.remove());

  overlay.querySelector("#adventure-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (editing) {
        await api(`adventures/${adventure.slug}`, { method: "PATCH", body: JSON.stringify(payload) });
        overlay.remove();
        toast(t("savedToast"));
        renderAdventure(adventure.slug);
      } else {
        const { slug } = await api("adventures", { method: "POST", body: JSON.stringify(payload) });
        overlay.remove();
        document.querySelectorAll(".fab").forEach((f) => f.remove());
        navigate(`/adventure/${slug}`);
      }
    } catch (err) {
      toast(err.message);
    }
  });
}

// ---------- adventure detail ----------

// Which tab is open, tracked per adventure so a re-render (after saving an
// edit or uploading a photo) keeps you where you were.
let activeTab = { slug: null, type: null };

function resolveActiveTab(adventure) {
  const types = adventure.sections.map((sec) => sec.type);
  if (activeTab.slug === adventure.slug && types.includes(activeTab.type)) {
    return activeTab.type;
  }
  // Opening fresh: land on the first tab that actually has something in it.
  const withContent = adventure.sections.find((sec) => (localized(sec, "body") || "").trim());
  return withContent ? withContent.type : types[0];
}

async function renderAdventure(slug) {
  document.querySelectorAll(".fab").forEach((f) => f.remove());
  $app.innerHTML = `<p class="empty-state">${t("loading")}</p>`;

  let adventure;
  try {
    ({ adventure } = await api(`adventures/${slug}`));
  } catch {
    $app.innerHTML = `<div class="empty-state"><h2>${t("notFoundTitle")}</h2><a class="btn" href="/" data-link>${t("goHome")}</a></div>`;
    return;
  }

  const admin = isAdmin();
  const cover = adventure.cover_key
    ? `<img src="/photos/${encodeURIComponent(adventure.cover_key)}" alt="" />`
    : "";
  const summary = localized(adventure, "summary");
  activeTab = { slug: adventure.slug, type: resolveActiveTab(adventure) };

  const tabs = adventure.sections
    .map((sec) => {
      const meta = SECTION_META[sec.type] || { icon: "map" };
      const label = t("sectionTitles")[sec.type] || sec.title;
      const on = sec.type === activeTab.type;
      return `<button class="cover-tab${on ? " active" : ""}" data-tab="${sec.type}" type="button" aria-selected="${on}">
        ${icon(meta.icon, 15)}<span>${escapeHtml(label)}</span>
      </button>`;
    })
    .join("");

  $app.innerHTML = `
    <a class="back-link" href="/" data-link>${icon("arrowLeft", 16)}<span>${t("allAdventures")}</span></a>
    <div class="detail-cover">
      ${cover}
      ${admin ? `<button class="cover-upload-btn" id="cover-upload">${icon("camera", 16)}<span>${adventure.cover_key ? t("changeCover") : t("addCover")}</span></button>` : ""}
      <nav class="cover-tabs" id="cover-tabs" role="tablist">${tabs}</nav>
    </div>
    <div class="detail-header">
      <div class="detail-title-row">
        <h1>${escapeHtml(adventure.title)}</h1>
        ${admin ? `<button class="edit-btn" id="edit-adventure" type="button">${icon("pencil", 15)}<span>${t("edit")}</span></button>` : ""}
      </div>
      <div class="detail-meta">${escapeHtml(adventure.destination || "")}${adventure.date_label ? " · " + escapeHtml(adventure.date_label) : ""} · ${adventure.status === "completed" ? t("completed") : t("upcoming")}</div>
      ${summary ? `<p class="detail-summary">${escapeHtml(summary)}</p>` : ""}
      ${adventure.source_url ? `<a class="source-link" href="${escapeHtml(adventure.source_url)}" target="_blank" rel="noopener"><span>${t("viewOriginalPlan")}</span>${icon("externalLink", 14)}</a>` : ""}
    </div>

    <div class="action-row">
      <div class="reactions" id="reactions"></div>
      <button class="btn btn-outline btn-small" id="share-btn">${icon("share", 16)}<span>${t("share")}</span></button>
    </div>

    <div id="sections"></div>

    <div class="comments">
      <h3>${icon("message", 19)}<span>${t("comments")}</span></h3>
      <form class="comment-form" id="comment-form">
        <input name="name" placeholder="${t("namePlaceholder")}" required maxlength="60" />
        <textarea name="body" placeholder="${t("commentPlaceholder")}" required maxlength="2000"></textarea>
        <button type="submit" class="btn btn-block">${t("postComment")}</button>
      </form>
      <div id="comment-list"></div>
    </div>
  `;

  renderReactions(adventure);
  renderActiveSection(adventure, admin);
  renderComments(adventure.comments);

  document.getElementById("cover-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn || btn.dataset.tab === activeTab.type) return;
    activeTab = { slug: adventure.slug, type: btn.dataset.tab };
    document.querySelectorAll(".cover-tab").forEach((b) => {
      const on = b.dataset.tab === activeTab.type;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    renderActiveSection(adventure, admin);
  });

  document.getElementById("edit-adventure")?.addEventListener("click", () => openAdventureModal(adventure));
  document.getElementById("cover-upload")?.addEventListener("click", () => {
    pickAndUploadPhoto(slug, "cover");
  });
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

function renderActiveSection(adventure, admin) {
  const el = document.getElementById("sections");
  const section = adventure.sections.find((sec) => sec.type === activeTab.type);
  if (!section) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = sectionHtml(section, admin);
  wireSection(adventure.slug, section, admin);
}

function sectionHtml(s, admin) {
  const meta = SECTION_META[s.type] || { icon: "map" };
  const title = t("sectionTitles")[s.type] || s.title;
  const body = localized(s, "body");
  const bodyHtml = body
    ? `<div class="section-body" data-view>${mdToHtml(body)}</div>`
    : `<div class="section-body empty" data-view>${admin ? t("nothingHereAdmin") : t("nothingHerePublic")}</div>`;

  const photos = s.photos.map((p) => `<img src="/photos/${encodeURIComponent(p.r2_key)}" alt="${escapeHtml(p.caption || "")}" loading="lazy" />`).join("");
  const addTile = admin ? `<div class="photo-add-tile" data-add-photo="${s.type}">${icon("plus", 22)}</div>` : "";

  return `
    <div class="section-card" data-section="${s.type}" data-section-id="${s.id}">
      ${admin ? `<div class="section-card-head">
        <h3 class="sr-title">${icon(meta.icon, 18)}<span>${escapeHtml(title)}</span></h3>
        <button class="edit-btn" data-edit>${icon("pencil", 15)}<span>${t("edit")}</span></button>
      </div>` : ""}
      ${bodyHtml}
      ${(s.photos.length || admin) ? `<div class="photo-strip">${photos}${addTile}</div>` : ""}
    </div>
  `;
}

// Phone photos are routinely 5-15MB, which is slow on mobile data and can
// exceed the Worker's 10MB cap. Re-encode to a sensible max edge before
// uploading. Falls back to the original file if decoding isn't supported.
async function downscaleImage(file, maxEdge = 2000, quality = 0.85) {
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxEdge / longest);

    // Already small and already a JPEG — nothing to gain by re-encoding.
    if (scale === 1 && file.type === "image/jpeg" && file.size <= 2 * 1024 * 1024) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Opens the device photo picker and uploads the chosen image.
// `sectionType` is one of the four section types, or "cover".
function pickAndUploadPhoto(slug, sectionType, { askCaption = false } = {}) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", async () => {
    const original = input.files[0];
    if (!original) return;
    const caption = askCaption ? (prompt(t("captionPrompt")) || "") : "";
    toast(t("uploading"));
    const file = await downscaleImage(original);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("section_type", sectionType);
    fd.append("caption", caption);
    try {
      await api(`adventures/${slug}/photos`, { method: "POST", body: fd });
      toast(t("photoUploaded"));
      renderAdventure(slug);
    } catch (err) {
      toast(err.message);
    }
  });
  input.click();
}

function wireSection(slug, section, admin) {
  const card = document.querySelector(`[data-section-id="${section.id}"]`);
  if (!card) return;

  if (admin) {
    card.querySelector("[data-edit]")?.addEventListener("click", () => {
      const currentLang = lang;
      const bodyField = currentLang === "en" ? "body" : `body_${currentLang}`;
      const viewEl = card.querySelector("[data-view]");
      const wrap = document.createElement("div");
      const textarea = document.createElement("textarea");
      textarea.value = section[bodyField] || "";
      const hint = document.createElement("p");
      hint.className = "edit-hint";
      hint.textContent = t("editHint");
      wrap.append(textarea, hint);
      viewEl.replaceWith(wrap);
      const editBtn = card.querySelector("[data-edit]");
      editBtn.innerHTML = `${icon("check", 15)}<span>${t("save")}</span>`;
      editBtn.onclick = async () => {
        try {
          await api(`sections/${section.id}`, {
            method: "PATCH",
            body: JSON.stringify({ body: textarea.value, lang: currentLang }),
          });
          section[bodyField] = textarea.value;
          toast(t("savedToast"));
          renderAdventure(slug);
        } catch (err) {
          toast(err.message);
        }
      };
    });

    card.querySelector("[data-add-photo]")?.addEventListener("click", () => {
      pickAndUploadPhoto(slug, section.type, { askCaption: true });
    });
  }
}

function renderComments(comments) {
  const el = document.getElementById("comment-list");
  if (!comments.length) {
    el.innerHTML = `<p class="empty-state">${t("noComments")}</p>`;
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
  const summary = localized(adventure, "summary");
  if (navigator.share) {
    try {
      await navigator.share({ title: adventure.title, text: summary || "", url });
    } catch {
      /* user cancelled */
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t("linkCopied"));
  } catch {
    prompt(t("copyLinkPrompt"), url);
  }
}

updateLangSwitch();
render();
