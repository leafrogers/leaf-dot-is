# Supabase migration workflow

Status: local setup and table baseline verified, 2026-10-30.
Production adopted the table baseline on 2026-11-10 without executing its creation SQL.
The [integration definitions](supabase-integrations.md) are separate, opt-in SQL files. Verification passed on 2026-11-02. Production adoption completed on 2026-11-10.
See the [local development guide](supabase-local-development.md) for commands and verification results.

## Ownership

Both applications use Supabase project `treetrunk` (`zklsoaixtluzvdidyxsh`).
They share one `postgres` database and one `supabase_migrations.schema_migrations` table.
Each repository owns its schema SQL and its local Supabase setup:

| Repository | Owns | Local reset creates |
| --- | --- | --- |
| `leaf-dot-is` | `lis`, Leaf roles, and Leaf integrations | `lis` and its required dependencies |
| `the-greatest-words` | `tgw`, TGW roles, and TGW integrations | `tgw` and its required dependencies |

Neither repository imports the complete migration SQL from the other repository.
Changes to shared extensions, roles, or project configuration require review for both applications.
An individual shared change needs one owning migration. Both repositories must avoid conflicting changes to that object.
Production deployments from either repository must run one at a time.

## Recovered evidence

The sibling backup branch `backup/temp-for-deploy-2-before-runbook-cleanup-20260925` contains commit `533f947`.
Its file `supabase/migrations/20260808000000_me_event_identity_nulls_not_distinct.sql` contains only this marker:

```sql
-- This migration belongs to the lis schema and was applied outside this repository.
-- Supabase migration history is database-wide, so this marker keeps the histories
-- aligned without making this repository responsible for the lis schema.
```

The same branch contains `docs/production-database-runbook.md`.
That runbook requires local reset, database tests, history inspection, baseline adoption, and a dry run before deployment.
It is historical evidence, not a procedure to repeat against the current production database.
Production already records all four TGW migrations that the runbook describes as pending.

The inspected sibling revision `f0ca2fa20348f1f8d9ce64ee5ce291f2372f5a58` lacked the Leaf marker at that time.
This is historical evidence, not a current assessment of TGW.
The owner subsequently instructed us to treat TGW as current and functional unless Leaf changes affect a shared dependency.
The historical inspection did not edit the sibling repository or apply its stashes.

## Original Leaf migration

A read-only production query recovered the original statement for version `20260808000000`.
The [recovered SQL](supabase/recovered-migrations/20260808000000_me_event_identity_nulls_not_distinct.sql) is an archive outside the active migration directory.
The archive adds a final statement delimiter and newline. It otherwise preserves the recorded statement.
The active migration at the same version now contains an identical copy.

The statement rejects duplicate event identities, replaces an older identity constraint, and enforces `UNIQUE NULLS NOT DISTINCT`.
The identity columns are `title`, `title_parent`, `timestamp`, and `type_id`.
If the desired constraint already exists, the statement returns without a schema change.
The statement requires `lis.me_events` and its identity columns to exist first.

The active migration sequence creates those prerequisites before replaying the recovered migration locally.
It uses baseline `20260807000000`, followed by the original migration at its existing version.
The baseline can reproduce the current constraint. The recovered migration then returns without a schema change.
The earlier baseline version requires explicit production adoption after schema comparison.
A normal push would reject that older, unrecorded version.
Neither renumbering the recovered migration nor bypassing this check with `--include-all` establishes a valid baseline.

## Shared history markers

A marker uses the exact version and filename of a migration owned by the other repository.
It contains comments that identify the owner, source commit, and confirmed production application.
The owning repository retains the executable SQL.

Supabase compares migration versions when it reconciles local files with remote history.
An already recorded version is skipped during push.
An absent local version causes reconciliation to fail, even when that version belongs to the other schema.
Schema filters do not create separate histories.
See the [migration list reference](https://supabase.com/docs/reference/cli/supabase-migration-list) and
[push reference](https://supabase.com/docs/reference/cli/supabase-db-push).

Markers reconcile production history without recreating the other application's schema locally.
During a local reset, the CLI processes marker files and records their versions in the local database.
Those local records do not prove that the other application's objects exist.

An unapplied marker is unsafe in a production push.
The CLI can record its version without executing the owner's SQL.
The owning repository then skips that SQL on its next push.
The CLI does not enforce marker ownership. The deployment preflight must enforce it.

### Deployment order

These steps describe the target deployment workflow after baseline adoption.
The current local setup does not authorize production changes.

1. Reserve the deployment window across both repositories.
2. Read production history before you create or update foreign markers.
3. Add markers only for foreign versions already recorded in production.
4. Record the owning repository and source commit in each marker.
5. Run the owning repository's local reset and database checks.
6. Compare local filenames with production history.
7. Reject a push if any foreign marker is absent from production history.
8. Review the SQL for every pending migration.
9. Run `supabase db push --dry-run --linked` with the pinned CLI.
10. Require the pending list to contain only the intended migrations owned by this repository.
11. Apply those migrations from the owning repository.
12. Verify production behavior and the recorded versions.
13. Add acknowledgments in the other repository after successful application.
14. Release the deployment window.

Each repository uses distinct migration timestamps across the shared database.
Applied migration SQL remains immutable. Corrections use a new version.
The dry run lists pending files. It does not execute or validate their SQL.
Automation for the foreign-marker preflight belongs with the deployment tooling in a later step.

## Current history and file comparison

The query on 2026-10-30 returned these five versions.
The comparison used the SQL splitter from the sibling's pinned CLI `2.117.0`.

| Version | Owner | Production statements | Sibling statements | Comparison |
| --- | --- | --- | --- | --- |
| `20260808000000` | Leaf | 1 | No current file | Original SQL recovered. Historical sibling marker found. |
| `20260823000100` | TGW | 27 | 25 | Different SQL |
| `20260823000200` | TGW | 18 | 18 | Different SQL |
| `20260823000300` | TGW | 6 | 6 | Exact parsed statement match |
| `20260823000400` | TGW | 33 | 33 | Exact parsed statement match |

Migration 001 differs in identity types, uniqueness constraints, foreign-key behavior, and the search function definition.
The recorded definitions use `smallint` show IDs and `integer` episode IDs. Current sibling SQL uses `bigint` for both.
Migration 002 records named constraint removals. The current file discovers and removes unique constraints dynamically.
These differences do not establish current production drift: later SQL can change the resulting schema.
They do establish that matching version numbers alone do not prove matching SQL or local parity.
These historical observations do not reopen TGW verification under the owner's current scope.
This repository must not rewrite TGW SQL or repair TGW history to conceal those differences.

## Baseline adoption and reset boundaries

Local resets affect only the selected local development database.
Each repository uses a distinct project ID and ports so both stacks can run together.
Foreign markers remain comments. Synthetic seeds contain no production content or credentials.
External calls, cron jobs, and CDN purges remain inactive locally by default.

Production baseline adoption requires a fresh local replay and a reviewed comparison against the live `lis` catalog.
That comparison includes all six tables, constraints, indexes, policies, grants, and required dependencies.
Only an already equivalent baseline can be marked applied without executing its creation SQL.
History repair changes the ledger, not the database objects.
See the [repair reference](https://supabase.com/docs/reference/cli/supabase-migration-repair).

Never reset the linked production database from either repository.
Never remove foreign production history to make a push succeed.
Never mark a failed migration applied or publish a marker before the owner's successful application.

## Verification

Local verification used Supabase CLI `2.117.0` and a disposable Postgres `17.6` container on 2026-10-30.
The fixture contained migration versions and synthetic tables. It contained no production data or credentials.
The sibling's local stack remained unchanged.

The CLI checks passed:

- A push rejected remote versions without corresponding local files.
- Markers for recorded versions allowed a dry run without changes to objects or history.
- A push applied only the new migration that the fixture owned.
- An unrecorded marker entered the ledger and caused a later push to skip executable SQL at that version.

The recovered Leaf SQL checks also passed:

- Without `lis.me_events`, the statement failed because its prerequisite was absent.
- With duplicate identities, the statement rejected the existing data.
- With an empty table, the statement created the constraint and accepted repeat execution.
- Afterward, the constraint rejected duplicate identities with a `NULL` parent.

Source inspection used CLI commit `21db855916f2c2b12f61cde923a27094b8528b23`, the source for version `2.117.0`.
The [pending migration logic](https://github.com/supabase/cli/blob/21db855916f2c2b12f61cde923a27094b8528b23/apps/cli/src/command-internal/legacy-migration-pending.ts)
compares versions rather than statement checksums.
The [migration application logic](https://github.com/supabase/cli/blob/21db855916f2c2b12f61cde923a27094b8528b23/apps/cli/src/command-internal/legacy-migration-apply.ts)
records comment-only migrations too.

These checks establish CLI behavior and the recovered statement's behavior on synthetic data.
Step 2 subsequently verified a complete local reset and catalog comparison.
The credential-bearing CDN trigger remains an explicit exception. External schedules remain excluded.
No production migration or history repair ran during that local verification.

## Local setup and production adoption

The local setup now includes the pinned CLI, distinct ports, `lis` baseline, original migration, and four foreign markers.
A fresh reset and 13 database checks passed.
The read-only catalog comparison matched schema ownership, relations, columns, constraints, indexes, sequences, policies, functions, and default privileges.
The shared-history preflight verified that production records every foreign marker.
Baseline `20260807000000` entered production history on 2026-11-10. The production dry run then reported no pending migrations.

The [local development guide](supabase-local-development.md) records commands and the integration boundary.
The [integration definitions](supabase-integrations.md) now represent the webhook and schedule without credentials in Git.
Integration verification and the fresh catalog comparison passed on 2026-11-02.
The [production adoption record](supabase-production-adoption.md) records the completed changes and verification results.
TGW is assumed current and functional under the owner's instruction. No TGW schema repair is a prerequisite for this work.
TGW now contains a comment-only marker for the new Leaf baseline version, confirmed in production on 2026-11-10.

The [inventory](supabase-inventory.md) tracks the separate function-source, caller, and credential work.
