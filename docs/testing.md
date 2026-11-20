# Testing

## Application checks

Use the Node version in `package.json`. Install the pinned packages before the first test run:

```sh
npm ci
npm test
```

`npm test` runs Biome, TypeScript checks, and Vitest with server, browser, shared component, and deployment gate coverage.
The application tests use synthetic database and Prismic responses.
They need local HTTP sockets for Supertest, but no external services or running database.
Vitest 5.1.0 runs native ES modules without Jest’s experimental VM flags.
The database runner uses a separate Vitest configuration, so default runs need no database.
The test command sets UTC for consistent date formatting.
Unexpected calls to global `fetch` fail the tests, even when application error handling catches the rejection.

For a focused run:

```sh
npm run vitest -- run server/pages/inhaling.test.js
```

For coverage without lint:

```sh
npm run test:coverage
```

Use branch coverage to find missing cases. This phase adds no percentage threshold.
The report measures `server/**`, `client/**`, `shared/**/*.js`, and the deployment gate.
Browser tests use jsdom to exercise timestamp text, updates, toggles, dismissal, and bootstrap fallback.
They do not test browser layout or visual rendering.
The `/inhaling` tests cover time boundaries, category changes, repeats, parent groups, ordering, filters, empty results, and dependency failures.
Service tests cover parameterized filters and query limits.
Weeknotes tests use document fixtures and check rendered content, dates, links, RSS items, and publication filters.

When behavior changes, add assertions for its observable outcomes.
Use new fixtures for each test because event grouping modifies its inputs.

## Database checks

Start Docker before these commands:

```sh
npm run db:start
npm run db:reset
npm run db:test
npm run db:test:integrations
```

`db:reset` replaces Leaf's local data with synthetic examples.
It replays all migrations, including the comment-only TGW history markers.
`db:test` runs the 18 pgTAP checks against the local application database.
`db:test:integrations` creates an empty disposable database in Leaf's local container.
It runs SQL installation tests, replays the real migrations, and runs five application query cases.
It removes the database and copied fixtures after success or failure.
Query cases use the real PostgreSQL driver and one transaction clock for exact time boundaries.
They cover category selection, future exclusion, six-day boundaries, field aliases, ordering, and both 200-row limits.
The runner connects only to Leaf’s local PostgreSQL port, `55322`.
The suite prints three expected credential errors. Its exit status determines success.
SQL installation tests use local recorders and synthetic credentials, and send no HTTP requests.
They execute the stored crawler command and check its URL, headers, timeout, and credential rotation.

To stop Leaf's stack while retaining its data:

```sh
npm run db:stop
```

See [local Supabase development](supabase-local-development.md) and [integration definitions](supabase-integrations.md) for details.

## CI and deployment

CircleCI runs the `node-tests` workflow on every branch.
Its two validation jobs run in parallel:

- `test`: application lint, type checks, Vitest coverage, and the browser build.
- `database-test`: local Supabase startup, migration and seed replay, pgTAP, and isolated integration SQL.

The database job uses a Docker-capable machine and the repository's pinned Supabase CLI.
It needs no production credentials.

Both jobs install dependencies with `npm ci` and cache npm downloads by lockfile, Node major version, and architecture.
The cache does not contain `node_modules`.
Application tests use `.circleci/test-suites.yml` through `circleci testsuite run application`.
The suite preserves the repository's test environment and uploads JUnit results once.
Coverage reports are available in the application job's artifacts.

This enables test reporting and rerunning failed tests through CircleCI.
The suite supports static splitting if job parallelism is increased later.
It currently uses one test node because the application suite is small.
Impact analysis, dynamic splitting, dynamic parallelism, and automatic retries are disabled.
These optional features can incur additional charges.
See the [Smarter Testing guide](https://circleci.com/docs/guides/test/smarter-testing-overview/) for feature details.

The `deploy` job runs only for `main`, after both validation jobs succeed for that pipeline.
Feature branches and tags cannot invoke it through this workflow.
The job attaches the browser bundle produced by `test`; the Fly Docker build includes that file.
It uses the pinned Fly CLI version in `.circleci/config.yml` and Fly's remote builder.
A serial group prevents overlapping deployments.
Before installation, the job checks the remote `main` revision and skips superseded commits.
Git lookup errors fail the job.

GitHub Actions no longer deploys this application.
The old `scripts/wait-for-circleci.js` gate and its tests remain as historical code; the pipeline does not invoke them.
Supabase production migrations and Edge Function deployments retain their separate procedures.

### Deployment setup

Before merging this configuration into `main`:

1. In Doppler, create a dedicated deployment config, for example project `leaf-dot-is`, config `ci_prd`.
   Store only the deployment values listed below in this config.
2. Add `FLY_API_TOKEN` to Doppler, using a Fly deploy token scoped to this application.
3. Add `FLY_APP_NAME` to Doppler, using the application's existing deployment target.
   The checked-in `fly.toml` names `aged-snowflake-6650`; confirm this matches the previous GitHub secret.
4. Generate a read-only Doppler service token for this config, named `circleci-fly-production`.
   The token selects the Doppler project and config; CI does not need `doppler setup` or a committed `doppler.yaml`.
5. Create a CircleCI context named `fly-production` in the repository's organization.
   Add the service token as `DOPPLER_TOKEN` through the CircleCI dashboard.
   This token is the only deployment secret stored in CircleCI.
6. Restrict context access to this project and the `main` branch.
   Use the expression `pipeline.git.branch == "main" and not job.ssh.enabled` where context expression restrictions are available.
7. Make sure CircleCI triggers builds for every branch, including branches without pull requests.
   Disable the project's **Only build pull requests** setting if it is enabled.

The context is attached only to `deploy`.
The job installs Doppler with its official installer, which verifies the downloaded binary signature with GnuPG.
The Node executor must provide `curl` and `gpg` for installation.
`doppler run` supplies only `FLY_API_TOKEN` and `FLY_APP_NAME` to the deployment command.
The command removes `DOPPLER_TOKEN` from the Fly process environment.
`--no-fallback` disables secret files and cached credentials; Doppler access errors fail deployment.
Tests and lint do not use Doppler or production secrets.

Do not use Doppler's project-wide CircleCI sync for this configuration; it would expose deployment secrets to branch validation jobs.
Do not put deployment credentials in project-wide environment variables, workspaces, artifacts, `.env` files, or the repository.
CircleCI does not automatically mask values fetched at runtime from Doppler.
Do not print environment variables or enable shell tracing in the deployment command.
GitHub Actions secrets are not automatically available to CircleCI.
Update Fly credentials in Doppler when they rotate.
To rotate the Doppler service token, update `DOPPLER_TOKEN` in CircleCI, then revoke the previous token after a successful deployment.
Application runtime secrets already stored in Fly retain their existing configuration; this job supplies deployment credentials only.
See [Doppler's CircleCI integration](https://docs.doppler.com/docs/circleci), [service tokens](https://docs.doppler.com/docs/service-tokens),
[Fly automation authentication](https://docs.fly.io/flyctl/integrating), and [CircleCI contexts](https://circleci.com/docs/guides/security/contexts/).

After pushing a feature branch, confirm both validation jobs run and `deploy` is absent.
After merging into `main`, confirm deployment starts only after both jobs pass.
Inspect test results, coverage artifacts, and the deployed browser bundle on that first hosted run.
Rerun failed validation jobs after resolving failures; deployment remains gated on their success.

Validate local configuration and suite changes with:

```sh
circleci config validate
circleci testsuite doctor application --json
```

The CLI needs the `testsuite` extension: `circleci extension install testsuite`.
Use the Node version in `.node-version` for local checks.
Hosted pipeline inspection requires CircleCI CLI authentication: `circleci auth login`.

To undo this migration, revert the CI configuration, test suite, and GitHub workflow changes together.
That restores the previous GitHub deployment and its existing CircleCI test gate.
Keep the previous GitHub deployment secrets until the first CircleCI deployment succeeds.

### Repair GitHub checkout access

Pipeline `213cc804-613f-420a-880e-fe6114b972ff`, commit `66235fb`, failed in both jobs during `checkout`.
GitHub rejected CircleCI's SSH key with `Permission denied (publickey)`.
No dependency installation or tests ran.
The database cleanup error about missing `package.json` followed the failed checkout.
Doppler cannot repair this error because checkout requires repository access before deployment secrets are loaded.

1. Open the CircleCI project `leafrogers/leaf-dot-is`, then **Project Settings → SSH Keys**.
   Inspect the repository checkout key and note its fingerprint.
2. Open [GitHub repository deploy keys](https://github.com/leafrogers/leaf-dot-is/settings/keys).
   Confirm the CircleCI public key exists and matches the checkout key in CircleCI.
   Repository checkout needs read access only.
3. If the key is missing or mismatched, use CircleCI's checkout/deploy-key controls to generate a replacement.
   Remove only the broken CircleCI checkout key when replacement requires removal.
   Leave unrelated keys in place.
4. If CircleCI cannot create the replacement, reconnect the GitHub account used by CircleCI with repository administration access.
   For GitHub App pipelines, confirm the CircleCI app installation includes this repository.
   If applicable, confirm organization policies permit deploy keys and authorize the integration for SSO.
   Prefer a repository-scoped deploy key over a personal user key with access to other repositories.
5. Rerun the failed workflow after the key repair:

   ```sh
   circleci workflow rerun 0c2d4f4f-717d-47ea-8164-e5b444093626 --from-failed
   circleci run get 213cc804-613f-420a-880e-fe6114b972ff --project gh/leafrogers/leaf-dot-is
   ```

The rerun uses the original commit, not uncommitted local configuration changes.
After checkout succeeds, push the prepared configuration on a branch to validate the new pipeline.
The CLI identity request succeeds, but checkout-key metadata returned `403 Forbidden` with the current CLI credentials.
Use the dashboards with repository administration access to complete the repair.
See [CircleCI checkout keys and GitHub integration](https://circleci.com/docs/guides/permissions-authentication/users-organizations-and-integrations-guide/).

### Validation of this configuration

Local configuration validation and orb expansion passed.
Doppler installation passed in `cimg/node:26.13.1`, including signature verification and the deployment command's CLI flags.
This check installed Doppler CLI v3.77.1 without loading secrets or deploying.
Live Doppler authentication still requires the service token and deployment config described above.
The application suite doctor passed all applicable checks with no action items.
Lint, type checks, and the browser build passed on Node 26.13.1.
Lint reported two existing CSS specificity warnings.
The production Docker build passed, and its image contains the generated browser bundle.
The database job's test commands are unchanged and were not rerun locally for this configuration update.
Hosted job timings, cache savings, and deployment still require the first CircleCI run.
The expected improvement is removal of the separate GitHub polling workflow and reuse of the validated browser bundle.

## Dependency upgrade phase

The package upgrade phase completed on 2026-11-15, with jsdom deferred to the Node upgrade.
The updates include Express 5, Biome 2.6, TypeScript 7, Supabase CLI 3, and the current PostgreSQL pool and parsing packages.

Validation passed: 116 application tests, type checks, lint, the browser build, 18 database checks, and five real database query tests.
The disposable database integration SQL checks also passed. The dependency audit reported zero vulnerabilities.
Supabase CLI 3 restored Leaf's retained local database and stopped successfully after verification.

## Node upgrade phase

Local tooling, both CircleCI jobs, the deployment gate, and the Fly Docker image use Node 26.13.1.
The package engine accepts this version and later Node 26 releases.
With fnm installed, run `fnm install` and `fnm use` to select the version in `.node-version`.

The phase completed on 2026-11-15 with jsdom 31.0.1. No application or test changes were required.

Validation on Node 26 passed:

- A clean dependency install, lint, type checks, all 116 application tests, and the browser build.
- All 18 database checks, five real database query tests, and the disposable integration SQL checks.
- CircleCI configuration validation and a local production Docker build using Node 26.13.1.

Statement coverage remains 96.11%; branch coverage remains 83.48%. The dependency audit reports zero vulnerabilities.
Leaf's local database stopped with its data retained. Hosted CI and Fly deployment have not run for these local commits.
To roll back the runtime migration, revert its commit. Revert the jsdom upgrade first because it requires the newer runtime baseline.
