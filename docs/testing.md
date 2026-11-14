# Testing

## Application checks

Use the Node version in `package.json`. Install the pinned packages before the first test run:

```sh
npm ci
npm test
```

`npm test` runs Biome, TypeScript checks, and Jest with server, browser, shared component, and deployment gate coverage.
The application tests use synthetic database and Prismic responses.
They need local HTTP sockets for Supertest, but no external services or running database.
The test command sets UTC for consistent date formatting.
Unexpected calls to global `fetch` fail the tests, even when application error handling catches the rejection.

For a focused run:

```sh
npm run jest -- --runInBand server/pages/inhaling.test.js
```

For coverage without lint:

```sh
npm run test:coverage -- --runInBand
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

CircleCI runs two parallel jobs in the `node-tests` workflow:

- `test`: application lint, type checks, and Jest coverage.
- `database-test`: local Supabase startup, migration and seed replay, pgTAP, and isolated integration SQL.

The database job uses a Docker-capable machine and the repository's pinned Supabase CLI.
It needs no production credentials.

GitHub Actions retains the Fly deployment and its existing secrets.
Before deployment, it requires CircleCI success for the exact pushed commit.
The gate requires both job statuses to succeed.
With CircleCI Checks, a successful `node-tests` workflow also satisfies the gate.
It rejects failed checks, missing results after the wait limit, API errors, and commits that no longer match `main`.
A new push cancels the previous deployment workflow.
The Fly token is available only to the deployment step.

The gate uses GitHub's read-only workflow token for repository contents, commit statuses, and checks.
CircleCI must report job statuses or workflow checks to GitHub.
After a failed run, rerun the checks and the deployment workflow for the same commit.
The deployment wait step has a 25-minute timeout.

To roll back this CI change, revert the CI commit.
This also restores deployment without a test gate.

## Next phases

Keep the complete suite passing between these separate phases:

1. Migrate Jest to the latest stable Vitest. Preserve assertions, offline fixtures, and coverage reporting.
2. Upgrade outdated packages. Handle breaking changes in focused commits.
3. Upgrade Node to v26 in local tooling, CI, and deployment.

Resolve exact package versions and compatibility when each phase starts.
