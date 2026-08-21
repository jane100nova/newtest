-- 1. Manual ordering for the adventure feed (newest-first is no longer the rule).
ALTER TABLE adventures ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Seed sort_order from the current newest-first order so nothing jumps around
-- before the first manual reorder.
UPDATE adventures
SET sort_order = (
  SELECT COUNT(*) FROM adventures a2 WHERE a2.created_at > adventures.created_at
);

-- 2. The journal is now three tabs: Preparation / Plan / Live updates.
-- The 'reflect' section is retired. Its photos are re-homed onto the
-- 'experience' section rather than deleted, so no uploaded image is orphaned
-- in R2 with no row pointing at it.
UPDATE photos SET section_type = 'experience' WHERE section_type = 'reflect';
DELETE FROM sections WHERE type = 'reflect';
