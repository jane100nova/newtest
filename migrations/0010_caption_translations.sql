-- Captions are written in English and machine-translated on save, so a photo
-- reads in all three languages. Either column can be overwritten by hand
-- afterwards when the translation is off.
ALTER TABLE photos ADD COLUMN caption_lv TEXT NOT NULL DEFAULT '';
ALTER TABLE photos ADD COLUMN caption_nl TEXT NOT NULL DEFAULT '';
