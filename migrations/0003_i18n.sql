-- Add Latvian and Dutch translations alongside the existing English content.
-- Existing `body` / `summary` columns remain the English (default) text.

ALTER TABLE sections ADD COLUMN body_lv TEXT NOT NULL DEFAULT '';
ALTER TABLE sections ADD COLUMN body_nl TEXT NOT NULL DEFAULT '';

ALTER TABLE adventures ADD COLUMN summary_lv TEXT NOT NULL DEFAULT '';
ALTER TABLE adventures ADD COLUMN summary_nl TEXT NOT NULL DEFAULT '';
