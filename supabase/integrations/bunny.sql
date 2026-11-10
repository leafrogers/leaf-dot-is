-- Explicit opt-in. Apply as postgres in a transaction after review.
-- Requires the existing Supabase webhook function and a provisioned Vault key.
-- Preserves the existing webhook payload, hook tracking, and INSERT-only behavior.
-- The key remains visible in pg_trigger arguments, as in the existing deployment.
DO $integration$
DECLARE
  access_key text;
BEGIN
  SELECT decrypted_secret INTO STRICT access_key
  FROM vault.decrypted_secrets WHERE name = 'lis_bunny_access_key';

  IF access_key IS NULL OR btrim(access_key) = '' THEN
    RAISE EXCEPTION 'lis_bunny_access_key must contain the Bunny account API key';
  END IF;

  DROP TRIGGER IF EXISTS purge_cdn_cache_lis_me_events ON lis.me_events;
  EXECUTE format(
    'CREATE TRIGGER purge_cdn_cache_lis_me_events
      AFTER INSERT ON lis.me_events FOR EACH ROW
      EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    'https://api.bunny.net/purge?url=https://www.leaf.is/inhaling&async=false',
    'POST',
    jsonb_build_object('Content-type', 'application/json', 'AccessKey', access_key)::text,
    '{}',
    '5000'
  );
END
$integration$;
