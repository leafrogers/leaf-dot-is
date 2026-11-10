# Local Supabase development

Leaf owns the `lis` schema. TGW owns `tgw` in a separate repository.
Both repositories share production migration history, but their local databases remain separate.
See the [migration workflow](supabase-migrations.md) for ownership and deployment rules.

## Start locally

Install Node 24 and start Docker before these commands.
The CLI is pinned to `2.117.0`, matching TGW.
Supabase recommends a [pinned development dependency](https://supabase.com/docs/guides/local-development/cli/getting-started).

```sh
npm ci
npm run db:start
npm run db:test
```

| Service | Leaf | TGW |
| --- | --- | --- |
| Project ID | `leaf-dot-is` | `the-greatest-words` |
| Database | `55322` | `54322` |
| Shadow database | `55320` | `54320` |
| API | `55321` | `54321` |
| Studio | `55323` | `54323` |

Open Studio at <http://127.0.0.1:55323>.
The local database URL is `postgresql://postgres:postgres@127.0.0.1:55322/postgres`.
These credentials belong only to the local development database.
Auth, Storage, Realtime, Edge Functions, and analytics are disabled in this configuration.
This configuration is local only. Do not push it to the shared production project.
The Data API schema list retains the CLI defaults. The website uses direct Postgres access to `lis`.

To use the local database with the website, override the connection after Doppler supplies the other development variables:

```sh
doppler run -p leaf-dot-is -c development -- env \
  PG_CONNECTION_STRING=postgresql://postgres:postgres@127.0.0.1:55322/postgres \
  npm run start:watch
```

The override applies only to this process. It does not change Doppler.
Prismic still uses the existing development configuration.

## Reset and verify

The reset command explicitly selects the local database. It replaces local data with synthetic examples.

```sh
npm run db:reset
npm run db:test
```

The seed covers all six tables with invented content.
It contains no production rows, personal event history, or credentials.
The database tests run in a transaction and roll back their fixtures.
They cover event identity uniqueness, foreign keys, rating bounds, RLS, grants, and integration isolation.

To stop Leaf's stack while retaining its local data:

```sh
npm run db:stop
```

Run these commands from this repository. They select the `leaf-dot-is` project and leave TGW's stack running.

## Baseline contents

`20260807000000_baseline_lis.sql` captures the production `lis` catalog from 2026-10-30.
Its earlier timestamp supplies prerequisites for the recovered migration at `20260808000000`.
The timestamp specifies replay order. It does not claim that this baseline ran in production on that date.
The recovered migration preserves its original SQL and version.
The baseline already includes the production event identity constraint, so replaying the recovered statement makes no change.

The baseline preserves:

- All six tables, column order, types, defaults, and identity sequence configuration.
- Existing constraints, indexes, and duplicate foreign keys.
- Policies, RLS configuration, ownership, grants, and column comments.

Four comment-only TGW markers acknowledge versions already recorded in production.
They create no TGW schema or functions locally.
Matching their versions does not establish parity for TGW's separate setup.

## Integration boundary

The production trigger `purge_cdn_cache_lis_me_events` embeds a Bunny CDN credential in its arguments.
The baseline omits that trigger entirely.
Its credential never enters a repository file.
Separate [integration definitions](supabase-integrations.md) capture the target and install the trigger using a key from Vault.
Local startup and reset commands never run that opt-in setup.
Local event inserts, updates, and deletes therefore send no CDN requests.

The baseline also excludes cron jobs and Vault contents.
It schedules no crawler, CDN requests, or shared maintenance jobs.
The local setup does not reproduce deployed Edge Functions or their external callers.
The completed API-key rollout records the function sources and caller checks separately.

This boundary means table parity is possible before integration parity.
The separate integration definitions passed verification on 2026-11-02. Production baseline adoption completed on 2026-11-10.
Do not treat this local baseline as a complete production integration backup.

## Compare the catalogs

`supabase/checks/lis-catalog.sql` produces one JSON snapshot from read-only catalog queries.
It includes relations, columns, constraints, indexes, sequence configuration, policies, functions, ownership, grants, and default privileges.
It excludes row data, sequence counters, trigger arguments, and credentials.
Trigger metadata identifies the expected integration difference without exposing its arguments.

For a local snapshot:

```sh
docker exec -i supabase_db_leaf-dot-is \
  psql -X -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
  < supabase/checks/lis-catalog.sql > /tmp/leaf-lis-local.json
```

Obtain a production snapshot through an approved read-only connection.
Run the query inside `BEGIN READ ONLY` and finish with `ROLLBACK`.
Compare parsed JSON objects, rather than relying on output formatting or object key order.
Current sequence values and row counts must differ between production and synthetic local data.

## Verification results

Verification on 2026-10-30 used CLI `2.117.0` and Postgres 17.
A fresh local reset replayed all six migration files and loaded the synthetic seed.
All 13 database checks passed. Application lint, type checks, and 21 application tests also passed.

The read-only production comparison matched all nine catalog sections:

- Schema ownership and grants.
- Relations, RLS, ownership, grants, and comments.
- Visible columns, types, defaults, identity modes, and comments.
- Constraints, indexes, and identity sequence configuration.
- Policies, local functions, and default privileges.

The only trigger difference was the omitted CDN webhook.
The comparison counts visible column positions because production retains gaps from previously removed columns.
Snapshot arrays use explicit C collation to avoid differences from database sorting rules.
This comparison does not establish identical database locales or production data.

The history preflight found all four foreign marker versions already applied in production.
Every production version had a corresponding local file.
The sole unrecorded local version was baseline `20260807000000`. Production adoption recorded it on 2026-11-10.
TGW's running local stack remained unchanged throughout verification.

## Production baseline adoption

Production adoption completed on 2026-11-10 after owner approval.
The CLI marked baseline `20260807000000` applied without executing its creation SQL.
All previous history records and catalog definitions remained unchanged.
The production dry run reported no pending migrations.
TGW received a comment-only acknowledgment for the new shared version.
The [adoption record](supabase-production-adoption.md) contains the procedure and verification results.

The baseline represents existing production objects. Do not execute its creation SQL against the existing database.
Do not use `--include-all` to bypass history checks.
Future migrations use the [migration workflow](supabase-migrations.md).
No repair command belongs in local startup or reset scripts.
