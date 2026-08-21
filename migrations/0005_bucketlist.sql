-- Bucket list: places that aren't planned trips yet, just pull on you.
-- Deliberately lighter than `adventures` — a picture, a destination, and a
-- few lines on what tempts you. No sections, comments or reactions.
CREATE TABLE IF NOT EXISTS bucketlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  destination TEXT NOT NULL,
  tempt TEXT NOT NULL DEFAULT '',
  tempt_lv TEXT NOT NULL DEFAULT '',
  tempt_nl TEXT NOT NULL DEFAULT '',
  cover_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
