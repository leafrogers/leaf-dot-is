# Supabase function recovery and key migration

Inspection date: 2026-10-30.
Project: `treetrunk` (`zklsoaixtluzvdidyxsh`).

## Source ownership

The dedicated repository, `../leaf-dot-is-edge-functions`, contains all four Leaf function handlers and their shared modules.
Its remote is `git@github.com:leafrogers/leaf-dot-is-edge-functions.git`.
The inspected commit is `40dc7eb926843cb134534878cbeb1c70a35a4c8f`.
All relative TypeScript imports resolve to files in that repository.
The initial inspection did not run its tests. Local preparation and validation followed; see the results below.

Keep function implementation and deployment in that repository for now.
This website repository owns the `lis` database migrations and local database setup.
The function repository also contains the original `20260808000000` SQL file.
That historical copy does not establish a second migration deployment owner.
The [migration workflow](supabase-migrations.md) governs the shared production ledger.

## Deployed authentication

The deployed source differs from the dedicated repository's current source.
Disabled gateway JWT verification alone does not establish handler authentication.

| Function | Deployed version | Deployed inbound authentication | Deployed database access | Current repository source |
| --- | --- | --- | --- | --- |
| `crawl-me-events` | 44 | Named `automation` secret through `@supabase/server` | Admin client, `lis.me_events` upsert | Same authentication; later persistence and crawler changes |
| `create-me-event` | 39 | `Authorization` header compared with `API_TOKEN`, after removal of `Bearer ` | `SUPABASE_SERVICE_ROLE_KEY`, `lis.me_events` upsert | Named `automation` secret and admin client |
| `read-me-event-types` | 12 | Same `API_TOKEN` comparison | `SUPABASE_SERVICE_ROLE_KEY`, `lis.me_event_types` SELECT | Named `automation` secret and admin client |
| `create-writing` | 12 | Same `API_TOKEN` comparison | `SUPABASE_SERVICE_ROLE_KEY`, `lis.writing` upsert | Named `automation` secret and admin client |

All four deployed functions have gateway JWT verification disabled.
The three older handlers also read `SUPABASE_URL`.
Their source establishes an active dependency on the legacy service-role key.
The presence of newer code in Git does not remove that production dependency.

The current repository source uses `auth: "secret:automation"` for all four handlers.
Its README requires callers to send the named secret in the `apikey` header.
It uses `SUPABASE_SECRET_KEYS` for named keys.
The deployed key values and caller credentials were not tested during this inspection.

## Deployment differences

The initial inspection at `40dc7eb` found these differences beyond authentication:

- Shared persistence replaces the crawler's inline upsert and the older event handler's upsert.
- HTTP helpers return JSON responses and accept JSON content types with parameters.
- The event handler uses extracted input parsing and event conversion.
- Empty event titles and parent titles remain empty strings; production converts them to `NULL`.
- Event parsing rejects non-digit `stimsNumber` values that the production parser accepts.
- The crawler source adds completed-book events and changes book activity selection.
- The source uses `@supabase/server@^1.4.1`; the deployed crawler imports `@supabase/server@1`.

Commit `5a91db1` restores exact JSON content types, `NULL` titles, and the deployed STIMS parsing.
The remaining differences still require review before deployment.

Review these changes in the function repository before deployment.
Keep unrelated crawler changes out of an authentication deployment unless their behavior is also approved.
Check response consumers as well as request headers during caller migration.

## Known callers and integrations

| Consumer | Evidence | Remaining check |
| --- | --- | --- |
| Crawler schedule | Active `run-me-event-crawler` job sends `apiKey` from Vault's `CRON_SECRET` every five minutes | Check stored key validity without invoking the crawler during inspection |
| Event-type reads | Owner reports one core Apple Shortcut, used by specialized Shortcuts | Inspect its request, preserve the JSON array response, and check dependent Shortcuts |
| Manual event creation | Owner reports one core Apple Shortcut, used by specialized Shortcuts; only the success status is consumed | Inspect its request and preserve HTTP `201` |
| Bruno requests | `../bruno-collections/Leaf.is/Event types.bru` and `../TGG/asdf copy.bru` call `https://api.leaf.is/event-types` with an Authorization header | Confirm the exact Bunny route and update these saved requests during deployment |
| Writing creation | Owner confirms this is unused work in progress with no active caller | No caller update required for authentication migration |
| Website | Direct Postgres queries through `PG_CONNECTION_STRING`; owner reports it is the only Me Event reader | No function caller or Supabase API-key dependency found |

The owner confirmed the caller map on 2026-10-30.
The Shortcuts share one Apple account across an iPhone, a personal laptop, and a work laptop.
Only these Shortcuts and the scheduled crawler write Me Events.
The event-creation Shortcut does not consume the response body.
The current source's JSON success body is compatible if the successful status remains `201`.
Check both core Shortcuts and their specialized callers after the changes reach each device.

An unauthenticated GET to the Bruno URL returned `401 Unauthorized` on 2026-10-30.
Response headers identified Bunny CDN, Supabase Edge Runtime, and project `zklsoaixtluzvdidyxsh`.
This response supports the suspected route, but does not establish the exact target function or header forwarding configuration.
The repository search covered the personal repositories, excluding dependencies, build output, environment files, and Git internals.
The owner subsequently identified the Apple Shortcuts as the active manual Me Event callers.
Do not copy caller credential values into documentation.

The [rollout checklist](supabase-key-rollout.md) records the caller questions, compatibility checks, and redacted integration definitions.

## Recovery evidence

The Supabase CLI rejected the three older downloads because it expected multipart content and received `application/octet-stream`.
The Management API returned all four deployed bodies as ESZIP bundles.
The recovery used the read-only [function body endpoint](https://supabase.com/docs/reference/api/v1-get-a-function-body).
The extraction followed the [official ESZIP parser](https://github.com/denoland/eszip/blob/v0.100.0/src/v2.rs).
The saved bundles specify no internal checksum.
The following SHA-256 values identify the downloaded bytes.
They do not establish equality with the source repository.

| Function | Bundle format | SHA-256 |
| --- | --- | --- |
| `crawl-me-events` | ESZIP 2.3 | `ba3c6be06ff0c49aab35c875034f093c5085dc581e9f808afebbcef99e613513` |
| `create-me-event` | ESZIP 2.2 | `6774ff9ae79c7acf3c0aa9efe81b7beb401a050554d23aa48873ee8b8544e4f6` |
| `read-me-event-types` | ESZIP 2.2 | `84fe5701ea86a411f2d295e5b3097c79d577bd116ac03f66ba655dbb202c3520` |
| `create-writing` | ESZIP 2.2 | `cad9aac41290c99a35334f58869c1bb793b0dfe631f14382cba199ab997e1283` |

The bundles and extracted modules remain outside Git in temporary recovery files.
This document records their findings without dependency bundles or credentials.
The extraction establishes handler behavior; it does not reproduce the deployed runtime.

## Local preparation

The dedicated function repository now has compatibility fixes and handler authentication tests.
These changes are committed as `5a91db1` (`fix: preserve deployed event request behaviour`).
Validation passed: 28 tests with 33 steps, type checking, and checks for the changed code.
The crawler was not changed or deployed.
See the [preparation results](supabase-key-rollout.md#local-preparation-results) for coverage and remaining deployment checks.

## Next steps

1. Inspect the two core Shortcut requests and check the routing behind `api.leaf.is`.
2. Review the authentication deployment in the function repository, including request and response compatibility.
3. Resolve the CDN purge target and secret provisioning from the captured, redacted integration definitions.
4. Test actual caller requests and database behavior in an isolated environment; verify deployable rollback source.
5. Coordinate function deployment and caller updates with a rollback plan.
6. Check that no remaining Leaf or TGW consumer requires legacy keys before retirement.

Production baseline adoption remains a separate task.
It requires the integration definitions and a fresh catalog comparison before any migration-history repair.
No function deployment, credential change, or production history repair ran during this recovery.
