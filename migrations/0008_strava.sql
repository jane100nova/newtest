-- Strava bridge: Garmin syncs activities to Strava, Strava pushes them here.

-- One row (id = 1) holding the connected athlete's tokens. Strava access
-- tokens are short-lived, so the refresh token is the part that matters.
CREATE TABLE IF NOT EXISTS strava_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  athlete_id INTEGER,
  athlete_name TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL DEFAULT 0,   -- unix seconds
  scope TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',          -- in-flight OAuth CSRF token
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per Strava activity. `adventure_id` is null until it's attached to
-- an adventure, so activities can arrive before you've decided where they go.
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,                  -- Strava's activity id
  adventure_id INTEGER REFERENCES adventures(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  sport_type TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',     -- ISO 8601, UTC
  moving_time INTEGER NOT NULL DEFAULT 0,  -- seconds
  elapsed_time INTEGER NOT NULL DEFAULT 0,
  distance_m REAL NOT NULL DEFAULT 0,
  ascent_m REAL NOT NULL DEFAULT 0,
  elev_high REAL,
  elev_low REAL,
  average_speed REAL,                      -- m/s
  max_speed REAL,
  average_heartrate REAL,
  max_heartrate REAL,
  -- Downsampled [lat, lng, ele, t, hr, speed] points; null where unrecorded.
  track TEXT NOT NULL DEFAULT '[]',
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activities_adventure ON activities(adventure_id);
CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_date);
