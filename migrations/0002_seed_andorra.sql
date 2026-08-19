-- First adventure: Andorra, planned via Rover, scheduled September 2026.
-- Section bodies are left empty on purpose — fill them in from the admin
-- view once the site is live (Rover's page couldn't be fetched automatically).

INSERT INTO adventures (slug, title, destination, date_label, status, summary, source_url)
VALUES (
  'andorra-2026',
  'Andorra',
  'Andorra',
  'September 2026',
  'upcoming',
  'My first planned adventure — tucked high in the Pyrenees between France and Spain.',
  'https://rover.lv/piedzivojums-andora-540'
);

INSERT INTO sections (adventure_id, type, title, body, sort_order)
SELECT id, 'prepare', 'How I Prepare', '', 1 FROM adventures WHERE slug = 'andorra-2026';

INSERT INTO sections (adventure_id, type, title, body, sort_order)
SELECT id, 'plan', 'The Plan', '', 2 FROM adventures WHERE slug = 'andorra-2026';

INSERT INTO sections (adventure_id, type, title, body, sort_order)
SELECT id, 'experience', 'How I Experience It', '', 3 FROM adventures WHERE slug = 'andorra-2026';

INSERT INTO sections (adventure_id, type, title, body, sort_order)
SELECT id, 'reflect', 'How I Feel Afterwards', '', 4 FROM adventures WHERE slug = 'andorra-2026';
