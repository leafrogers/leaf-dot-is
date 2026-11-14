# Leaf database integrations

The SQL in `supabase/integrations/` records Leaf's external integrations separately from its table migrations.
Local startup, reset, and seed commands never run these files.
TGW integrations remain under TGW ownership.

Status: isolated checks and the read-only production comparison passed on 2026-11-02.
Production credential provisioning and baseline adoption completed on 2026-11-10.

## Preserved behavior

| Integration | Definition | Behavior |
| --- | --- | --- |
| Crawler | `crawler.sql` | Active job `run-me-event-crawler`; every five minutes; GET; timeout 5000 milliseconds |
| CDN purge | `bunny.sql` | `AFTER INSERT` on each `lis.me_events` row; POST; timeout 5000 milliseconds |

The crawler reads `CRON_SECRET` from Vault for each request and supplies it in the `apiKey` header.
This value is the modern Supabase `automation` key, confirmed during the completed API-key migration.
Installation updates the named job instead of creating another job.
Installation does not invoke the crawler.

The CDN request targets `https://api.bunny.net/purge?url=https://www.leaf.is/inhaling&async=false`.
A read-only production inspection confirmed this target on 2026-11-02.
The trigger uses the existing `supabase_functions.http_request()` function.
That function sends the inserted row and webhook metadata as JSON and records the request in `supabase_functions.hooks`.
The `{}` trigger argument supplies query parameters. It does not specify an empty request body.
Updates and deletes do not invoke this trigger.

## Credentials

No SQL file contains a credential value.
The required Vault names are:

| Name | Provisioning |
| --- | --- |
| `CRON_SECRET` | Existing modern `automation` key; retain its current value |
| `lis_bunny_access_key` | Bunny account API key, copied from the current Leaf trigger during adoption |

`adopt-bunny-key.sql` copies the existing trigger key into Vault without returning it to the client.
Repeat execution accepts an identical stored key and rejects a different key.
It does not overwrite an existing credential or change the trigger.
For a fresh environment, provision these Vault names through an administrator connection before installation.
Use parameterized queries or the Vault dashboard. Do not paste values into repository files or shell arguments.

`bunny.sql` reads its key from Vault during installation and builds the same trigger arguments as production.
The database still stores the plaintext key in `pg_trigger.tgargs`, as it does today.
Vault does not remove that existing exposure, and this setup does not change database access controls.
After a Bunny key rotation, repeat installation to refresh the trigger arguments.
A future trigger function can read Vault for each request, but that requires a separate behavior and permissions review.
The [Vault documentation](https://supabase.com/docs/guides/database/vault) describes encrypted storage and the decrypted view.
The [webhook documentation](https://supabase.com/docs/guides/database/webhooks) describes the generated payload.

## Review and production adoption

These files remain outside active migration history to preserve the verified table baseline and local integration boundary.
They are explicit integration setup procedures, not additional history markers.
Future integration changes require reviewed SQL and deployment evidence alongside the schema migration workflow.

Production already runs both integrations. Definition capture alone does not require reinstallation.
The completed adoption window used this procedure:

1. Repeat the local reset, database checks, and read-only production comparison.
2. Review the baseline history repair separately from the integration setup.
3. Compare the live job and trigger with these definitions before any replacement.
4. Run `adopt-bunny-key.sql` through an administrator connection in one transaction.
5. Verify the stored key matches the trigger without returning either value.
6. Record the provisioning result without recording credentials.

An integration restore uses `crawler.sql` and `bunny.sql` in a single administrator transaction after credential provisioning.
The database must already provide `pg_cron`, `pg_net`, Vault, and `supabase_functions.http_request()`.
These scripts do not create or change shared extensions.
They do not alter TGW jobs, functions, credentials, or migration history.
The crawler installation enables the named schedule. The Bunny installation enables the insert trigger.

## Isolated verification

`supabase/integrations/test.sql` uses synthetic credentials and stub dependencies in an empty disposable database.
It never loads `pg_net` or sends HTTP requests.
The checks cover credential decoding, repeat installation, trigger identity, inserted-row forwarding, and the crawler schedule.

With Leaf's local Docker database running:

```sh
npm run db:test:integrations
```

The runner creates a unique disposable database and removes it and its copied fixtures after success or failure.
The test transaction rolls back its fixtures.
Do not run this fixture against production or the application database.

## Verification results

Verification on 2026-11-02 passed all seven assertions and three expected credential rejections in the disposable database.
The checks preserved trigger arguments, function identity, enabled mode, and event timing after repeat installation.
The test database was removed afterward.
These checks use stub dependencies; they do not demonstrate a successful Bunny request or crawler invocation.

A fresh Leaf reset then replayed all six migrations and loaded the synthetic seed.
All 13 database checks passed.
The read-only production comparison matched all nine catalog sections, with the deliberately omitted CDN trigger as the sole trigger difference.
The shared-history preflight found every TGW marker already applied and every production version represented locally.
At that verification, only baseline `20260807000000` was unrecorded in production.

The final production inspection matched the crawler command, active schedule, purge URL, headers, method, timeout, and trigger function.
It also verified the modern key prefix in `CRON_SECRET` without returning the credential.
At that inspection, Vault did not contain `lis_bunny_access_key`. Adoption provisioned it on 2026-11-10.
No production write, integration invocation, or history repair ran during verification.

The [production adoption record](supabase-production-adoption.md) records successful provisioning and baseline adoption.
Both integrations retained their existing definitions. The stored Bunny key matches the trigger key.
