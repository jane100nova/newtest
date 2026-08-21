-- The Preparation tab counts down to departure, which needs a real date to
-- subtract from. `date_label` can't do it: it's free text ("September 2026")
-- meant for display, and stays as-is for that.
ALTER TABLE adventures ADD COLUMN depart_on TEXT;
