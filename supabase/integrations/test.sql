-- Run only in an empty disposable database, never the application database.
-- All integration dependencies below are local fixtures. No HTTP extension runs.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA lis;
CREATE TABLE lis.me_events (id integer PRIMARY KEY, title text);
CREATE SCHEMA vault;
CREATE TABLE vault.decrypted_secrets (name text UNIQUE, decrypted_secret text);
CREATE FUNCTION vault.create_secret(secret text, name text, description text)
RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO vault.decrypted_secrets VALUES (name, secret);
  RETURN '00000000-0000-0000-0000-000000000001';
END $$;
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobname text PRIMARY KEY, schedule text, command text);
CREATE FUNCTION cron.schedule(name text, schedule text, command text)
RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cron.job VALUES (name, schedule, command)
  ON CONFLICT (jobname) DO UPDATE SET schedule = excluded.schedule, command = excluded.command;
  RETURN 1;
END $$;
CREATE SCHEMA supabase_functions;
CREATE TABLE supabase_functions.calls (arguments text[], record jsonb);
CREATE FUNCTION supabase_functions.http_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO supabase_functions.calls VALUES (TG_ARGV, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE FUNCTION pg_temp.assert(condition boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', message; END IF;
END $$;

-- A missing key must fail before replacing an existing trigger.
CREATE TRIGGER purge_cdn_cache_lis_me_events AFTER INSERT ON lis.me_events
FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('original');
SAVEPOINT missing_key;
\set ON_ERROR_STOP off
\ir bunny.sql
\if :ERROR
\else
  \echo 'FAIL: Missing Bunny key was accepted'
  \quit 1
\endif
ROLLBACK TO missing_key;
\set ON_ERROR_STOP on
SELECT pg_temp.assert((SELECT tgnargs = 1 FROM pg_trigger
  WHERE tgrelid = 'lis.me_events'::regclass AND NOT tgisinternal), 'Missing key preserves the existing trigger');

-- Quotes, backslashes, and Unicode must survive bytea decoding and SQL quoting.
DO $$
BEGIN
  DROP TRIGGER purge_cdn_cache_lis_me_events ON lis.me_events;
  EXECUTE format('CREATE TRIGGER purge_cdn_cache_lis_me_events AFTER INSERT ON lis.me_events
    FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    'https://api.bunny.net/purge?url=https://www.leaf.is/inhaling&async=false', 'POST',
    jsonb_build_object('Content-type', 'application/json', 'AccessKey', E'synthetic-''quote\\slash-☕')::text,
    '{}', '5000');
END $$;
CREATE TEMP TABLE original_trigger AS SELECT tgargs, tgtype, tgenabled, tgfoid FROM pg_trigger
WHERE tgrelid = 'lis.me_events'::regclass AND NOT tgisinternal;
\ir adopt-bunny-key.sql
\ir adopt-bunny-key.sql
SELECT pg_temp.assert((SELECT count(*) = 1 AND min(decrypted_secret) = E'synthetic-''quote\\slash-☕'
  FROM vault.decrypted_secrets WHERE name = 'lis_bunny_access_key'), 'Key adoption is exact and repeatable');
SAVEPOINT mismatched_key;
UPDATE vault.decrypted_secrets SET decrypted_secret = 'different-synthetic-key'
WHERE name = 'lis_bunny_access_key';
\set ON_ERROR_STOP off
\ir adopt-bunny-key.sql
\if :ERROR
\else
  \echo 'FAIL: Mismatched Bunny key was accepted'
  \quit 1
\endif
ROLLBACK TO mismatched_key;
\set ON_ERROR_STOP on
\ir bunny.sql
\ir bunny.sql
SELECT pg_temp.assert((SELECT count(*) = 1 AND bool_and(
  t.tgargs = o.tgargs AND t.tgtype = o.tgtype AND t.tgenabled = o.tgenabled AND t.tgfoid = o.tgfoid)
  FROM pg_trigger t CROSS JOIN original_trigger o
  WHERE t.tgrelid = 'lis.me_events'::regclass AND NOT t.tgisinternal), 'Webhook definition remains identical after repeat installation');
INSERT INTO lis.me_events VALUES (1, 'Insert');
UPDATE lis.me_events SET title = 'Update' WHERE id = 1;
DELETE FROM lis.me_events WHERE id = 1;
SELECT pg_temp.assert((SELECT count(*) = 1 AND min(record ->> 'title') = 'Insert'
  FROM supabase_functions.calls), 'Only inserts invoke the existing webhook function');

INSERT INTO vault.decrypted_secrets VALUES ('CRON_SECRET', 'synthetic-legacy-key');
SAVEPOINT legacy_key;
\set ON_ERROR_STOP off
\ir crawler.sql
\if :ERROR
\else
  \echo 'FAIL: Legacy crawler key was accepted'
  \quit 1
\endif
ROLLBACK TO legacy_key;
\set ON_ERROR_STOP on
SELECT pg_temp.assert((SELECT count(*) = 0 FROM cron.job), 'Invalid crawler credential creates no schedule');
UPDATE vault.decrypted_secrets SET decrypted_secret = 'sb_secret_synthetic' WHERE name = 'CRON_SECRET';
\ir crawler.sql
\ir crawler.sql
SELECT pg_temp.assert((SELECT count(*) = 1 AND min(schedule) = '*/5 * * * *'
  AND min(command) LIKE '%crawl-me-events%'
  AND min(command) LIKE '%CRON_SECRET%'
  AND min(command) NOT LIKE '%sb_secret_synthetic%'
  FROM cron.job WHERE jobname = 'run-me-event-crawler'), 'Crawler schedule is repeatable and reads its credential at runtime');
-- There is deliberately no net schema: installation cannot invoke HTTP.
SELECT pg_temp.assert(to_regnamespace('net') IS NULL, 'No network dependency runs during setup');
-- Execute the stored command against a local HTTP recorder, never a network extension.
CREATE SCHEMA net;
CREATE TABLE net.calls (url text, headers jsonb, timeout_milliseconds integer);
CREATE FUNCTION net.http_get(url text, headers jsonb, timeout_milliseconds integer)
RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO net.calls VALUES (url, headers, timeout_milliseconds);
  RETURN 1;
END $$;
DO $$
BEGIN
  EXECUTE (SELECT command FROM cron.job WHERE jobname = 'run-me-event-crawler');
END $$;
SELECT pg_temp.assert((SELECT count(*) = 1 AND bool_and(
  url = 'https://zklsoaixtluzvdidyxsh.supabase.co/functions/v1/crawl-me-events'
  AND headers = '{"apiKey":"sb_secret_synthetic"}'::jsonb
  AND timeout_milliseconds = 5000) FROM net.calls), 'Stored crawler command uses the exact URL, headers and timeout');
UPDATE vault.decrypted_secrets SET decrypted_secret = 'sb_secret_rotated' WHERE name = 'CRON_SECRET';
TRUNCATE net.calls;
DO $$
BEGIN
  EXECUTE (SELECT command FROM cron.job WHERE jobname = 'run-me-event-crawler');
END $$;
SELECT pg_temp.assert((SELECT count(*) = 1 AND bool_and(headers = '{"apiKey":"sb_secret_rotated"}'::jsonb)
  FROM net.calls), 'Stored crawler command reads the current credential at execution');
ROLLBACK;
