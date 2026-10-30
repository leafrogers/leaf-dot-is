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
Its credential and arguments never enter a repository file.
There is no replacement webhook or placeholder credential.
Local event inserts, updates, and deletes therefore send no CDN requests.

The baseline also excludes cron jobs and Vault contents.
It schedules no crawler, CDN requests, or shared maintenance jobs.
The local setup does not reproduce deployed Edge Functions or their external callers.
Those sources and credentials remain separate follow-up work.

This boundary means table parity is possible before integration parity.
Production baseline adoption remains pending until the webhook and schedule definitions have a reviewed, credential-free representation.
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
The sole unrecorded local version was baseline `20260807000000`, which remains pending adoption.
TGW's running local stack remained unchanged throughout verification.

## Production adoption remains pending

This work does not link the repository, push migrations, repair history, or change production configuration.
The production ledger lacks `20260807000000` because this is a new baseline for existing objects.
A normal production push rejects that earlier, unrecorded version.
Do not use `--include-all` to execute its creation SQL against existing tables.

Before any production adoption:

1. Complete the integration representation and review its intended differences.
2. Reserve a deployment window across both repositories.
3. Repeat the local reset and database tests.
4. Repeat the production catalog comparison through a read-only connection.
5. Compare every local migration version with the production ledger.
6. Reject any foreign marker whose version is absent from production.
7. Reject any production version without a corresponding local file.
8. Review every difference and pending migration.
9. Obtain approval for the exact history change after this review.

An approved adoption can mark an equivalent baseline applied without executing its creation SQL.
The intended repair affects only version `20260807000000`.
It must preserve all existing Leaf and TGW history.
After adoption, verify the ledger and require a dry run to report no pending SQL.
See the [CLI repair reference](https://supabase.com/docs/reference/cli/supabase-migration-repair).
No repair command belongs in the local startup or reset scripts.
