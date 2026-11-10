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

## Original deployed authentication: 2026-10-30

This section records the original recovery state. The production deployment update below supersedes its three Shortcut handler versions.

The deployed source differs from the dedicated repository's current source.
Disabled gateway JWT verification alone does not establish handler authentication.

| Function | Deployed version | Deployed inbound authentication | Deployed database access | Current repository source |
| --- | --- | --- | --- | --- |
| `crawl-me-events` | 44 | Named `automation` secret through `@supabase/server` | Admin client, `lis.me_events` upsert | Same authentication; later persistence and crawler changes |
| `create-me-event` | 39 | `Authorization` header compared with `API_TOKEN`, after removal of `Bearer ` | `SUPABASE_SERVICE_ROLE_KEY`, `lis.me_events` upsert | Custom `API_TOKEN` Bearer check and modern admin client |
| `read-me-event-types` | 12 | Same `API_TOKEN` comparison | `SUPABASE_SERVICE_ROLE_KEY`, `lis.me_event_types` SELECT | Custom `API_TOKEN` Bearer check and modern admin client |
| `create-writing` | 12 | Same `API_TOKEN` comparison | `SUPABASE_SERVICE_ROLE_KEY`, `lis.writing` upsert | Custom `API_TOKEN` Bearer check and modern admin client |

All four deployed functions have gateway JWT verification disabled.
The three older handlers also read `SUPABASE_URL`.
Their source establishes an active dependency on the legacy service-role key.
The presence of newer code in Git does not remove that production dependency.

The crawler source retains `auth: "secret:automation"`.
The three Shortcut handlers now retain custom `API_TOKEN` authentication before the Supabase wrapper creates clients.
Their admin clients use the modern server-side secret from `SUPABASE_SECRET_KEYS` (the production `default` entry).
Both core Shortcuts keep their existing Authorization headers.
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
| Crawler schedule | Active `run-me-event-crawler` job sends `apiKey` from Vault's `CRON_SECRET` every five minutes | Audit confirmed that the stored value matches the modern `automation` key; the owner confirmed a scheduled crawl |
| Event-type reads | Screenshot shows GET `/event-types` with Bearer authorization | Preserve the JSON array response and check dependent Shortcuts |
| Manual event creation | Screenshot shows POST `/event` with Bearer authorization and a File body; compares the response with `Created` | Preserve HTTP `201` and plain text `Created`, or update the comparison together |
| Bruno requests | `../bruno-collections/Leaf.is/Event types.bru` and `../TGG/asdf copy.bru` call `https://api.leaf.is/event-types` with an Authorization header | Keep the existing Authorization headers |
| Writing creation | Owner confirms this is unused work in progress with no active caller | No caller update required for authentication migration |
| Website | Direct Postgres queries through `PG_CONNECTION_STRING`; owner reports it is the only Me Event reader | No function caller or Supabase API-key dependency found |

The owner confirmed the caller map on 2026-10-30.
The Shortcuts share one Apple account across an iPhone, a personal laptop, and a work laptop.
Only these Shortcuts and the scheduled crawler write Me Events.
Screenshots reviewed on 2026-10-31 correct the initial status-only caller report.
Send Event compares the response body with `Created` and shows any different response.
The function source now preserves plain text `Created` for event creation.
Its handler test checks the exact response body; the follow-up fix was deployed on 2026-11-01.
Check both core Shortcuts and their specialized callers after the changes reach each device.

An unauthenticated GET to the Bruno URL returned `401 Unauthorized` on 2026-10-30.
Response headers identified Bunny CDN, Supabase Edge Runtime, and project `zklsoaixtluzvdidyxsh`.
The Bunny screenshot shows the origin `https://zklsoaixtluzvdidyxsh.supabase.co/functions/v1` with no Host header override.
The enabled Edge Rules map `/event`, `/event-types`, and `/writing` to `create-me-event`, `read-me-event-types`, and `create-writing` respectively.
An enabled Block Request rule matches URLs outside those three public URLs.
On 2026-10-31, the owner confirmed that these endpoints are not cached and have no header forwarding rules.
For rollout planning, assume all request headers, including `Authorization`, reach the origin.
Verify authenticated requests through Bunny after deployment.
Send Event uses a File body without an explicit Content-Type header in the screenshot.
Completed synthetic captures confirmed exact `application/json` and compatible payloads for all three wrappers.
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
A follow-up prepared rollback source and a passing local smoke check in `../leaf-dot-is-edge-functions/rollback/20261030`.
The [isolated Edge Runtime rehearsal](supabase-key-rollout.md#isolated-edge-runtime-rehearsal-2026-11-01) passed on 2026-11-01.
All 35 HTTP assertions and direct database assertions passed for the earlier named-key design and recovered handlers.
Those inbound authentication results do not validate the revised custom-token source.
See the [preparation update](supabase-key-rollout.md#preparation-update-2026-10-31) for dependency and validation limits.

## Local preparation

The dedicated function repository now has compatibility fixes and handler authentication tests.
These changes are committed as `5a91db1` (`fix: preserve deployed event request behaviour`).
Initial validation passed: 28 tests with 33 steps, type checking, and checks for the changed code.
The revised custom-token implementation passed 28 tests with 45 steps and 41 isolated runtime HTTP checks.
The crawler was not changed or deployed.
See the [preparation results](supabase-key-rollout.md#local-preparation-results) for coverage and remaining deployment checks.

## Production deployment update: 2026-11-01

The selected handlers are deployed: `create-me-event` version `40`, `read-me-event-types` version `13`, and `create-writing` version `13`.
They retain custom `API_TOKEN` Bearer authentication and use the modern server-side database secret.
The crawler remains at version `44`. Gateway JWT verification remains disabled for all four functions.
All three Bunny routes rejected missing credentials with `401` and an invalid Bearer token with `403`.
The owner reported successful event-type retrieval and a successful check-in event through the existing Shortcuts after deployment.
The owner confirmed the check-in event's website display and successful iPhone operation.
The owner excluded laptop checks from the rollout scope.
The owner confirmed scheduled collection of a Last.fm song and its display on `/consuming`.
The production acceptance checks are complete.
No caller headers, credentials, database migrations, or migration history changed.

## Completed follow-up

The [rollout record](supabase-key-rollout.md) contains the completed Shortcut checks, isolated runtime results, production checks, and legacy-key audit.
The [integration definitions](supabase-integrations.md) record the CDN target and credential provisioning.
Production baseline adoption completed on 2026-11-10 after a fresh catalog comparison.
The [adoption record](supabase-production-adoption.md) records the history repair and verification results.
The original recovery made no production changes. The selected function deployment followed on 2026-11-01.
The owner subsequently confirmed legacy API-key revocation and successful production checks. The API-key migration is complete.
The recovered legacy handlers require the revoked service-role key and cannot serve as a rollback.
The function rollout itself required no production history repair.
