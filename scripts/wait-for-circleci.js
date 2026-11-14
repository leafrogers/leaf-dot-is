import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {{ context: string, state: string }} CommitStatus
 * @typedef {{ id: number, name: string, status: string, conclusion: string | null, app?: { slug: string } }} CheckRun
 * @param {{ statuses: CommitStatus[], checkRuns: CheckRun[] }} results
 */
export const circleCIState = ({ statuses, checkRuns }) => {
	// CircleCI Checks reports the whole workflow; commit statuses report each job.
	const workflow = checkRuns
		.filter(
			(check) =>
				(check.name === 'node-tests' &&
					check.app?.slug === 'circleci-checks') ||
				(/^node-tests - [0-9a-f]{8}$/.test(check.name) &&
					check.app?.slug === 'circleci-app')
		)
		.sort((a, b) => b.id - a.id)[0];
	if (workflow) {
		if (workflow.status !== 'completed') {
			return 'pending';
		}
		return workflow.conclusion === 'success' ? 'success' : 'failure';
	}

	const required = ['ci/circleci: test', 'ci/circleci: database-test'].map(
		(context) => statuses.find((status) => status.context === context)
	);
	if (
		required.some(
			(status) => status?.state === 'failure' || status?.state === 'error'
		)
	) {
		return 'failure';
	}
	return required.every((status) => status?.state === 'success')
		? 'success'
		: 'pending';
};

/**
 * @param {object} options
 * @param {string} options.repository
 * @param {string} options.sha
 * @param {string} options.token
 * @param {typeof fetch} [options.request]
 * @param {(ms: number) => Promise<unknown>} [options.sleep]
 * @param {number} [options.maxAttempts]
 * @param {number} [options.intervalMs]
 */
export const waitForCircleCI = async ({
	repository,
	sha,
	token,
	request = globalThis.fetch,
	sleep = setTimeout,
	maxAttempts = 80,
	intervalMs = 15_000
}) => {
	if (!repository || !sha || !token) {
		throw new Error('GITHUB_REPOSITORY, GITHUB_SHA, and GH_TOKEN are required');
	}
	/** @param {string} path */
	const get = async (path) => {
		const response = await request(
			`https://api.github.com/repos/${repository}/${path}`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'X-GitHub-Api-Version': '2022-11-28'
				},
				signal: AbortSignal.timeout(15_000)
			}
		);
		if (!response.ok) {
			throw new Error(
				`GitHub API returned ${response.status} while checking CI`
			);
		}
		return response.json();
	};

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const [head, statuses, checks] = await Promise.all([
			get('git/ref/heads/main'),
			get(`commits/${sha}/status?per_page=100`),
			get(`commits/${sha}/check-runs?filter=latest&per_page=100`)
		]);
		if (head.object.sha !== sha) {
			throw new Error('Main has moved; this commit must not be deployed');
		}
		const state = circleCIState({
			statuses: statuses.statuses,
			checkRuns: checks.check_runs
		});
		if (state === 'success') {
			console.log(`CircleCI passed for ${sha}`);
			return;
		}
		if (state === 'failure') {
			throw new Error(`CircleCI failed for ${sha}`);
		}
		console.log(`Waiting for CircleCI (${attempt + 1}/${maxAttempts})`);
		if (attempt + 1 < maxAttempts) {
			await sleep(intervalMs);
		}
	}
	throw new Error(`Timed out waiting for CircleCI for ${sha}`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	try {
		await waitForCircleCI({
			repository: process.env.GITHUB_REPOSITORY ?? '',
			sha: process.env.GITHUB_SHA ?? '',
			token: process.env.GH_TOKEN ?? ''
		});
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
