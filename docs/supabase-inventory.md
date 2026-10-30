# Supabase inventory and migration ownership

Inventory date: 2026-10-30.

Status: repository and production metadata inspection complete.
Migration ownership and the shared-history workflow are defined in [Supabase migration workflow](supabase-migrations.md).
Function source inspection is complete. The owner confirmed the caller inventory; request inspection remains open.
The [function recovery notes](supabase-functions.md) record deployed authentication and source differences.
The [local setup](supabase-local-development.md) now reproduces the table catalog, with external integrations explicitly excluded.

## Purpose

Part 1 establishes what exists, what uses it, and who owns database migrations.
The inventory will guide the production baseline in part 2.
It does not change production schemas, credentials, functions, or migration history.

## Confirmed repository findings

| Area | Finding | Evidence |
| --- | --- | --- |
| Website database access | Direct Postgres through `postgres-pool` and `PG_CONNECTION_STRING` | `server/config.js`, `server/services.js` |
| Grooklets | Reads `lis.grooklets` | `fetchGrooklets` in `server/services.js` |
| Inhaling | Reads and joins `lis.me_events` and `lis.me_event_types` | `fetchMeEvents` and `fetchMeEventTypes` in `server/services.js` |
| Website writes | No database writes found in the application source | `server/services.js` |
| API keys | No Supabase API client or API-key references found in this repository | Application source and package dependencies |
| Local database | Separate configuration, migrations, synthetic seeds, and database checks now exist | `supabase/`, [local guide](supabase-local-development.md) |
| Development secrets | Development command selects Doppler project `leaf-dot-is`, config `development` | `package.json` |
| Deployment | GitHub Actions deploys to Fly. Compose accepts `PG_CONNECTION_STRING` | `.github/workflows/main.yml`, `compose.yaml` |
| Database tests | Application tests mock Postgres queries | `server/app.test.js` |

The three referenced tables are the application's known dependencies.
They do not establish the complete production schema or its writers.
Prismic supplies Weeknotes separately from Postgres.

## Sibling repository findings

The sibling repository is `../the-greatest-words`.
Its website also uses a direct Postgres connection.
Its migrations define the `tgw` schema, runtime/importer group roles, policies, and cache-purge infrastructure.
Its database tests cover access controls and cache-purge behavior.

The local link metadata names Supabase project `zklsoaixtluzvdidyxsh`.
Its cached Postgres version is `17.6.1.155`.
Live project discovery and both production connection strings now confirm this project and version.

The configured `purge-cdn-cache-tgw-site` function uses named secret-key authentication.
The older `purge-cdn-cache-tgg-episode` source still reads `SUPABASE_ANON_KEY`.
The older function does not appear in the current deployed function list.
Its remaining external callers remain unknown.

## Verified production findings

Both apps use project `treetrunk`, reference `zklsoaixtluzvdidyxsh`, in `eu-west-2`.
They share the `postgres` database on Postgres `17.6.1.155`.
The Leaf production connection uses the pooler as `postgres`.
The Greatest Words production connection uses the same pooler as `tgw_app`.
These findings came from Doppler production connections and read-only catalog queries.
The Fly runtime connections were not inspected independently.

### Schema and access

The complete `lis` table list is:

- `grooklets`
- `me_event_types`
- `me_events`
- `writing`
- `writing_me_events_junction`
- `writing_types`

Each table has an identity sequence.
The schema contains no views or local functions.
The inventory includes columns, defaults, constraints, indexes, policies, owners, grants, and role memberships.
Part 2 must preserve all six tables, including the three writing tables outside current website queries.
Existing duplicate indexes and foreign keys belong in the baseline before any separate cleanup.

The `postgres` role owns the schema and tables and bypasses RLS.
All six tables enable RLS, but none force RLS.
No dedicated Leaf runtime role exists.
The website therefore uses broader permissions than its read-only queries require.

`service_role` has schema usage and table grants.
The table grants allow all standard operations on the three website tables.
They allow SELECT, INSERT, and UPDATE on the three writing tables.
Several SELECT policies target `public`, but policies alone do not grant table or schema access.
No `lis` default privileges appear in the catalog.
The sibling uses `tgw_runtime` and `tgw_importer` group roles with separate login roles.

### Functions, schedules, and webhook

| Deployed function | Version | Gateway JWT verification | Inspection result |
| --- | --- | --- | --- |
| `crawl-me-events` | 44 | Disabled | Downloaded source uses `@supabase/server`, `auth: "secret:automation"`, and an admin client |
| `create-me-event` | 39 | Disabled | Recovered handler checks `API_TOKEN` and uses `SUPABASE_SERVICE_ROLE_KEY`; core Apple Shortcut request needs inspection |
| `read-me-event-types` | 12 | Disabled | Recovered handler checks `API_TOKEN` and uses `SUPABASE_SERVICE_ROLE_KEY`; core Apple Shortcut request needs inspection |
| `create-writing` | 12 | Disabled | Recovered handler checks `API_TOKEN` and uses `SUPABASE_SERVICE_ROLE_KEY`; owner confirms no active caller |
| `purge-cdn-cache-tgw-site` | 1 | Disabled | Sibling source uses named secret-key authentication |

Disabled gateway JWT verification does not establish whether a handler authenticates requests.
The crawler already uses the modern secret-key pattern.
Its source reads books, games, gigs, movies, and music feeds, then upserts `lis.me_events`.
Its conflict target is `title,title_parent,timestamp,type_id`.
The dedicated `../leaf-dot-is-edge-functions` repository contains all four handlers and their shared modules.
Its current source uses named secret keys for all four functions, but production still runs three legacy handlers.
See the [recovery notes](supabase-functions.md) before deployment or key retirement.

The active `run-me-event-crawler` job runs every five minutes and calls `crawl-me-events`.
Its command reads Vault.
Other active jobs are `delete-job-run-details`, `tgw-cache-purge-outbox`, and `tgw-cron-history-cleanup`.
The `purge_cdn_cache_lis_me_events` trigger calls `supabase_functions.http_request()`.
It targets `https://api.bunny.net/purge` and supplies an `AccessKey` header.
Its arguments require secret handling during baseline extraction.
The [key rollout checklist](supabase-key-rollout.md) contains the captured schedule and redacted webhook definition.
The schedule sends `apiKey` from Vault's `CRON_SECRET`; its stored value was not checked.
The webhook runs after each inserted row, with its Bunny credential embedded in the trigger arguments.

Installed extensions include `pg_cron`, `pg_net`, `pg_trgm`, and `supabase_vault`.
The remaining extensions are `hypopg`, `index_advisor`, `pg_stat_statements`, `pgcrypto`, `pgsodium`, `plpgsql`, and `uuid-ossp`.
Vault names include `CRON_SECRET`, a generated `cron-*` name, `tgw_cache_purge_secret_key`, and `tgw_cache_purge_url`.

### Applied migration history

Production records five migrations:

| Version | Name | Repository status |
| --- | --- | --- |
| `20260808000000` | `me_event_identity_nulls_not_distinct` | Original SQL recovered into this repo's documentation archive; historical sibling marker found |
| `20260823000100` | `create_tgw_schema` | Present in the sibling |
| `20260823000200` | `add_episode_repair_outbox` | Present in the sibling |
| `20260823000300` | `dispatch_cache_purge_outbox` | Present in the sibling |
| `20260823000400` | `harden_tgw_access` | Present in the sibling |

The first migration contains one recorded SQL statement, now recovered through a read-only query.
The parsed production SQL exactly matches sibling files 003 and 004.
Files 001 and 002 differ from their production records. The workflow document records the differences.
Part 2 must create the recovered migration's prerequisite objects before replay.
Adding only a later `lis` baseline can leave that older migration unable to run during a fresh reset.
Do not repair history or renumber existing migrations until the complete replay sequence works locally.

### Secret consumers and remaining checks

Leaf's production Doppler configuration supplies `PG_CONNECTION_STRING` and Prismic credentials.
It contains no Supabase API-key variable.
The crawler reads `BOOKS_API_TOKEN`, `BOOKS_API_URL`, `GAMES_API_URL`, `GIGS_ICS_URL`, `MOVIES_API_NAME`, `MOVIES_API_URL`, and `MUSIC_API_URL`.
Edge secret names also include `API_TOKEN`, `DB_SECRET_KEY`, `DB_URL`, `DB_SCHEMA`, and CDN credentials.
Legacy and modern Supabase secret names coexist.
Their presence does not establish active use or key validity.

The three older Leaf handlers still require `API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` in production.
Their callers need coordinated updates before key retirement.
External callers, manual edits, Fly secret names, Doppler integration ownership, and current exposed API schemas also need confirmation.
The authenticator role has no catalog override for exposed schemas; this does not establish the project's API configuration.

## Production inventory to complete

| Area | Information required |
| --- | --- |
| Project identity | Project reference for each production app, and whether both share one database |
| Database version | Current production Postgres major version |
| Schema | All `lis` tables, views, columns, defaults, identities, sequences, constraints, indexes, and types |
| Database behavior | Functions, triggers, extensions, scheduled jobs, and dependencies outside `lis` |
| Access | Object owners, login/group roles, memberships, grants, default privileges, and RLS policies |
| Runtime credentials | Login used by each app, plus inherited privileges and RLS bypass capability |
| Writers | Dashboard edits, scripts, external automations, their target objects, and credentials |
| HTTP integrations | Deployed Edge Functions, webhook callers, authentication methods, and cache-purge targets |
| Secrets | Secret names and their consumers in Doppler, Fly, Edge Functions, and Vault |
| Migration history | Applied migration versions compared with the sibling's four migration files |
| Shared settings | Exposed API schemas and project configuration relevant to either app |

The inventory records secret names and consumers, without recording secret values or connection passwords.
Function definitions, webhook arguments, and scheduled commands can contain embedded credentials.
Any captured definitions need review before entering the repository.

## Migration ownership decision

An account can contain multiple Supabase projects.
Sharing an account alone does not require shared migration history.

Each repository owns its schema SQL and local Supabase setup.
Leaf.is owns `lis`. The Greatest Words owns `tgw`.
Production retains one shared migration history with the existing versions unchanged.
Each repository acknowledges already applied foreign versions with comment-only marker files.
The owning repository applies each migration before the other repository adds its marker.
Production deployments run one at a time across both repositories.
Shared roles, extensions, and project settings require review for both applications.

This decision replaces the earlier recommendation to centralize executable SQL in the sibling or a dedicated database repository.
The recovered sibling marker supports separate schema ownership.
The [workflow](supabase-migrations.md) defines marker checks, baseline adoption, local resets, and the remaining implementation work.

## Access status

Doppler and Supabase authentication now work outside the sandbox.
Production catalog inspection ran inside read-only transactions.
No production schema, credentials, functions, or migration records changed.
The sibling runtime role correctly denied access to migration history; the administrative connection supplied that inventory.

The Supabase CLI downloaded `crawl-me-events` individually.
Downloads of the other Leaf functions failed with `InvalidFunctionDownloadResponseError` and `expected multipart response, got application/octet-stream`.
The same error occurred with the sibling CLI entry point.
A subsequent read-only Management API download recovered all four bundles.
The [recovery notes](supabase-functions.md) record their hashes, handler authentication, source repository, and remaining caller checks.

## Completion criteria

- Establish the production project identity for both apps.
- Complete the schema, access, writer, and integration inventory.
- Compare applied production migrations with the repository files. Done, with differences recorded for TGW files 001 and 002.
- Establish schema ownership and production deployment order. Done in the migration workflow.
- Define local setup and CI inputs. This repository owns `lis` SQL and acknowledges applied TGW versions with markers.
- Identify every object and integration that part 2 must capture.

## References

- [Supabase CLI: database migrations and history](https://supabase.com/docs/reference/cli/supabase-db-push)
- [Supabase CLI: pulling existing schemas](https://supabase.com/docs/reference/cli/supabase-db-pull)
- [Supabase: local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
