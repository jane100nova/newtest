-- Activities can now come from an uploaded GPX/TCX file as well as Strava.
-- Strava rows keep Strava's own (positive) activity id; uploads are given
-- negative ids, so the two id spaces can never collide.
ALTER TABLE activities ADD COLUMN source TEXT NOT NULL DEFAULT 'strava';
