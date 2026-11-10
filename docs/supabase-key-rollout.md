# Leaf Supabase key rollout

Initial inspection: 2026-10-30. Screenshot review: 2026-10-31.
Status: API-key migration complete. The owner confirmed legacy-key revocation and successful production checks.
This checklist covers the three legacy Leaf handlers and their callers.
Function implementation and deployment belong in `../leaf-dot-is-edge-functions`.
This website repository owns the `lis` migrations.
See the [recovery notes](supabase-functions.md) for deployed versions and source evidence.

## Current decision: retain custom Bearer authentication

Keep `Authorization: Bearer <API_TOKEN>` in both core Apple Shortcuts.
The custom token authenticates requests to the Leaf handlers. It is independent of Supabase database credentials.
The server-side admin client uses the modern secret key from `SUPABASE_SECRET_KEYS`, with the production `default` entry.
Do not distribute a Supabase secret key to the Shortcuts.
A named secret has project-level privileges; its name does not limit database permissions.

The three deployed handlers check `API_TOKEN` before entering `withSupabase({ auth: "none" })`.
The inner wrapper creates clients after the custom check. These endpoints remain authenticated.
Keep gateway JWT verification disabled because `API_TOKEN` is not a Supabase JWT.
Keep the deployed crawler and its separate `automation` authentication unchanged.

Missing Authorization returns plain text `401 Unauthorized`; an incorrect Bearer token returns plain text `403 Forbidden`.
Missing or empty server-side `API_TOKEN` returns `500` without database access.
The header must match the exact Bearer format already used by the Shortcuts.
Authentication runs before method validation; other application errors use JSON.
The unused writing handler still returns JSON on success.

The earlier named-key proposal and rehearsal below are historical evidence.
Their inbound authentication results do not validate this revised source.
No production deployment or caller change occurred during preparation.

## Caller inventory

The owner confirmed the following caller map on 2026-10-30.

| Operation | Active caller | Rollout implication |
| --- | --- | --- |
| Manual Me Event creation | One core Apple Shortcut, called by many specialized Shortcuts | Keep the core request and check its dependent Shortcuts |
| Event-type reads | One core Apple Shortcut, used by the same collection | Keep the core request and preserve the JSON array contract |
| Scheduled Me Event creation | Edge Function that collects activity from services such as Last.fm and Letterboxd | Keep the deployed crawler unchanged |
| Me Event reads | The Leaf website | Keep its direct Postgres connection |
| Writing creation | Unused work in progress; no active caller | No caller update required for authentication migration |

The Shortcuts share one Apple account across an iPhone, a personal laptop, and a work laptop.
The core Shortcuts provide the shared requests; specialized Shortcuts provide the individual interfaces.
The owner reports no other Me Event writers and no other Me Event readers.
The initial caller report described status-only handling.
The screenshots show that Send Event compares the response body with `Created`.
If the body differs, the Shortcut shows the response.
The writing system has no active use or caller.

### Screenshot evidence

The owner supplied six initial screenshots and a Bunny Edge Rules screenshot on 2026-10-31.
Credential values are omitted from this record.

| Shortcut | Request or behavior shown |
| --- | --- |
| Send Event | `POST https://api.leaf.is/event`, `Authorization: Bearer [REDACTED]`, File body from Shortcut Input |
| Send Event response | Compares Contents of URL with `Created` and shows any different response |
| Fetch event types | `GET https://api.leaf.is/event-types`, `Authorization: Bearer [REDACTED]` |
| Log Coffee | Sends a dictionary with text `stimsNumber` and numeric `typeId: 23` through Send Event |
| Add An Overheard | Sends a dictionary with text `title` and numeric `typeId: 10` through Send Event |
| Create Event | Builds text `stimsNumber`, `timestamp`, `title`, and `titleParent`, plus numeric `typeId`, then calls Send Event |

The screenshots show no explicit Content-Type header on Send Event.
The File body selection alone does not establish the content type or serialized request bytes.
The local captures below establish these details for the three tested wrappers.
The Fetch event types screenshot does not show downstream array parsing.

The Bunny screenshot shows this origin URL:
`https://zklsoaixtluzvdidyxsh.supabase.co/functions/v1`.
The Host header override is empty.
The Edge Rules screenshot shows these enabled origin overrides:

| Public path on `https://api.leaf.is` | Origin path under `/functions/v1` |
| --- | --- |
| `/event` | `/create-me-event` |
| `/event-types` | `/read-me-event-types` |
| `/writing` | `/create-writing` |

Each override targets project `zklsoaixtluzvdidyxsh`.
An enabled Block Request rule matches request URLs outside these three public URLs.
No header changes or cache-duration changes appear in the four displayed rules.
The `Cache` badge on Block Request does not establish whether authenticated responses are cached.
On 2026-10-31, the owner confirmed that Bunny does not cache these endpoints and has no header forwarding rules.
For rollout planning, assume all request headers, including `Authorization`, reach the origin.
The owner confirmed successful authenticated iPhone requests through Bunny after deployment.

Completed deployment requirements:

- The completed [local Shortcut check](supabase-shortcut-check.md) records caller compatibility evidence.
- The deployed event handler retains the `201` plain text `Created` response.

The deployed function preserves `201` with plain text `Created` in `create-me-event`.
Its handler test checks the exact body and plain text content type.
Version `40` deployed this response on 2026-11-01. The owner confirmed successful iPhone Shortcut requests.

Two Bruno requests use `https://api.leaf.is/event-types` and an Authorization header:

- `../bruno-collections/Leaf.is/Event types.bru`
- `../TGG/asdf copy.bru`

Neither file contains a `tests` block.
No additional caller source appeared in the personal repository search.
The owner identified Apple Shortcuts as the active manual Me Event callers after that search.

An unauthenticated GET returned `401 Unauthorized` through Bunny CDN from the shared Supabase project.
The screenshots establish the Bunny origin URL and the three public route mappings.
The owner confirmed that these endpoints are not cached; header forwarding is an explicit rollout assumption.

## Recommended deployment scope

Prepare the three legacy handlers for modern server-side database credentials in the dedicated function repository.
Retain their custom `API_TOKEN` authentication and the existing Shortcut headers.
Preserve their deployed request parsing, persistence, and successful HTTP status codes during this deployment.
Preserve the event-type JSON array for the Shortcuts.
Keep the already migrated crawler at its deployed version.
Review the remaining behavior changes separately.

The source audit identified these compatibility decisions.
The source column records its state before local preparation:

| Behavior | Deployed handlers | Audited source | Authentication deployment |
| --- | --- | --- | --- |
| Caller credential | `Authorization` checked against `API_TOKEN` | Named `automation` key in `apikey` | Retain custom Bearer authentication |
| Database credential | Legacy service-role key | Admin client through `@supabase/server` | Use the modern admin client |
| Successful POST response | `201`, plain text `Created` | `201`, JSON `{ "created": true }` | Preserve `201` and plain text `Created` for Send Event |
| Empty event titles | Converted to `NULL` | Preserved as empty strings | Preserve `NULL` conversion and event identity |
| Event `stimsNumber` | Any string passes parsing | Only digit strings pass parsing | Preserve deployed parsing until callers are checked |
| JSON content type | Exact `application/json` match | Accepts parameters and case variations | Keep parsing changes separate |
| Error responses and ordering | Plain text; method check before authentication | JSON helpers; authentication wrapper runs first | Check caller error handling and document wrapper changes |
| Book crawling | Deployed activity selection | Changed selection plus completed-book events | Exclude crawler deployment |

The selected authentication wrapper can change rejected-request responses.
Do not promise exact error compatibility without handler-level tests.
Local preparation used the installed `@supabase/server` 1.4.1 documentation.
Keep gateway JWT verification disabled for these custom-token handlers.

## Local verification before deployment

Use an isolated function environment and a database populated with synthetic data.
Do not use the dedicated repository's unchanged local configuration alongside the TGW stack.
Its ports overlap TGW and its Postgres configuration differs from this repository.
Do not supply production credentials to the isolated environment.

Check the following behavior:

- Missing and invalid credentials reject requests without database writes.
- The existing custom Bearer token permits each intended method.
- Supabase API keys alone cannot authenticate these endpoints.
- Missing or empty `API_TOKEN` blocks database access.
- Outgoing database requests use the modern server credential, never the Shortcut token.
- Event-type reads return the expected JSON array.
- Both POST handlers return `201` after successful persistence.
- Event retries update the same identity, including empty titles converted to `NULL`.
- Writing creation retains its slug and payload behavior.
- The actual callers accept the selected responses with their existing Authorization headers.
- The two core Shortcuts work through their specialized Shortcuts with synthetic input.
- The existing core Shortcuts work on the iPhone and both laptops.

No Shortcut edit or synchronization is required for this rollout.
Check existing callers after deployment.

Run the dedicated repository's checks and existing tests against the selected changes.
Add handler-level authentication checks where the existing pure-module tests do not cover the request path.
The initial inspection did not run function tests.
The local preparation results follow.

## Local preparation results (earlier named-key design)

Prepared in `../leaf-dot-is-edge-functions` on 2026-10-30.
Committed as `5a91db1` (`fix: preserve deployed event request behaviour`).
The three source handlers already used named `automation` authentication and the admin client.
The preparation corrected compatibility differences before deployment:

- Empty event titles and parent titles become `NULL`.
- STIMS strings retain the deployed `Number` conversion.
- POST content types require exactly `application/json`.
- Both POST responses keep `201`; event types keep the JSON array.
- The screenshot review later identified a remaining dependency on plain text `Created` in Send Event.

Added `_shared/handlers_test.ts` to the standard Deno test task.
It exercises all three handlers through the actual authentication wrapper.
Tests use synthetic keys and intercept database requests without network permission.
Missing, invalid, default, other named, publishable, and Authorization-only credentials return `401` without database access.
Authenticated requests check schema selection, payload mapping, success responses, and database errors.
Repeated event requests retain the same upsert conflict columns and `NULL` titles.

Validation passed: 28 tests with 33 steps, handler type checking, formatting, and lint for the changed code.
Full-repository lint still reports three existing `require-await` errors in `crawl-me-events/crawl_test.ts`.
Crawler files remain unchanged.

These tests verify outgoing database requests, not database uniqueness or gateway behavior.
Screenshot inspection establishes the core request configuration, Bunny origin URL, and public route mappings.
The local captures below establish actual Shortcut request bytes for three wrappers.
Device synchronization remains unchecked.
The preparation updates below record key metadata and rollback source checks.
Header forwarding is assumed; authenticated requests through Bunny still need verification during rollout.
No production deployment, caller edit, or credential change occurred during preparation.

## Preparation update: 2026-10-31

The function repository now preserves the exact `Created` success response for Send Event.
All 28 tests and 33 handler steps passed in a temporary copy of the selected source.
Handler type checking, changed-file lint, and formatting passed in the function repository.
The prepared writing handler returns JSON because it has no active caller.
The recovered legacy writing handler returns plain text `Created`.

A read-only Management API query with `reveal=false` found the `automation` secret key.
No key value was requested or recorded.
The four deployed function versions and disabled JWT checks remain unchanged from the audit.
[Supabase documents automatic injection of named keys](https://supabase.com/docs/guides/functions/secrets) into `SUPABASE_SECRET_KEYS`.
The installed server package reads that object for `secret:automation`.
Project metadata and documentation support provisioning; they do not prove authentication inside a deployed handler.
Verify that behavior through Bunny during rollout without invoking the crawler.

Rollback source is prepared in the function repository under `rollback/20261030`.
It contains the three recovered handlers, their disabled JWT configuration, pinned direct imports, and a dependency lock.
Handler bodies are unchanged; direct import versions match the recovered bundle metadata.
The lock records newly resolved transitive dependencies, not the original bundle graph.
A local Deno smoke check passed for missing and invalid legacy authentication, success responses, schema selection, and empty event titles.
It imported the real entrypoints with synthetic credentials and intercepted database requests without network permission.
This check does not establish Edge Runtime redeployment or production database behavior.
The isolated Edge Runtime rehearsal below completes the local runtime check.
Production provisioning and deployment remain unchecked.

The [Shortcut procedure](supabase-shortcut-check.md) includes the loopback request inspector and post-deployment checks.
The inspector records content type and synthetic body bytes, omits authentication headers, and returns `Created` without database access.
Production Shortcuts remain unchanged.

### Local Shortcut results

The owner supplied captures from copied Shortcuts using the local inspector on 2026-10-31.
All three requests used exactly `application/json`, valid JSON, and numeric `typeId`.
The owner confirmed that Send Event accepted the inspector's plain text `Created` response in every case.

| Wrapper | Captured payload details |
| --- | --- |
| Log Coffee | `typeId: 23`, string `stimsNumber: "12132"`, no timestamp |
| Add An Overheard | `typeId: 10`, Unicode title `“Hello something salacious”`, no timestamp |
| Create Event | `typeId: 23`, string `stimsNumber: "12122"`, timestamp `2026-10-31T23:52:30Z`, title `Main title`, parent title `Parent` |

These payloads match the prepared parser and field mapping.
The handler preserves supplied timestamps and Unicode titles.
If the timestamp is absent, the handler supplies its current UTC time.
The Create Event timestamp uses an ISO 8601 UTC format with whole seconds.
No request-body or date-format change is required for these captures.

The inspector returned the success response without invoking a function or writing to a database.
These results do not establish Edge Runtime behavior, production authentication, Bunny forwarding, event-type parsing, or synchronization across devices.

## Isolated Edge Runtime rehearsal: 2026-11-01

This rehearsal used the earlier named-key design, before the decision to retain custom Bearer authentication.

The three prepared handlers and three recovered rollback handlers passed an isolated runtime rehearsal.
The check used Edge Runtime `v1.74.3`, PostgREST `v16.2`, and PostgreSQL `17.6.1.155`.
Separate containers held synthetic credentials and fixtures for event types `10` and `23`.
The database loaded the Leaf baseline and event-identity migration.
The existing Leaf and TGW local stacks were unchanged.

All 35 HTTP assertions passed, together with direct database assertions:

| Check | Result |
| --- | --- |
| Modern authentication | All three handlers rejected missing, wrong, default, cache-purge, and legacy Bearer credentials with `401` |
| Named automation key | Event types returned `200` with the synthetic array; both writers returned `201` |
| Captured Shortcut payloads | All three succeeded; event creation returned exactly `Created` as plain text |
| Stored event fields | STIMS values, Unicode title, parent title, explicit UTC timestamp, and default current UTC timestamp matched expectations |
| Retry behavior | Repeated identities updated one row, including an identity with both titles `NULL` |
| Error paths | Wrong method returned `405`; invalid payload returned `400`; unknown event type returned `500` |
| Rollback authentication | All three recovered handlers rejected missing credentials with `401` and wrong Bearer credentials with `403` |
| Rollback operations | Event types returned an array; both writers returned plain text `Created` with `201` |
| Rollback persistence | The legacy event handler updated the row created by the modern handler; the legacy writing handler inserted another row |

The first complete run exposed an incorrect test expectation for legacy writing: its response is plain text, not JSON.
After that correction, the complete check passed.
No application source change was necessary.

A local adapter routed `/rest/v1` requests to the private PostgREST container under `service_role`.
It removed API credentials before forwarding database requests.
The real handler wrapper checked inbound synthetic keys inside Edge Runtime workers.
This arrangement tests handler authentication and SQL persistence, but it does not test Supabase gateway key translation.
It also does not test production environment injection, Bunny routing, deployment commands, or device synchronization.
The resolved runtime dependencies do not reproduce the original deployed bundles.

The temporary harness is `/tmp/leaf-edge-rehearsal.py`; its assertions are `/tmp/leaf-edge-runtime-check.py`.
Selected source copies remain under `/tmp/leaf-edge-runtime-rehearsal`.
These temporary files contain only synthetic credentials and are not permanent recovery artifacts.
The rehearsal containers and their network were removed after the checks.

## Revised Bearer implementation verification: 2026-11-01

The revised source retains the custom Shortcut token and uses the modern server-side database secret.
All 28 Deno tests passed, including 45 handler steps without network permission.
The handler checks cover missing, incorrect, and malformed credentials, plus missing or empty server-side `API_TOKEN`.
Supabase keys alone cannot authenticate the Shortcut endpoints.
Outgoing database requests use the synthetic default secret rather than the Shortcut token.

A fresh isolated Edge Runtime rehearsal passed 41 HTTP assertions and direct database assertions.
It used the same runtime versions, synthetic fixtures, and credential-stripping REST adapter described above.
All three captured Shortcut payloads succeeded; event creation returned exactly `Created`.
Stored fields, timestamps, retry identity, and rollback reads and writes matched expectations.
The recovered rollback handlers accepted the same custom Bearer token after the revised handlers wrote records.
The temporary containers, volumes, and network were removed. Existing Leaf and TGW stacks were unchanged.

The temporary harness is `/tmp/leaf-bearer-runtime.py`.
Its selected source and assertions remain under `/tmp/leaf-bearer-runtime`.
These files contain synthetic credentials only.
The adapter does not test Supabase gateway key translation or production environment injection.
Production authentication and Bunny routing still require checks after deployment.

## Production preflight: 2026-11-01

A fresh read-only check confirmed the recovery versions:
`create-me-event` is `39`, `read-me-event-types` is `12`, and `create-writing` is `12`.
The crawler remains at `44`; all four have JWT verification disabled.
Key metadata confirms that the named `automation` secret remains present.
The check did not reveal credential values.

That preflight preceded deployment of the revised custom-token implementation.
At that point, the production handlers still used `API_TOKEN` and the legacy database key.
There is no longer a prerequisite to prepare new Shortcut headers.

## Production deployment: 2026-11-01

The CLI deployed only the three prepared Shortcut handlers from the dedicated function repository.
Production metadata reports `create-me-event` version `40`, `read-me-event-types` version `13`, and `create-writing` version `13`.
The crawler remains at version `44`. All four retain disabled gateway JWT verification.
The three handlers retain custom `API_TOKEN` authentication and use the modern server-side database client.
No caller headers, credential values, database migrations, or migration history changed.

Six requests through Bunny passed the authentication rejection checks.
Each route returned `401 Unauthorized` without credentials and `403 Forbidden` with an invalid Bearer token.
The owner subsequently reported successful event-type retrieval through the existing Shortcut.
The owner also reported a successful check-in event through an existing Shortcut.
These results establish authenticated reads and an accepted event write through Bunny with the existing Bearer token.
The owner confirmed that the check-in event appears on the website and that the iPhone Shortcuts work.
The owner limited device checks to the iPhone. Laptop checks are outside the rollout scope.
The owner also confirmed a complete scheduled cycle: Last.fm recorded a song, the crawler collected it, and `/consuming` displayed it.
The production acceptance checks are complete.

## Production sequence and rollback

This sequence records the completed deployment procedure.
The legacy rollback window is closed. Do not deploy the recovered handlers: their database key is revoked.

1. Review the revised handlers, authentication tests, and preserved `Created` response.
2. Retain the completed revised runtime rehearsal and its synthetic persistence checks.
3. Recheck deployed versions against the recovery record.
4. Keep `API_TOKEN` available in the function environment and retain the legacy database key for rollback.
5. Deploy only `create-me-event`, `read-me-event-types`, and `create-writing` from the dedicated repository.
6. Check event-type reads through the existing Shortcut and Bunny route.
7. After agreement on a test entry, check one production write and its website display.
8. Check the existing Shortcuts on the iPhone. The owner excluded laptop checks.
9. Observe scheduled crawler operation without redeploying it.

During the rollback window, the recovered source provided a rollback option with the existing Shortcut headers.
Keep `API_TOKEN` after the rollout because it remains the caller credential.
Retain the legacy service-role key throughout the rollback window.
The recovered rollback source passed the earlier local smoke check and isolated Edge Runtime rehearsal.
Those checks do not establish production deployment or gateway behavior.

Retire legacy Supabase keys after the Leaf audit and the end of the legacy rollback window.
The owner confirmed that TGW setup is current and functional. TGW does not require another audit within this rollout.
Revisit TGW only if a proposed change affects a shared dependency.
The custom `API_TOKEN` is separate from those keys and remains in use.
The three selected handlers are deployed. The owner subsequently confirmed legacy-key revocation and successful production checks.

## Legacy-key retirement audit

The owner limited this audit to Leaf and its Edge Functions.
This session changed no shared keys, database schemas, or TGW configuration.
TGW setup is current and functional by owner instruction.
Complete this Leaf audit before disabling the legacy `anon` and `service_role` API keys:

1. Search current Leaf code, Edge Functions, deployment configuration, and operational scripts for legacy key use.
2. Separate active dependencies from historical recovery files, local fixtures, and unused source.
3. Inspect deployed functions and secret configuration without printing credential values.
4. Compare the crawler's Vault `CRON_SECRET` with the modern `automation` key without printing either value.
5. Inspect available API usage logs for legacy-key traffic and account for infrequent Leaf scripts and jobs.
6. End the legacy-handler rollback window before disabling the keys. Those recovered handlers still require the legacy service-role key.
7. Disable legacy keys as a separate project-wide change, then repeat the Leaf production checks.

### Leaf audit results: 2026-11-01

The active Leaf source contains no direct legacy API-key references.
The website uses `PG_CONNECTION_STRING` through `postgres-pool`.
Its GitHub deployment workflow and Compose configuration contain no Supabase API-key dependency.
The recovered handlers under `rollback/20261030` still use `SUPABASE_SERVICE_ROLE_KEY`.
They remain a dependency until the legacy rollback window ends.

The deployed versions still match the accepted rollout: crawler `44`, event creation `40`, event types `13`, and writing `13`.
All four functions retain disabled gateway JWT verification.
The recovered crawler source uses `auth: "secret:automation"`.
The deployed crawler bundle exactly matches the recovered version `44`.
The Vault `CRON_SECRET` exactly matches the modern `automation` key.
This comparison used SHA-256 hashes through a read-only Postgres transaction. No credential values or hashes were printed.
The Management API SQL endpoint rejected the first inspection with HTTP `400`; the direct Postgres comparison passed.

The deployed secret names include `API_TOKEN`, `SUPABASE_SECRET_KEYS`, and `SUPABASE_PUBLISHABLE_KEYS`.
The legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names also remain present.
Their presence does not establish active use.

The production Doppler names include `DB_URL`, `DB_SECRET_KEY`, and `DB_SCHEMA`.
The website does not read those variables. Their presence alone does not establish an active dependency.
The Fly retry succeeded for `aged-snowflake-6650`. All listed secrets have `Deployed` status, including `PG_CONNECTION_STRING`.
Fly also lists `DB_URL`, `DB_SECRET_KEY`, and `DB_SCHEMA`, which the website does not read.
The inspection retrieved names, digests, and deployment status only. No secret values were retrieved or changed.
Gateway logs from `2026-11-01T19:38:04Z` to `2026-11-01T20:38:04Z` contained 12 requests, all with modern secret-key prefixes.
The query returned no legacy JWT-key category or unclassified category within that window.
This limited window does not establish the absence of infrequent manual callers.
The owner identified Shortcuts and the scheduled crawler as the only Leaf event writers.
The audit did not inspect TGW source or change its setup.
No API keys or secret configuration changed during this audit.

The evidence supports Leaf key retirement after the legacy rollback window ends.
The recovered pre-migration handlers will no longer work after the legacy service-role key is disabled.
The accepted modern handlers and custom Shortcut `API_TOKEN` remain the intended production setup.

Direct Postgres connections and the custom Shortcut `API_TOKEN` are separate credentials and remain unchanged.
The Leaf CDN trigger uses a Bunny credential; that credential is outside Supabase API-key retirement.
Any unresolved active consumer blocks retirement, not the completed Leaf handler deployment.

### Owner follow-up checks

The owner confirmed all three requested checks after the retirement instructions:

- The iPhone event-type and check-in Shortcuts work.
- The check-in event appears on the website.
- Another scheduled Last.fm import appears on `/consuming`.

The owner explicitly confirmed that the old API keys are revoked and the API-key migration is complete.
The legacy-handler rollback window is closed. The recovered handlers require the revoked service-role key and are historical records only.
The custom Shortcut `API_TOKEN` remains in use.

## Captured integration definitions

The definitions below came from a read-only production transaction on 2026-10-30.
Credential values remain redacted.
These records are inspection evidence, not executable migrations.

### Crawler schedule

Job `run-me-event-crawler` is active with schedule `*/5 * * * *`.
Its captured command contains no embedded credential value:

```sql
select
  net.http_get (
    url := 'https://zklsoaixtluzvdidyxsh.supabase.co/functions/v1/crawl-me-events',
    headers := jsonb_build_object(
      'apiKey',
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'CRON_SECRET'
      )
    ),
    timeout_milliseconds := 5000
  );
```

The header spelling is `apiKey`; HTTP header names are case-insensitive.
The original capture did not compare the stored Vault value with the named key.
The 2026-11-01 audit confirmed that `CRON_SECRET` matches the modern `automation` key.
The owner also confirmed a complete scheduled crawl and website display.

### CDN webhook

| Property | Captured value |
| --- | --- |
| Trigger | `purge_cdn_cache_lis_me_events` |
| Relation | `lis.me_events` |
| Timing and event | `AFTER INSERT`, once per row |
| Enabled | Origin mode (`O`) |
| Function | `supabase_functions.http_request()` |
| URL | `https://api.bunny.net/purge`, query values omitted |
| Method | `POST` |
| Headers | `Content-type: application/json`, `AccessKey: [REDACTED]` |
| Body argument | `{}` |
| Timeout | `5000` milliseconds |

The [integration definitions](supabase-integrations.md) now capture the purge target and credential provisioning without credentials in Git.
The webhook does not fire on updates, including an upsert that updates an existing Me Event.
Production adoption preserved that behavior. Assess any cache-invalidation change separately.
The local baseline continues to omit this webhook. Integration installation remains an explicit opt-in procedure.
The [production adoption record](supabase-production-adoption.md) documents the completed baseline adoption and verification.
See the [migration workflow](supabase-migrations.md) for future migrations and shared-history checks.
