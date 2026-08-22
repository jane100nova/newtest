-- Editable overrides for the app's own wording. The built-in strings stay in
-- the frontend as defaults; a row here replaces one for a single language, so
-- a translation that reads badly can be rewritten without a deploy.
CREATE TABLE IF NOT EXISTS site_text (
  key TEXT NOT NULL,          -- e.g. "pastAdventures" or "sectionTitles.prepare"
  lang TEXT NOT NULL,         -- en | lv | nl
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key, lang)
);
