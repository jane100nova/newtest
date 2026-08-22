-- An activity belongs to a phase of the adventure, not to the adventure as a
-- whole: a training run is Preparation, the trip itself is Live updates.
-- Mirrors how photos already carry a section_type.
ALTER TABLE activities ADD COLUMN section_type TEXT NOT NULL DEFAULT 'experience';
