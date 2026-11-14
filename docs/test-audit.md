# Test coverage and behavior audit

Audit date: 2026-11-14. Code baseline: `4be6e25`.

## Remediation results

The follow-up adds behavior checks and strengthens the weak assertions identified below.
`npm test` passes 116 cases in 12 suites, plus formatting, lint, and type checks.
The browser build also passes.
Database validation passes 18 pgTAP checks, nine SQL assertions, three expected credential errors, and five application query cases.

The standard coverage report now includes server code, browser code, shared components, and the deployment gate.
The following measurements exclude the separate database run.

| Current coverage scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Server | 97.08% | 85.52% | 96.00% | 97.05% |
| Individual weeknote page | 100.00% | 100.00% | 100.00% | 100.00% |
| Browser and shared components | 94.11% | 76.00% | 100.00% | 94.00% |
| All measured JavaScript | 96.11% | 81.25% | 96.87% | 96.05% |

| Area | Added protection |
| --- | --- |
| Individual weeknotes | Requested UID, body, custom and fallback dates, document title, navigation, footnote targets, return links, missing documents, and service errors. |
| Application SQL | Actual migrated PostgreSQL schema, populated results, category selection, hostile filter text, future exclusion, exact six-day boundary, aliases, ordering, and both 200-row limits. |
| Browser timestamps | Relative-time boundaries, initial rendering, updates, accessible toggles, absolute dates, outside clicks, Escape, and client startup with or without timestamps. |
| Bootstrap script | Script insertion, enhancement class, and restoration of the core experience after a load error. |
| Existing assertions | Homepage links and availability, zero list items, CV versions and experience, document titles, category query argument, child list structure, and middleware status. |
| RSS | Parsed XML, multiple ordered items, absolute links, content type, publication date, body, footnotes, valediction, and empty feeds. |
| Response branches | JSON errors and 404s, development error details, production security headers, production CV output, archived CV, and legacy redirect. |
| Database contracts | All five rating columns reject 10 and accept 9; parent ID updates reach both child rows. |
| Crawler schedule | Stored command execution against a local recorder checks exact URL, headers, timeout, and credential rotation. |
| Deployment gate | Authorization headers, GitHub App response handling through polling, and main moving during a later poll. |

The interval test exposed an extra refresh on the first animation frame.
The fix preserves the immediate refresh and waits one full interval before the next refresh.
The fixed `leaf.is` document-title suffix remains the current contract; the misleading configuration test name is corrected.
The single-child test now states its actual contract: no nested list after the parent.
Rating tests preserve the existing upper bound. They do not introduce a lower bound.

jsdom 26 supports the current Jest runner and Node CI version.
Review its version during the planned Vitest and dependency upgrades.
Bootstrap tests execute the exported script text; coverage cannot attribute that evaluated text to its source file.
Browser tests do not validate layout, browser-specific behavior, or deployment infrastructure.
The live CircleCI-to-GitHub-to-Fly path and shell cleanup failure paths remain unverified.
The database runner performs cleanup after successful execution; this does not prove every failure path.
Jest reports a delayed shutdown after the query tests, then exits successfully.
The current pool package leaves a connection timeout pending; review this during dependency upgrades.

## Original audit

The remaining sections record findings at baseline `4be6e25`, before these corrections.
Their case counts, verdicts, and coverage figures describe that historical baseline.

## Results and scope

`npm test` passes: 81 tests in six suites, plus formatting, lint, and type checks.
A separate Jest run measured the deployment gate, client code, and shared components.
Both runs used synthetic service responses. Neither run contacted production services.

| Coverage scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Server: standard report | 87.17% | 75.00% | 82.66% | 87.05% |
| Inhaling page | 100.00% | 92.53% | 100.00% | 100.00% |
| Writing pages together | 66.66% | 37.50% | 70.58% | 66.66% |
| Individual weeknote page | 12.50% | 0.00% | 0.00% | 12.50% |
| Deployment gate: separate measurement | 90.91% | 70.21% | 100.00% | 90.24% |
| Client and shared components: separate measurement | 23.08% | 0.00% | 0.00% | 23.53% |

Client coverage comes from module initialization and imported style definitions.
No test executes browser behavior. The exported bootstrap script is text; importing it does not execute that script.
The standard report excludes client code, shared components, scripts, and SQL.
A high percentage therefore does not imply complete site coverage.

I inspected each of the 81 JavaScript cases, including every parameterized case.
I also inspected 13 pgTAP checks and ten SQL integration outcomes: seven assertions and three expected credential errors.
The SQL suites were not rerun for this audit. Their previous passing run does not establish their current execution status.

Each verdict assesses the stated behavior and actual assertions:

- **Useful:** protects a concrete behavior or external dependency contract within its stated scope.
- **Partial:** serves a useful purpose, but permits a realistic regression in the behavior it claims to protect.

There are 70 Useful and 11 Partial JavaScript cases.
There are 20 Useful and three Partial SQL checks or outcomes.
These are review judgments, not mutation-test results. No mutation test was run.
No application code or test changed during this audit.

## Main findings and follow-up order

1. **Individual weeknotes lack route coverage.** Add existing, missing, and failed-fetch cases for `/writing/weeknotes/:uid`.
   Check body, date, heading, navigation, footnote targets, and return links.
   The current list and RSS tests never invoke this page or `fetchWeeknote`.
2. **Actual application SQL is untested.** The service tests inspect query text and return empty mocked rows.
   The database suites test schema and installation behavior, but never run `fetchMeEvents` queries.
   Add disposable-database cases for category selection, future exclusion, six-day boundaries, newest-first ordering, aliases, and the 200-row cap.
   Include populated rows to prove service results reach consumers.
3. **The filtered route can lose its database filter without failing its test.** The route mock ignores query parameters.
   Keep rendering assertions and add an assertion that `listened` reaches the parameterized query.
   The service unit tests alone do not prove the route supplies that argument.
4. **Browser timestamp behavior has no tests.** Cover relative-time boundaries, updates, popover toggles, outside clicks, and Escape dismissal.
   Cover bootstrap success and load-failure fallback before claiming browser coverage.
5. **Several assertions overstate their protection.** Strengthen CV identity checks, the empty list, inline parent-child structure, and document titles.
   The current 404 title test changes `APP_FRIENDLY_NAME`, then expects a fixed `leaf.is` suffix.
   Decide whether the title must use that configuration before changing production behavior.
6. **Two database tests claim too much.** Check the child foreign key after a parent ID update.
   Expand the ratings test beyond one rejected `spoons_during = 10` value.
7. **RSS assertions need a realistic origin and XML structure.** Current empty base URLs allow relative item links to pass.
   Check multiple items, their count and order, empty feeds, content type, and footnotes.
8. **Important response branches remain uncovered.** Add JSON error/404 requests, production security headers, and production CV output.
   Add development error-detail checks where that behavior matters.
9. **Deployment tests remain simulations.** Cover request authorization headers and a later polling attempt where main moves.
   An end-to-end polling case with a GitHub App response will connect matcher coverage to API response handling.
   The real CircleCI-to-GitHub-to-Fly path remains unverified.

## JavaScript cases

Numbers below follow Jest execution order within each source file.
Exact test names identify parameterized cases independently.

### [server/pages/inhaling.test.js](../server/pages/inhaling.test.js) — 18 cases

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | GET /inhaling lists category links even when the feed has no events | Useful | Category links remain available when there are no events. |
| 2 | GET /inhaling renders a single event without a parent and preserves line breaks | Useful | Checks event text, category, ISO timestamp, and a real line break. |
| 3 | GET /inhaling renders 1 groups for events 59 minutes apart with a 60 minute threshold | Useful | 59 minutes: checks one group, both titles, and their order. |
| 4 | GET /inhaling renders 2 groups for events 60 minutes apart with a 60 minute threshold | Useful | 60 minutes: checks two groups at the exact boundary. |
| 5 | GET /inhaling renders 2 groups for events 61 minutes apart with a 60 minute threshold | Useful | 61 minutes: checks two groups beyond the boundary. |
| 6 | GET /inhaling groups by the gap from the previous event rather than the start of the group | Useful | Three events distinguish adjacent gaps from total group duration. |
| 7 | GET /inhaling starts a new group for every category change, preserving feed order | Useful | Category changes split groups and preserve event order. |
| 8 | GET /inhaling collapses consecutive repeats and uses their oldest timestamp when testing the next gap | Useful | Checks repeat count and the oldest repeat timestamp through the next grouping decision. |
| 9 | GET /inhaling keeps repeats separate when another title intervenes | Useful | An intervening title prevents repeat collapse. |
| 10 | GET /inhaling does not collapse matching titles across the time threshold | Useful | Matching titles remain separate at the time boundary. |
| 11 | GET /inhaling renders a shared parent once with the child titles in order | Useful | Checks one shared parent and ordered child text. |
| 12 | GET /inhaling renders a single child inline after its parent | Partial | Checks text order only. A nested list also passes; assert inline structure and the intended separator. |
| 13 | GET /inhaling creates separate parent subgroups and keeps matching child titles distinct | Useful | Distinct parents preserve matching child titles and repeated parent subgroups. |
| 14 | GET /inhaling/:eventType renders a known category even when it has no events | Useful | A valid empty category remains a 200 page with its heading and introduction. |
| 15 | GET /inhaling/:eventType renders the selected category heading, introduction, and navigation | Partial | Checks presentation. The query mock ignores parameters, so an unfiltered query also passes. Assert the category argument. |
| 16 | GET /inhaling/:eventType returns 404 for an unknown category | Useful | Unknown categories return the public 404 without event groups. |
| 17 | Inhaling dependency failures renders an uncached public error when fetching events fails | Useful | Event failure produces a 500, hides private details, and prevents caching. |
| 18 | Inhaling dependency failures renders an uncached public error when fetching event types fails | Useful | Category failure independently produces the same safe response. |

### [server/app.test.js](../server/app.test.js) — 21 cases

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | The leaf.is app GET / serves a 200 status | Partial | Useful route smoke test. The heading alone permits the rest of the homepage to disappear. |
| 2 | The leaf.is app GET /writing serves a 200 status with expected content | Useful | Checks the writing heading and both destination links. |
| 3 | The leaf.is app GET /writing/grooklets serves a 200 status with expected content | Useful | Checks a database fixture reaches the response as a title and body. |
| 4 | The leaf.is app GET /writing/weeknotes serves a 200 status with expected content | Useful | Checks the weeknote title, destination link, and formatted date. |
| 5 | The leaf.is app GET /writing/weeknotes requests the appropriate tags when production=true | Useful | Boundary contract: production requests live documents, ordered newest first. |
| 6 | The leaf.is app GET /writing/weeknotes requests the appropriate tags when production=false | Useful | Boundary contract: development requests draft and live documents. |
| 7 | The leaf.is app GET /writing/weeknotes renders an empty list when there are no weeknotes | Partial | Checks the heading and absence of one known link. Assert zero list items; stray or placeholder items can pass. |
| 8 | The leaf.is app GET /writing/weeknotes forwards service failures to the public error page without caching them | Useful | Prismic failure produces an uncached 500 and hides private service details. |
| 9 | The leaf.is app GET /writing/weeknotes.rss serves a 200 status with expected content | Partial | Checks real RSS item content, link, and date. Also parse XML, assert item count and content type, and use a nonempty permalink base. |
| 10 | The leaf.is app GET /contracting/cv serves a 200 status | Partial | Checks a shared name heading. A different CV version or missing experience content also passes. |
| 11 | The leaf.is app GET /contracting/here/is/his/cv serves a 200 status | Useful | Checks the actual 302 destination. Rename the test: its title incorrectly says 200. |
| 12 | The leaf.is app GET /contracting/here/is/their/cv serves a 200 status | Partial | Checks a shared name heading. Assert the current CV content or equivalence to its canonical route. |
| 13 | The leaf.is app GET /contracting/cv/2015 serves a 200 status | Partial | Checks a shared name heading. Assert content specific to the 2015 CV. |
| 14 | The leaf.is app Caching sets a 1 year cache header for favicon images | Useful | Checks a real static asset returns 200 with its cache lifetime. |
| 15 | The leaf.is app Caching sets a 1 year cache header for the homepage | Useful | Checks the homepage cache lifetime. |
| 16 | The leaf.is app Caching sets a 1 year cache header for 404 pages | Useful | Checks the 404 cache lifetime. This preserves current policy; it does not judge whether that policy is desirable. |
| 17 | The leaf.is app Caching sets a no-cache header for non-404 error pages | Useful | Checks an error status and the complete no-cache directive. |
| 18 | The leaf.is app Not found page renders the config file’s app title as the HTML title | Partial | Checks a hard-coded title despite changing APP_FRIENDLY_NAME. It does not prove the claimed configuration behavior. |
| 19 | The leaf.is app Not found page renders a “page not found” paragraph | Useful | Checks the public not-found paragraph. |
| 20 | The leaf.is app Catch-all error page for unexpected scenarios renders a fallback document title | Partial | Checks an h1 rather than the document title. Assert the title element or rename the test. |
| 21 | The leaf.is app Catch-all error page for unexpected scenarios renders a public-facing error message | Useful | Checks a public message from the error route. Private-detail hiding is covered by dependency-failure tests. |

### [server/services.test.js](../server/services.test.js) — 4 cases

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | Inhaling database queries restricts the unfiltered feed to the recent past, newest first, with a 200 event cap | Useful | SQL boundary contract: recent window, future exclusion, newest-first order, cap, and no category filter. Does not execute SQL. |
| 2 | Inhaling database queries passes category listened as a parameter rather than SQL | Useful | SQL boundary contract: ordinary category uses a bound parameter and retains ordering and cap. |
| 3 | Inhaling database queries passes category unknown' OR '1'='1 as a parameter rather than SQL | Useful | SQL boundary contract: quote-containing input stays outside SQL text. Does not exercise PostgreSQL injection behavior. |
| 4 | Inhaling database queries requests categories in alphabetical order | Useful | SQL boundary contract: categories request alphabetical ordering. Does not prove returned rows are sorted. |

### [server/middleware.test.js](../server/middleware.test.js) — 2 cases

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | Server middleware disallowInProduction: for routes that should throw an error in production, but not in development or test environments calls next with an error if IS_PRODUCTION is true | Partial | Checks an error message but not HttpError.status. Assert 405 and one next call; HTTP tests cover 405 indirectly. |
| 2 | Server middleware disallowInProduction: for routes that should throw an error in production, but not in development or test environments calls next without an error if IS_PRODUCTION is false | Useful | Checks that development continues without an error. |

### [server/config.test.js](../server/config.test.js) — 2 cases

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | Server helpers assertNoUndefinedValues doesn’t throw an error if variables are all defined | Useful | Defined configuration values do not prevent startup. |
| 2 | Server helpers assertNoUndefinedValues throws an error if any variables are undefined | Useful | Missing values fail with the exact missing variable names. |

### [scripts/wait-for-circleci.test.js](../scripts/wait-for-circleci.test.js) — 34 cases

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | CircleCI deployment requirements requires both job statuses to succeed | Useful | Both required job successes permit deployment. |
| 2 | CircleCI deployment requirements waits when required job statuses are missing: [] | Useful | No statuses keep deployment pending. |
| 3 | CircleCI deployment requirements waits when required job statuses are missing: [[Object]] | Useful | One required job is insufficient. |
| 4 | CircleCI deployment requirements waits when required job statuses are missing: [[Object]] | Useful | An unrelated successful status is insufficient. |
| 5 | CircleCI deployment requirements waits when a required job is pending | Useful | A pending required job keeps deployment pending. |
| 6 | CircleCI deployment requirements rejects a required job reporting failure | Useful | A failed required job blocks deployment. |
| 7 | CircleCI deployment requirements rejects a required job reporting error | Useful | An errored required job blocks deployment. |
| 8 | CircleCI deployment requirements accepts a successful CircleCI workflow check when job statuses are disabled | Useful | OAuth workflow success works without job statuses. |
| 9 | CircleCI deployment requirements recognizes GitHub App workflow checks: success | Useful | GitHub App workflow success permits deployment. |
| 10 | CircleCI deployment requirements recognizes GitHub App workflow checks: pending | Useful | GitHub App workflow in progress remains pending. |
| 11 | CircleCI deployment requirements recognizes GitHub App workflow checks: failure | Useful | GitHub App workflow failure blocks deployment. |
| 12 | CircleCI deployment requirements ignores unrelated or malformed GitHub App checks: other-workflow - a1b2c3d4 (circleci-app) | Useful | A different workflow cannot satisfy the gate. |
| 13 | CircleCI deployment requirements ignores unrelated or malformed GitHub App checks: node-tests-extra - a1b2c3d4 (circleci-app) | Useful | A workflow with a longer prefix cannot satisfy the gate. |
| 14 | CircleCI deployment requirements ignores unrelated or malformed GitHub App checks: node-tests - a1b2c3d (circleci-app) | Useful | A short pipeline identifier cannot satisfy the gate. |
| 15 | CircleCI deployment requirements ignores unrelated or malformed GitHub App checks: node-tests - a1b2c3d45 (circleci-app) | Useful | A long pipeline identifier cannot satisfy the gate. |
| 16 | CircleCI deployment requirements ignores unrelated or malformed GitHub App checks: node-tests - not-an-id (circleci-app) | Useful | A malformed pipeline identifier cannot satisfy the gate. |
| 17 | CircleCI deployment requirements ignores unrelated or malformed GitHub App checks: node-tests - a1b2c3d4 (other-app) | Useful | A different publisher cannot satisfy the gate. |
| 18 | CircleCI deployment requirements rejects a completed workflow with conclusion failure | Useful | Workflow failure overrides successful job statuses. |
| 19 | CircleCI deployment requirements rejects a completed workflow with conclusion cancelled | Useful | Workflow cancellation overrides successful job statuses. |
| 20 | CircleCI deployment requirements rejects a completed workflow with conclusion timed_out | Useful | Workflow timeout overrides successful job statuses. |
| 21 | CircleCI deployment requirements rejects a completed workflow with conclusion neutral | Useful | A neutral workflow result does not authorize deployment. |
| 22 | CircleCI deployment requirements rejects a completed workflow with conclusion skipped | Useful | A skipped workflow does not authorize deployment. |
| 23 | CircleCI deployment requirements rejects a completed workflow with conclusion null | Useful | A completed workflow without a conclusion does not authorize deployment. |
| 24 | CircleCI deployment requirements waits for the newest node-tests attempt even when older results passed | Useful | A newer OAuth attempt takes precedence over an older success. |
| 25 | CircleCI deployment requirements waits for the newest node-tests - a1b2c3d4 attempt even when older results passed | Useful | A newer GitHub App attempt takes precedence over an older success. |
| 26 | CircleCI deployment requirements ignores successful checks from other apps or workflows | Useful | Other OAuth publishers and workflow names are ignored. |
| 27 | Waiting for the exact commit queries statuses and checks for the deployment SHA | Useful | Checks exact SHA URLs and immediate success without a sleep. Request headers remain unasserted. |
| 28 | Waiting for the exact commit waits for missing results and then accepts success | Useful | Exercises pending then success through the polling loop. |
| 29 | Waiting for the exact commit fails rather than deploying when results never arrive | Useful | Exercises the timeout and bounded sleeps. |
| 30 | Waiting for the exact commit fails immediately on a failed required job | Useful | Exercises immediate failure without a retry sleep. |
| 31 | Waiting for the exact commit rejects a passing commit that is no longer main | Useful | A commit that no longer matches main cannot deploy. |
| 32 | Waiting for the exact commit stops when GitHub denies access | Useful | GitHub 403 produces a rejected gate. |
| 33 | Waiting for the exact commit stops on network errors | Useful | Network failure produces a rejected gate. |
| 34 | Waiting for the exact commit requires credentials before making requests | Useful | An empty token rejects before requests. Empty repository and SHA remain untested. |

## Database schema cases

Source: [supabase/tests/lis.test.sql](../supabase/tests/lis.test.sql).
Catalog checks protect schema contracts. They do not replace queries under real application roles.

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | Exact lis table set | Useful | Detects missing or extra application tables. |
| 2 | RLS enabled, not forced | Useful | Checks table flags. Does not execute role-specific access attempts. |
| 3 | No TGW schema | Useful | Prevents foreign history markers from creating unrelated objects. |
| 4 | Anonymous schema access denied | Useful | Checks effective schema USAGE privilege. |
| 5 | Authenticated schema access denied | Useful | Checks effective schema USAGE privilege independently. |
| 6 | Service role event grants | Useful | Checks SELECT, INSERT, and UPDATE grants. Does not exercise an actual service-role session. |
| 7 | Service role cannot delete writing | Useful | Protects the explicit table privilege restriction. |
| 8 | No local external webhook triggers | Useful | Checks local tables have no user triggers. Does not prohibit every possible outbound network path. |
| 9 | Duplicate event with NULL parent rejected | Useful | Executes a real duplicate insert and requires unique-violation SQLSTATE 23505. |
| 10 | Invalid event type rejected | Useful | Executes a real insert and requires foreign-key SQLSTATE 23503. |
| 11 | Rating bounds | Partial | Only spoons at 10 is rejected. Other rating columns and allowed boundary values remain unchecked. |
| 12 | Referenced event type cannot be deleted | Useful | Executes a real delete and requires foreign-key SQLSTATE 23503. |
| 13 | Event type ID update cascades | Partial | lives_ok proves only that the update succeeds. Query the child row and require its type_id to change. |

## SQL integration outcomes

Source: [supabase/integrations/test.sql](../supabase/integrations/test.sql).
These checks run installation SQL against real PostgreSQL with local Vault, cron, and webhook fixtures.
They protect installation behavior. They do not contact Bunny or execute the scheduled crawler request.

| # | Case | Verdict | Behavior and limitation |
| --- | --- | --- | --- |
| 1 | Missing Bunny credential rejected | Useful | Requires installation failure before continuing. |
| 2 | Missing credential preserves trigger | Useful | Checks the original one-argument trigger remains. Savepoint rollback also protects fixture state. |
| 3 | Exact and repeatable credential adoption | Useful | Quotes, backslashes, and Unicode survive two adoption runs without duplicate secrets. |
| 4 | Mismatched Bunny credential rejected | Useful | Requires adoption failure when the stored credential disagrees. |
| 5 | Repeat installation preserves webhook | Useful | Compares arguments, event type, enabled state, and function identity against the original trigger. |
| 6 | Inserts alone invoke webhook | Useful | Executes insert, update, and delete; requires exactly one recorded invocation containing the inserted title. |
| 7 | Legacy crawler credential rejected | Useful | Requires installation failure for the legacy credential format. |
| 8 | Invalid credential creates no schedule | Useful | Requires zero cron rows after the failed installation and savepoint rollback. |
| 9 | Repeatable crawler schedule and runtime secret | Partial | Checks one schedule and command substrings. Does not execute the stored command or prove correct URL and headers. |
| 10 | Installation needs no network schema | Useful | Successful setup without net detects a direct dependency on net during installation. It does not exercise scheduled HTTP. |

## Shared test setup and remaining limits

[test/setup.js](../test/setup.js) rejects unexpected global fetch calls and asserts that none occurred.
This catches swallowed fetch errors. It does not intercept node:http, node:https, or direct database connections.
Current service mocks prevent those application dependencies from running during these tests.
Fresh fixtures prevent event-grouping mutations from leaking between tests.

The database runner uses an isolated database and cleanup trap.
Its cleanup failure paths have no automated shell tests.
Migration replay is a CI prerequisite rather than a JavaScript coverage metric.
No test currently verifies deployed infrastructure, real Prismic responses, real CDN purges, or crawler authentication end to end.

Most existing tests belong in the suite. Strengthen the Partial cases and add the missing user journeys before pursuing a percentage target.
