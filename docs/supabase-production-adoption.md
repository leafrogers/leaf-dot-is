# Production baseline adoption review

Status: approved by the owner and completed on 2026-11-10.

## Approved changes

The target is Supabase project `treetrunk`, reference `zklsoaixtluzvdidyxsh`.

1. Copy the existing Leaf Bunny key into Vault as `lis_bunny_access_key`.
2. Mark only Leaf baseline `20260807000000` applied in the shared migration ledger.
3. Verify the resulting ledger and require a migration dry run with no pending files.
4. Add the corresponding comment-only baseline marker in TGW after successful adoption.

The baseline creation SQL did not run against existing production tables.
The current crawler, trigger, credentials, table definitions, and TGW migration records remain unchanged.
The new Vault entry supports restoration through the credential-free integration definitions.
Both existing integrations already match those definitions, so adoption does not require their reinstallation.

## Evidence

- A fresh local reset replayed all six migration files and the synthetic seed.
- All 13 database checks passed.
- Seven isolated integration assertions and three expected credential rejections passed without HTTP requests.
- All nine catalog sections matched production.
- The sole trigger difference is the deliberately omitted local CDN trigger.
- Every foreign marker is already recorded in production.
- Every existing production version has a local file.
- Baseline `20260807000000` is the only local version absent from production history.
- The live crawler and CDN definitions match the prepared integration SQL.
- Before adoption, `CRON_SECRET` used the modern key prefix and `lis_bunny_access_key` was absent.

The [integration guide](supabase-integrations.md) records the verification limits and current credential exposure.

## Adoption procedure

The [local development guide](supabase-local-development.md#production-baseline-adoption) records the completed adoption.
The following procedure records the approved one-time work. Do not repeat it against the adopted production database.

1. Repeat the read-only history and catalog preflight if production changes after this review.
2. Retain the pre-adoption ledger snapshot without row data or credentials.
3. Run `supabase/integrations/adopt-bunny-key.sql` through an administrator connection in one transaction.
4. Verify that its Vault value equals the existing trigger key without returning either value.
5. Use the pinned CLI to mark the baseline applied:

   ```sh
   doppler run -p leaf-dot-is -c production -- sh -c \
     'node_modules/.bin/supabase migration repair 20260807000000 --status applied --db-url "$PG_CONNECTION_STRING"'
   ```

6. Verify that exactly one version entered the ledger and that all previous records remain unchanged.
7. Require this dry run to report no pending migrations:

   ```sh
   doppler run -p leaf-dot-is -c production -- sh -c \
     'node_modules/.bin/supabase db push --dry-run --skip-vault --db-url "$PG_CONNECTION_STRING"'
   ```

8. Add the TGW acknowledgment below after successful ledger verification.
9. Record the adoption results and release the deployment window.

The CLI flags were verified against installed version `2.117.0`.
Use no `--include-all`, seed, role, or configuration push during this procedure.
If any step fails, stop before subsequent writes and inspect the resulting state.
Do not delete existing migration records or rerun the table creation SQL.

## TGW acknowledgment

This new shared ledger entry affects TGW's next migration push.
TGW requires a marker for the new baseline, even though it owns no Leaf objects.
This acknowledgment follows from the Leaf change; it does not reopen TGW's schema or historical migration review.
Keep unrelated TGW working-tree changes intact.

Successful adoption added this file in TGW:

`supabase/migrations/20260807000000_baseline_lis.sql`

```sql
-- Owner: leaf-dot-is; schema: lis. This is a shared-history marker.
-- Source: leaf-dot-is@c4c59f17f98dd650435c3c771e5e9a1310564098.
-- Confirmed in production history on 2026-11-10: 20260807000000.
-- Executable SQL remains in the owning repository. Do not copy it here.
```

Publish no acknowledgment before its version exists in production history.
This file contains no executable SQL and creates no Leaf objects in TGW's local database.

## Adoption results

The owner approved this procedure. Adoption completed on 2026-11-10.
The fresh preflight matched all nine catalog sections and the existing integration definitions.
The Bunny URL comparison allowed equivalent query parameter ordering.
All remote migration versions had local files. Only the new baseline was absent from production history.

The administrator transaction copied the existing Bunny key into `lis_bunny_access_key`.
A comparison verified the stored value without returning either credential.
The pinned CLI marked only `20260807000000` applied.
The resulting ledger contained exactly one additional record. All previous records remained unchanged.
The post-adoption catalog matched the pre-adoption catalog, including trigger metadata.
No integration was reinstalled or manually invoked.

The migration dry run used `--skip-vault` and reported `upToDate: true` with no pending migrations, seeds, or roles.
TGW now contains the comment-only acknowledgment listed above, dated 2026-11-10.
Its unrelated working-tree changes remain intact.
The adoption window is complete.
The Leaf commit titled `chore: record Supabase production adoption` records the adoption and integration definitions.
TGW commit `9d8d27e` records the comment-only baseline acknowledgment.
