-- Wayfarer schema: adventures, their 4 sections, photos, comments, reactions

CREATE TABLE IF NOT EXISTS adventures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  destination TEXT,
  date_label TEXT,          -- free text, e.g. "September 2026"
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | completed
  summary TEXT DEFAULT '',
  source_url TEXT,          -- link back to original plan (e.g. Rover)
  cover_key TEXT,           -- R2 key of cover photo, nullable
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('prepare', 'plan', 'experience', 'reflect')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  UNIQUE(adventure_id, type)
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('prepare', 'plan', 'experience', 'reflect', 'cover')),
  r2_key TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adventure_id INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reactions (
  adventure_id INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (adventure_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_sections_adventure ON sections(adventure_id);
CREATE INDEX IF NOT EXISTS idx_photos_adventure ON photos(adventure_id);
CREATE INDEX IF NOT EXISTS idx_comments_adventure ON comments(adventure_id);
