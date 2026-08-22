// Zane's Adventures — tiny vanilla-JS SPA. No framework, no build step.

const $app = document.getElementById("app");
const $adminToggle = document.getElementById("admin-toggle");
const $langSwitch = document.getElementById("lang-switch");
const ADMIN_KEY_STORAGE = "wa_admin_key";
const LANG_STORAGE = "wa_lang";
const REACTION_EMOJIS = ["🔥", "😍", "🥾", "🎉"];
const POST_SECTIONS = new Set(["prepare", "experience"]);
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
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  trendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
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
    captionPrompt: "One sentence about this photo:",
    fieldDepart: "Departure date", departHint: "Sets the countdown on the Preparation tab.",
    toDeparture: "to departure", dayOne: "day", dayMany: "days",
    departureDay: "Departure day!",
    setDepartureHint: "Add a departure date to show a countdown here.",
    addTrainingPhoto: "Add a training photo", addUpdate: "Add an update",
    deletePhotoConfirm: "Delete this photo?",
    route: "Route", elevationHint: "Drag across the profile to walk the route.",
    statDistance: "Distance", statAscent: "Ascent", statMoving: "Moving time",
    statHigh: "Highest point", statHr: "Avg heart rate", statSpeed: "Max speed",
    linkActivity: "Link activity", unlink: "Unlink",
    pickActivity: "Pick an activity", noActivities: "No activities synced yet.",
    noRoute: "No route yet \u2014 link a Strava activity to draw one.",
    stravaSync: "Sync recent", stravaConnect: "Connect", stravaDisconnect: "Disconnect",
    stravaAutoSync: "Auto-sync", autoSyncOn: "Auto-sync enabled",
    stravaNotConfigured: "Strava keys aren't set on the Worker yet.",
    stravaConnectedToast: "Strava connected", stravaFailedToast: "Strava connection failed",
    syncing: "Syncing\u2026", unlinked: "Unlinked",
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
    captionPrompt: "Viens teikums par šo foto:",
    fieldDepart: "Izbraukšanas datums", departHint: "Iestata atskaiti sagatavošanās cilnē.",
    toDeparture: "līdz izbraukšanai", dayOne: "diena", dayMany: "dienas",
    departureDay: "Izbraukšanas diena!",
    setDepartureHint: "Pievieno izbraukšanas datumu, lai šeit rādītu atskaiti.",
    addTrainingPhoto: "Pievienot treniņa foto", addUpdate: "Pievienot jaunumu",
    deletePhotoConfirm: "Dzēst šo foto?",
    route: "Maršruts", elevationHint: "Velc pāri profilam, lai ietu pa maršrutu.",
    statDistance: "Distance", statAscent: "Kāpums", statMoving: "Kustībā",
    statHigh: "Augstākais punkts", statHr: "Vidējais pulss", statSpeed: "Maks. ātrums",
    linkActivity: "Piesaistīt aktivitāti", unlink: "Atsaistīt",
    pickActivity: "Izvēlies aktivitāti", noActivities: "Nav sinhronizētu aktivitāšu.",
    noRoute: "Vēl nav maršruta \u2014 piesaisti Strava aktivitāti.",
    stravaSync: "Sinhronizēt", stravaConnect: "Savienot", stravaDisconnect: "Atvienot",
    stravaAutoSync: "Auto-sinhronizācija", autoSyncOn: "Auto-sinhronizācija ieslēgta",
    stravaNotConfigured: "Strava atslēgas vēl nav iestatītas.",
    stravaConnectedToast: "Strava savienota", stravaFailedToast: "Neizdevās savienot Strava",
    syncing: "Sinhronizē\u2026", unlinked: "Atsaistīts",
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
    captionPrompt: "Eén zin over deze foto:",
    fieldDepart: "Vertrekdatum", departHint: "Stelt de aftelling op het tabblad Voorbereiding in.",
    toDeparture: "tot vertrek", dayOne: "dag", dayMany: "dagen",
    departureDay: "Vertrekdag!",
    setDepartureHint: "Voeg een vertrekdatum toe voor een aftelling hier.",
    addTrainingPhoto: "Trainingsfoto toevoegen", addUpdate: "Update toevoegen",
    deletePhotoConfirm: "Deze foto verwijderen?",
    route: "Route", elevationHint: "Sleep over het profiel om de route te volgen.",
    statDistance: "Afstand", statAscent: "Stijging", statMoving: "Bewegingstijd",
    statHigh: "Hoogste punt", statHr: "Gem. hartslag", statSpeed: "Max. snelheid",
    linkActivity: "Activiteit koppelen", unlink: "Ontkoppelen",
    pickActivity: "Kies een activiteit", noActivities: "Nog geen activiteiten gesynchroniseerd.",
    noRoute: "Nog geen route \u2014 koppel een Strava-activiteit.",
    stravaSync: "Synchroniseren", stravaConnect: "Verbinden", stravaDisconnect: "Verbreken",
    stravaAutoSync: "Auto-sync", autoSyncOn: "Auto-sync ingeschakeld",
    stravaNotConfigured: "Strava-sleutels staan nog niet op de Worker.",
    stravaConnectedToast: "Strava verbonden", stravaFailedToast: "Verbinden met Strava mislukt",
    syncing: "Synchroniseren\u2026", unlinked: "Ontkoppeld",
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

// Whole calendar days from today to the departure date, in the viewer's own
// timezone — so "tomorrow" reads as 1, never as 0 from a fractional diff.
function daysToDeparture(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, mo - 1, d) - today) / 86400000);
}

// Latvian takes the singular for counts ending in 1, except 11.
function daysWord(n) {
  const one = lang === "lv" ? n % 10 === 1 && n % 100 !== 11 : n === 1;
  return one ? t("dayOne") : t("dayMany");
}

function formatDepartDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return "";
  const [, y, mo, d] = m.map(Number);
  try {
    return new Date(y, mo - 1, d).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
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
    ${admin ? `<div class="strava-strip" id="strava-strip"></div>` : ""}
    ${admin && adventures.length > 1 ? `<p class="drag-hint">${icon("grip", 14)}<span>${t("dragHint")}</span></p>` : ""}
    ${cards}
    ${bucketListHtml(bucketlist, admin)}
  `;

  wireBucketList(bucketlist, admin);
  if (admin) renderStravaStrip();

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

// Admin-only status line for the Strava connection: connect, sync, disconnect.
async function renderStravaStrip() {
  const el = document.getElementById("strava-strip");
  if (!el) return;

  let status;
  try {
    status = await api("strava/status");
  } catch {
    el.remove(); // pre-migration or not reachable — say nothing rather than error
    return;
  }

  if (!status.configured) {
    el.innerHTML = `<span class="strava-note">${icon("activity", 15)}<span>${t("stravaNotConfigured")}</span></span>`;
    return;
  }

  el.innerHTML = status.connected
    ? `<span class="strava-note">${icon("activity", 15)}<b>Strava</b><span class="sep">·</span>${escapeHtml(status.athlete)}<span class="sep">·</span>${status.activities}</span>
       <span class="strava-actions">
         <button class="edit-btn" id="strava-sync" type="button">${t("stravaSync")}</button>
         <button class="edit-btn" id="strava-auto" type="button">${t("stravaAutoSync")}</button>
         <button class="edit-btn danger" id="strava-disconnect" type="button">${t("stravaDisconnect")}</button>
       </span>`
    : `<span class="strava-note">${icon("activity", 15)}<b>Strava</b></span>
       <button class="edit-btn" id="strava-connect" type="button">${t("stravaConnect")}</button>`;

  el.querySelector("#strava-connect")?.addEventListener("click", async () => {
    try {
      const { url } = await api("strava/connect", { method: "POST" });
      location.href = url; // leaves the app; Strava sends the browser back
    } catch (err) {
      toast(err.message);
    }
  });

  el.querySelector("#strava-sync")?.addEventListener("click", async () => {
    toast(t("syncing"));
    try {
      const { imported } = await api("strava/sync", { method: "POST", body: JSON.stringify({ page: 1 }) });
      toast(`${t("savedToast")} · ${imported}`);
      renderStravaStrip();
    } catch (err) {
      toast(err.message);
    }
  });

  // One-time: registers this site as a Strava push subscription so new
  // activities arrive on their own instead of needing a manual sync.
  el.querySelector("#strava-auto")?.addEventListener("click", async () => {
    try {
      await api("strava/webhook/subscribe", { method: "POST" });
      toast(t("autoSyncOn"));
    } catch (err) {
      toast(err.message);
    }
  });

  el.querySelector("#strava-disconnect")?.addEventListener("click", async () => {
    if (!confirm(t("logoutConfirm"))) return;
    try {
      await api("strava/disconnect", { method: "POST" });
      renderStravaStrip();
    } catch (err) {
      toast(err.message);
    }
  });
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
        <div class="field"><label>${t("fieldDepart")}</label>
          <input type="date" name="depart_on" value="${escapeHtml(editing ? adventure.depart_on || "" : "")}" />
          <p class="edit-hint">${t("departHint")}</p></div>
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

// ---------- route: map + elevation profile ----------

const PROFILE_W = 1000;
const PROFILE_H = 200;

function fmtKm(m) { return `${(Number(m) / 1000).toFixed(1)} km`; }
function fmtM(m) { return `${Math.round(Number(m) || 0)} m`; }
function fmtSpeed(ms) { return `${(Number(ms) * 3.6).toFixed(1)} km/h`; }
function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Several activities (a multi-day trek) become one continuous series: each
// leg stays separate for the map, while distances accumulate for the profile.
function routeSeries(activities) {
  const sorted = [...activities].sort((a, b) =>
    String(a.start_date).localeCompare(String(b.start_date))
  );

  const legs = [];
  const points = [];
  let offset = 0;

  for (const a of sorted) {
    const track = Array.isArray(a.track) ? a.track : [];
    const leg = [];
    let lastD = 0;

    for (const [lat, lng, ele, , hr, v, d] of track) {
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      leg.push([lat, lng]);
      if (typeof d === "number") lastD = d;
      points.push({ lat, lng, ele, hr, v, d: offset + lastD });
    }

    offset += lastD;
    if (leg.length) legs.push(leg);
  }
  return { legs, points };
}

function routeStats(activities) {
  const sum = (f) => activities.reduce((n, a) => n + (Number(a[f]) || 0), 0);
  const nums = (f) => activities.map((a) => a[f]).filter((v) => typeof v === "number");

  const withHr = activities.filter((a) => typeof a.average_heartrate === "number");
  const hrWeight = withHr.reduce((n, a) => n + (Number(a.moving_time) || 0), 0);
  const highs = nums("elev_high");
  const speeds = nums("max_speed");

  return {
    distance: sum("distance_m"),
    ascent: sum("ascent_m"),
    moving: sum("moving_time"),
    high: highs.length ? Math.max(...highs) : null,
    // Weighted by moving time, so a long day counts for more than a short one.
    hr: hrWeight
      ? withHr.reduce((n, a) => n + a.average_heartrate * (Number(a.moving_time) || 0), 0) / hrWeight
      : null,
    maxSpeed: speeds.length ? Math.max(...speeds) : null,
  };
}

function profileSvg(points) {
  const pts = points.filter((p) => typeof p.ele === "number");
  if (pts.length < 2) return "";

  const maxD = pts[pts.length - 1].d || 1;
  const eles = pts.map((p) => p.ele);
  let lo = Math.min(...eles);
  let hi = Math.max(...eles);
  // A flat walk shouldn't render as a razor-thin line across the middle.
  if (hi - lo < 20) hi = lo + 20;
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;

  const x = (d) => (d / maxD) * PROFILE_W;
  const y = (e) => PROFILE_H - ((e - lo) / (hi - lo)) * PROFILE_H;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.ele).toFixed(1)}`).join("");

  return `
    <svg class="profile-svg" viewBox="0 0 ${PROFILE_W} ${PROFILE_H}" preserveAspectRatio="none"
         role="img" aria-label="${escapeHtml(t("statAscent"))}">
      <path class="profile-area" d="${line}L${PROFILE_W},${PROFILE_H}L0,${PROFILE_H}Z" />
      <path class="profile-line" d="${line}" vector-effect="non-scaling-stroke" />
      <line class="profile-cursor" x1="0" y1="0" x2="0" y2="${PROFILE_H}"
            vector-effect="non-scaling-stroke" style="display:none" />
    </svg>
  `;
}

function readoutHtml(p) {
  return [
    `<b>${(p.d / 1000).toFixed(1)}</b> km`,
    typeof p.ele === "number" ? `<b>${Math.round(p.ele)}</b> m` : null,
    typeof p.hr === "number" ? `<b>${Math.round(p.hr)}</b> bpm` : null,
    typeof p.v === "number" ? `<b>${(p.v * 3.6).toFixed(1)}</b> km/h` : null,
  ]
    .filter(Boolean)
    .join('<span class="sep">·</span>');
}

function routePanelHtml(adventure, admin) {
  const activities = adventure.activities || [];
  if (!activities.length && !admin) return "";

  const head = `
    <div class="route-head">
      <h3>${icon("map", 18)}<span>${t("route")}</span></h3>
      ${admin ? `<button class="btn btn-outline btn-small" id="link-activity" type="button">${icon("plus", 15)}<span>${t("linkActivity")}</span></button>` : ""}
    </div>`;

  if (!activities.length) {
    return `<section class="route-panel">${head}<p class="route-empty">${t("noRoute")}</p></section>`;
  }

  const { legs, points } = routeSeries(activities);
  const s = routeStats(activities);
  const stat = (ico, value, label) =>
    `<div class="stat">${icon(ico, 15)}<span class="stat-value">${escapeHtml(value)}</span><span class="stat-label">${escapeHtml(label)}</span></div>`;

  return `
    <section class="route-panel">
      ${head}
      ${legs.length ? `<div class="route-map" id="route-map"></div>` : ""}
      ${points.some((p) => typeof p.ele === "number") ? `
        <div class="route-profile">
          ${profileSvg(points)}
          <div class="route-readout">${t("elevationHint")}</div>
        </div>` : ""}
      <div class="route-stats">
        ${stat("map", fmtKm(s.distance), t("statDistance"))}
        ${stat("trendingUp", fmtM(s.ascent), t("statAscent"))}
        ${stat("clock", fmtDuration(s.moving), t("statMoving"))}
        ${s.high != null ? stat("mountain", fmtM(s.high), t("statHigh")) : ""}
        ${s.hr != null ? stat("heart", `${Math.round(s.hr)} bpm`, t("statHr")) : ""}
        ${s.maxSpeed != null ? stat("gauge", fmtSpeed(s.maxSpeed), t("statSpeed")) : ""}
      </div>
      ${admin ? `<ul class="route-activities">${activities
        .map((a) => `<li data-activity-id="${a.id}"><span>${escapeHtml(a.name || "")}</span>
          <button class="edit-btn danger" data-unlink type="button">${escapeHtml(t("unlink"))}</button></li>`)
        .join("")}</ul>` : ""}
    </section>`;
}

function wireRoutePanel(adventure, admin) {
  const panel = document.querySelector(".route-panel");
  if (!panel) return;

  const activities = adventure.activities || [];
  const { legs, points } = routeSeries(activities);
  let marker = null;

  // Leaflet comes from a CDN. If it didn't load, the profile and stats still
  // work — only the basemap is missing.
  const mapEl = document.getElementById("route-map");
  if (mapEl && window.L && legs.length) {
    const map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const drawn = legs.map((leg) => L.polyline(leg, { color: "#d97a3f", weight: 4, opacity: 0.9 }).addTo(map));
    map.fitBounds(L.featureGroup(drawn).getBounds(), { padding: [18, 18] });
    marker = L.circleMarker(legs[0][0], {
      radius: 6, color: "#fff", weight: 2, fillColor: "#1f3d2b", fillOpacity: 1,
    }).addTo(map);
  } else if (mapEl) {
    mapEl.remove();
  }

  const svg = panel.querySelector(".profile-svg");
  const readout = panel.querySelector(".route-readout");
  if (svg && readout) {
    const pts = points.filter((p) => typeof p.ele === "number");
    const maxD = pts[pts.length - 1]?.d || 1;
    const cursor = svg.querySelector(".profile-cursor");

    const scrub = (clientX) => {
      const box = svg.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      const target = ratio * maxD;
      let best = pts[0];
      for (const p of pts) {
        if (p.d <= target) best = p;
        else break;
      }
      cursor.setAttribute("x1", ratio * PROFILE_W);
      cursor.setAttribute("x2", ratio * PROFILE_W);
      cursor.style.display = "";
      readout.innerHTML = readoutHtml(best);
      marker?.setLatLng([best.lat, best.lng]);
    };

    svg.addEventListener("pointerdown", (e) => scrub(e.clientX));
    svg.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType !== "mouse") scrub(e.clientX); });
    svg.addEventListener("pointerleave", () => {
      cursor.style.display = "none";
      readout.textContent = t("elevationHint");
    });
  }

  if (!admin) return;

  document.getElementById("link-activity")?.addEventListener("click", () => openActivityPicker(adventure.slug));

  panel.querySelectorAll("[data-unlink]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`activities/${btn.closest("li").dataset.activityId}`, { method: "DELETE" });
        toast(t("unlinked"));
        renderAdventure(adventure.slug);
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

async function openActivityPicker(slug) {
  let activities = [];
  try {
    ({ activities } = await api("activities"));
  } catch (err) {
    toast(err.message);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t("pickActivity")}</h2>
      ${activities.length ? `<ul class="activity-picker">${activities
        .map((a) => `<li><button type="button" data-pick="${a.id}">
            <span class="ap-name">${escapeHtml(a.name || "")}</span>
            <span class="ap-meta">${escapeHtml(String(a.start_date).slice(0, 10))}<span class="sep">·</span>${fmtKm(a.distance_m)}<span class="sep">·</span>${fmtM(a.ascent_m)}${a.adventure_title ? `<span class="sep">·</span>${escapeHtml(a.adventure_title)}` : ""}</span>
          </button></li>`)
        .join("")}</ul>` : `<p class="route-empty">${t("noActivities")}</p>`}
      <div class="modal-actions">
        <button type="button" class="btn btn-outline btn-block" id="cancel-modal">${t("cancel")}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#cancel-modal").addEventListener("click", () => overlay.remove());

  overlay.querySelectorAll("[data-pick]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`adventures/${slug}/activities`, {
          method: "POST",
          body: JSON.stringify({ activity_id: Number(btn.dataset.pick) }),
        });
        overlay.remove();
        toast(t("savedToast"));
        renderAdventure(slug);
      } catch (err) {
        toast(err.message);
      }
    });
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

    ${routePanelHtml(adventure, admin)}

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
  wireRoutePanel(adventure, admin);
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
  el.innerHTML = sectionHtml(section, admin, adventure);
  wireSection(adventure.slug, section, admin);
  // Setting the departure date lives in the adventure form; make the empty
  // countdown a way in, rather than a dead end telling you to go find it.
  el.querySelector("[data-set-depart]")?.addEventListener("click", () => openAdventureModal(adventure));
}

function sectionHtml(s, admin, adventure) {
  const meta = SECTION_META[s.type] || { icon: "map" };
  const title = t("sectionTitles")[s.type] || s.title;
  const body = localized(s, "body");
  const bodyHtml = body
    ? `<div class="section-body" data-view>${mdToHtml(body)}</div>`
    : `<div class="section-body empty" data-view>${admin ? t("nothingHereAdmin") : t("nothingHerePublic")}</div>`;

  // Preparation and Live updates read as a feed of photo posts; Plan keeps the
  // compact strip, since its images are reference material, not a narrative.
  let media;
  if (POST_SECTIONS.has(s.type)) {
    media = postFeedHtml(s, admin);
  } else {
    const photos = s.photos.map((p) => `<img src="/photos/${encodeURIComponent(p.r2_key)}" alt="${escapeHtml(p.caption || "")}" loading="lazy" />`).join("");
    const addTile = admin ? `<div class="photo-add-tile" data-add-photo="${s.type}">${icon("plus", 22)}</div>` : "";
    media = (s.photos.length || admin) ? `<div class="photo-strip">${photos}${addTile}</div>` : "";
  }

  return `
    <div class="section-card" data-section="${s.type}" data-section-id="${s.id}">
      ${admin ? `<div class="section-card-head">
        <h3 class="sr-title">${icon(meta.icon, 18)}<span>${escapeHtml(title)}</span></h3>
        <button class="edit-btn" data-edit>${icon("pencil", 15)}<span>${t("edit")}</span></button>
      </div>` : ""}
      ${s.type === "prepare" ? countdownHtml(adventure, admin) : ""}
      ${bodyHtml}
      ${media}
    </div>
  `;
}

// Counts down to departure on the Preparation tab. Hidden once the trip has
// started — from then on Live updates is the tab that matters.
function countdownHtml(adventure, admin) {
  const days = daysToDeparture(adventure?.depart_on);
  if (days === null) {
    // Only nudge the owner; a visitor shouldn't see a missing-data prompt.
    return admin ? `<button class="countdown-hint" data-set-depart type="button">${icon("calendar", 14)}<span>${t("setDepartureHint")}</span></button>` : "";
  }
  if (days < 0) return "";

  const face = days === 0
    ? `<span class="countdown-today">${escapeHtml(t("departureDay"))}</span>`
    : `<span class="countdown-num">${days}</span><span class="countdown-label">${escapeHtml(daysWord(days))} ${escapeHtml(t("toDeparture"))}</span>`;

  return `
    <div class="countdown${days === 0 ? " today" : ""}">
      ${face}
      <span class="countdown-date">${escapeHtml(formatDepartDate(adventure.depart_on))}</span>
    </div>
  `;
}

// A photo + one sentence, newest first.
function postFeedHtml(s, admin) {
  if (!s.photos.length && !admin) return "";
  const addLabel = s.type === "prepare" ? t("addTrainingPhoto") : t("addUpdate");
  const posts = [...s.photos].reverse(); // API returns oldest-first

  return `
    <div class="post-feed">
      ${admin ? `<button class="btn btn-outline btn-block add-post" data-add-photo="${s.type}" type="button">${icon("camera", 16)}<span>${escapeHtml(addLabel)}</span></button>` : ""}
      ${posts.map((p) => postHtml(p, admin)).join("")}
    </div>
  `;
}

function postHtml(p, admin) {
  return `
    <article class="post" data-photo-id="${p.id}">
      <img src="/photos/${encodeURIComponent(p.r2_key)}" alt="${escapeHtml(p.caption || "")}" loading="lazy" />
      <div class="post-body">
        ${p.caption ? `<p class="post-caption">${escapeHtml(p.caption)}</p>` : ""}
        <div class="post-foot">
          <span class="post-time">${escapeHtml(relativeTime(p.created_at))}</span>
          ${admin ? `<span class="post-actions">
            <button class="edit-btn" data-post-edit type="button">${icon("pencil", 13)}<span>${t("edit")}</span></button>
            <button class="edit-btn danger" data-post-delete type="button" aria-label="${t("delete")}">${icon("trash", 13)}</button>
          </span>` : ""}
        </div>
      </div>
    </article>
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

    const photoById = new Map(section.photos.map((p) => [String(p.id), p]));

    card.querySelectorAll("[data-post-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest(".post").dataset.photoId;
        const next = prompt(t("captionPrompt"), photoById.get(id)?.caption || "");
        if (next === null) return; // cancelled, as distinct from cleared
        try {
          await api(`photos/${id}`, { method: "PATCH", body: JSON.stringify({ caption: next }) });
          toast(t("savedToast"));
          renderAdventure(slug);
        } catch (err) {
          toast(err.message);
        }
      });
    });

    card.querySelectorAll("[data-post-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(t("deletePhotoConfirm"))) return;
        try {
          await api(`photos/${btn.closest(".post").dataset.photoId}`, { method: "DELETE" });
          toast(t("deleted"));
          renderAdventure(slug);
        } catch (err) {
          toast(err.message);
        }
      });
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

const stravaResult = new URLSearchParams(location.search).get("strava");
if (stravaResult) {
  history.replaceState({}, "", location.pathname);
  setTimeout(() => toast(stravaResult === "connected" ? t("stravaConnectedToast") : t("stravaFailedToast")), 50);
}

updateLangSwitch();
render();
