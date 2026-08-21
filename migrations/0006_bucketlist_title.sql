-- A bucket-list entry now carries the name of the adventure as well as the
-- place it happens in: "Trek to Everest Base Camp" (title) in "Nepal"
-- (destination). Until now there was only a destination doing both jobs.
ALTER TABLE bucketlist ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- Rows created before this migration only have a destination. Seed the name
-- from it so no card renders with an empty heading; it can be edited after.
UPDATE bucketlist SET title = destination WHERE title = '';
