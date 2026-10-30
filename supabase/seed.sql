-- Synthetic development data only. Supabase loads this file after local resets.
INSERT INTO lis.grooklets (title, body)
VALUES ('A local grooklet', 'A small piece of writing for local development.');

INSERT INTO lis.me_event_types (type, type_short, grouping_threshold, verb)
VALUES ('Local reading', 'local-reading', 60, 'read');

INSERT INTO lis.me_events (type_id, "timestamp", title, title_parent)
SELECT id, now() - interval '1 hour', 'A local book', NULL
FROM lis.me_event_types WHERE type_short = 'local-reading';

INSERT INTO lis.writing_types (title, url_slug)
VALUES ('Local notes', 'local-notes');

INSERT INTO lis.writing (body, type_id, url_slug, title)
SELECT 'A synthetic local writing example.', id, 'local-example', 'A local example'
FROM lis.writing_types WHERE url_slug = 'local-notes';

INSERT INTO lis.writing_me_events_junction (me_events_id, writing_id)
SELECT e.id, w.id FROM lis.me_events e CROSS JOIN lis.writing w
WHERE e.title = 'A local book' AND w.url_slug = 'local-example';
