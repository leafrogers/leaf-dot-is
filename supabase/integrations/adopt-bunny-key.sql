-- One-time provisioning from the existing production trigger into Vault.
-- Does not print the key, change the trigger, or send a network request.
-- Run as postgres in a transaction. Never enable statement/result tracing.
DO $provision$
DECLARE
  arguments text[] := ARRAY[]::text[];
  raw_arguments bytea;
  separator integer;
  access_key text;
  stored_key text;
BEGIN
  SELECT tgargs INTO STRICT raw_arguments
  FROM pg_trigger
  WHERE tgrelid = 'lis.me_events'::regclass
    AND tgname = 'purge_cdn_cache_lis_me_events' AND NOT tgisinternal;

  -- PostgreSQL text cannot contain NUL. Split the bytea before decoding each field.
  WHILE octet_length(raw_arguments) > 0 LOOP
    separator := position(decode('00', 'hex') IN raw_arguments);
    IF separator = 0 THEN
      RAISE EXCEPTION 'The existing trigger arguments are malformed';
    END IF;
    arguments := array_append(arguments, convert_from(substring(raw_arguments FROM 1 FOR separator - 1), 'UTF8'));
    raw_arguments := substring(raw_arguments FROM separator + 1);
  END LOOP;

  access_key := arguments[3]::jsonb ->> 'AccessKey';
  IF access_key IS NULL OR btrim(access_key) = '' THEN
    RAISE EXCEPTION 'The existing Bunny trigger has no AccessKey';
  END IF;

  SELECT decrypted_secret INTO stored_key
  FROM vault.decrypted_secrets WHERE name = 'lis_bunny_access_key';
  IF FOUND THEN
    IF stored_key IS DISTINCT FROM access_key THEN
      RAISE EXCEPTION 'The stored Bunny key differs from the existing trigger';
    END IF;
  ELSE
    PERFORM vault.create_secret(access_key, 'lis_bunny_access_key', 'Leaf CDN purge credential');
  END IF;
END
$provision$;
