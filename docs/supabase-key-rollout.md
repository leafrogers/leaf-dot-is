# Leaf Supabase key rollout

Inspection date: 2026-10-30.
This checklist covers the three legacy Leaf handlers and their callers.
Function implementation and deployment belong in `../leaf-dot-is-edge-functions`.
This website repository owns the `lis` migrations.
See the [recovery notes](supabase-functions.md) for deployed versions and source evidence.

## Caller inventory

The owner confirmed the following caller map on 2026-10-30.

| Operation | Active caller | Rollout implication |
| --- | --- | --- |
| Manual Me Event creation | One core Apple Shortcut, called by many specialized Shortcuts | Change the core request and check its dependent Shortcuts |
| Event-type reads | One core Apple Shortcut, used by the same collection | Change the core request and preserve the JSON array contract |
| Scheduled Me Event creation | Edge Function that collects activity from services such as Last.fm and Letterboxd | Keep the deployed crawler unchanged |
| Me Event reads | The Leaf website | Keep its direct Postgres connection |
| Writing creation | Unused work in progress; no active caller | No caller update required for authentication migration |

The Shortcuts share one Apple account across an iPhone, a personal laptop, and a work laptop.
The core Shortcuts provide the shared requests; specialized Shortcuts provide the individual interfaces.
The owner reports no other Me Event writers and no other Me Event readers.
The event-creation Shortcut uses only the success status, not the response body.
The writing system has no active use or caller.

Check each core Shortcut's URL, method, header names, payload fields, and response handling before deployment.
Do not record credential values or personal payloads.

Two Bruno requests use `https://api.leaf.is/event-types` and an Authorization header:

- `../bruno-collections/Leaf.is/Event types.bru`
- `../TGG/asdf copy.bru`

Neither file contains a `tests` block.
No additional caller source appeared in the personal repository search.
The owner identified Apple Shortcuts as the active manual Me Event callers after that search.

An unauthenticated GET returned `401 Unauthorized` through Bunny CDN from the shared Supabase project.
Check the Bunny origin URL, path rewrite, header forwarding, and caching configuration before using that route for migration checks.
Do not cache authenticated personal responses.

## Recommended deployment scope

Prepare the three legacy handlers for named `automation` secret authentication in the dedicated function repository.
Preserve their deployed request parsing, persistence, and successful HTTP status codes during this deployment.
Preserve the event-type JSON array for the Shortcuts.
Keep the already migrated crawler at its deployed version.
Review the remaining behavior changes separately.

The source audit identified these compatibility decisions.
The source column records its state before local preparation:

| Behavior | Deployed handlers | Audited source | Authentication deployment |
| --- | --- | --- | --- |
| Caller credential | `Authorization` checked against `API_TOKEN` | Named `automation` key in `apikey` | Change caller and handler together |
| Database credential | Legacy service-role key | Admin client through `@supabase/server` | Use the modern admin client |
| Successful POST response | `201`, plain text `Created` | `201`, JSON `{ "created": true }` | Preserve `201`; JSON body is compatible with the confirmed callers |
| Empty event titles | Converted to `NULL` | Preserved as empty strings | Preserve `NULL` conversion and event identity |
| Event `stimsNumber` | Any string passes parsing | Only digit strings pass parsing | Preserve deployed parsing until callers are checked |
| JSON content type | Exact `application/json` match | Accepts parameters and case variations | Keep parsing changes separate |
| Error responses and ordering | Plain text; method check before authentication | JSON helpers; authentication wrapper runs first | Check caller error handling and document wrapper changes |
| Book crawling | Deployed activity selection | Changed selection plus completed-book events | Exclude crawler deployment |

The selected authentication wrapper can change rejected-request responses.
Do not promise exact error compatibility without handler-level tests.
Local preparation used the installed `@supabase/server` 1.4.1 documentation.
Keep gateway JWT verification disabled for these secret-key handlers.

## Local verification before deployment

Use an isolated function environment and a database populated with synthetic data.
Do not use the dedicated repository's unchanged local configuration alongside the TGW stack.
Its ports overlap TGW and its Postgres configuration differs from this repository.
Do not supply production credentials to the isolated environment.

Check the following behavior:

- Missing and invalid credentials reject requests without database writes.
- The named `automation` key permits each intended method.
- A different named secret cannot authenticate as `automation`.
- Event-type reads return the expected JSON array.
- Both POST handlers return `201` after successful persistence.
- Event retries update the same identity, including empty titles converted to `NULL`.
- Writing creation retains its slug and payload behavior.
- The actual callers accept the selected responses and send the `apikey` header.
- The two core Shortcuts work through their specialized Shortcuts with synthetic input.
- Both core Shortcut updates reach the iPhone and both laptops through the shared Apple account.

Account sharing does not establish that every device received an update.
Check each device before the first real submission after deployment.

Run the dedicated repository's checks and existing tests against the selected changes.
Add handler-level authentication checks where the existing pure-module tests do not cover the request path.
The initial inspection did not run function tests.
The local preparation results follow.

## Local preparation results

Prepared in `../leaf-dot-is-edge-functions` on 2026-10-30.
Committed as `5a91db1` (`fix: preserve deployed event request behaviour`).
The three source handlers already used named `automation` authentication and the admin client.
The preparation corrected compatibility differences before deployment:

- Empty event titles and parent titles become `NULL`.
- STIMS strings retain the deployed `Number` conversion.
- POST content types require exactly `application/json`.
- Both POST responses keep `201`; event types keep the JSON array.

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
Actual Shortcut requests, device synchronization, runtime key provisioning, routing, and deployable rollback source remain unchecked.
No production deployment, caller edit, or credential change occurred during preparation.

## Production sequence and rollback

1. Inspect the requests in the two core Shortcuts.
2. Verify that the named `automation` key is provisioned for the selected runtime.
3. Save the three deployed versions and their configuration for rollback.
4. Review the selected source diff and isolated verification results.
5. Prepare the caller header changes and schedule a coordinated change for callers and the three functions.
6. Deploy only the three selected functions from the dedicated repository.
7. Update the callers and check their complete request and response paths on each device.
8. Verify event-type reads before making an explicitly agreed production write check.
9. Observe scheduled crawler operation without redeploying it.

If a caller fails, restore its previous header and the corresponding recovered function version together.
Keep `API_TOKEN` and the legacy service-role key available throughout this rollback window.
The recovered bundles document deployed code but are not a tested redeployment artifact.
Prepare and verify deployable rollback source before production deployment.

Retire legacy keys only after checking all Leaf and TGW consumers.
The three Leaf deployments alone do not establish that shared-project retirement is safe.
No production deployment, caller edit, credential change, or key retirement occurred during this inspection.

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
The stored Vault value was not read or compared with the named key.
The command proves the request format, not successful authentication.

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

The query-string purge target and secret provisioning still need a reproducible definition.
The webhook does not fire on updates, including an upsert that updates an existing Me Event.
Preserve that behavior during baseline adoption; assess any cache-invalidation change separately.
Keep the local webhook omitted until its target and credential injection are defined.
See the [migration workflow](supabase-migrations.md) for the remaining production baseline requirements.
