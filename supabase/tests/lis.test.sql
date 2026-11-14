BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(18);

SELECT tables_are('lis', ARRAY['grooklets', 'me_event_types', 'me_events', 'writing', 'writing_me_events_junction', 'writing_types']);
SELECT ok((SELECT bool_and(relrowsecurity AND NOT relforcerowsecurity)
  FROM pg_class WHERE relnamespace = 'lis'::regnamespace AND relkind = 'r'), 'All lis tables enable RLS without forcing it');
SELECT ok(to_regnamespace('tgw') IS NULL, 'Foreign markers do not create TGW objects');
SELECT ok(NOT has_schema_privilege('anon', 'lis', 'USAGE'), 'Anonymous clients have no lis schema access');
SELECT ok(NOT has_schema_privilege('authenticated', 'lis', 'USAGE'), 'Authenticated clients have no lis schema access');
SELECT ok((SELECT bool_and(has_table_privilege('service_role', 'lis.me_events', privilege))
  FROM unnest(ARRAY['INSERT', 'UPDATE', 'SELECT']) AS privilege), 'Service role retains event access');
SELECT ok(NOT has_table_privilege('service_role', 'lis.writing', 'DELETE'), 'Writing grants do not permit service role deletion');
SELECT is((SELECT count(*)::integer FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relnamespace = 'lis'::regnamespace AND NOT t.tgisinternal), 0, 'No external webhook runs locally');

INSERT INTO lis.me_event_types (type, type_short, grouping_threshold)
VALUES ('Database test', 'database-test', 60);
INSERT INTO lis.me_events (type_id, "timestamp", title, title_parent)
SELECT id, '2026-01-01T00:00:00Z', 'Database test event', NULL
FROM lis.me_event_types WHERE type_short = 'database-test';
SELECT throws_ok($$INSERT INTO lis.me_events (type_id, "timestamp", title, title_parent)
  SELECT id, '2026-01-01T00:00:00Z', 'Database test event', NULL
  FROM lis.me_event_types WHERE type_short = 'database-test'$$,
  '23505', NULL, 'Duplicate event identities with NULL parents are rejected');
SELECT throws_ok($$INSERT INTO lis.me_events (type_id, "timestamp", title)
  VALUES (-32768, now(), 'Invalid type')$$,
  '23503', NULL, 'Event types require an existing foreign key');
SELECT throws_ok(format('INSERT INTO lis.me_events (type_id, timestamp, title, %I)
  SELECT id, now(), %L, 10 FROM lis.me_event_types WHERE type_short = %L',
  rating, 'Invalid ' || rating, 'database-test'),
  '23514', NULL, rating || ' rejects 10')
FROM unnest(ARRAY['spoons_during', 'tension_during', 'inertia_during', 'mood_during', 'sensory_overwhelm_during']) AS rating;
SELECT lives_ok($$INSERT INTO lis.me_events (type_id, timestamp, title,
  spoons_during, tension_during, inertia_during, mood_during, sensory_overwhelm_during)
  SELECT id, now(), 'Upper allowed ratings', 9, 9, 9, 9, 9
  FROM lis.me_event_types WHERE type_short = 'database-test'$$,
  'All five rating columns accept 9');
SELECT throws_ok($$DELETE FROM lis.me_event_types WHERE type_short = 'database-test'$$,
  '23503', NULL, 'Referenced event types cannot be deleted');
UPDATE lis.me_event_types SET id = -32767 WHERE type_short = 'database-test';
SELECT is((SELECT count(*)::integer FROM lis.me_events WHERE type_id = -32767), 2,
  'Event type ID updates cascade to both child events');

SELECT * FROM finish();
ROLLBACK;
