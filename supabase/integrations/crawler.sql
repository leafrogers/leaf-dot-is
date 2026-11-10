-- Explicit opt-in. Apply as postgres in a transaction after review.
-- Requires existing pg_cron, pg_net, and the modern automation key in Vault.
-- Does not invoke the crawler. Do not include in local reset or seed scripts.
DO $integration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'CRON_SECRET' AND starts_with(decrypted_secret, 'sb_secret_')
  ) THEN
    RAISE EXCEPTION 'CRON_SECRET must contain the modern automation key';
  END IF;

  PERFORM cron.schedule(
    'run-me-event-crawler',
    '*/5 * * * *',
    $command$
      SELECT net.http_get(
        url := 'https://zklsoaixtluzvdidyxsh.supabase.co/functions/v1/crawl-me-events',
        headers := jsonb_build_object(
          'apiKey',
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET')
        ),
        timeout_milliseconds := 5000
      );
    $command$
  );
END
$integration$;
