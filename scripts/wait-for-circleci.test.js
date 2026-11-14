import { jest } from '@jest/globals';
import { circleCIState, waitForCircleCI } from './wait-for-circleci.js';

const passedJobs = [
	{ context: 'ci/circleci: test', state: 'success' },
	{ context: 'ci/circleci: database-test', state: 'success' }
];

/** @returns {import('./wait-for-circleci.js').CheckRun} */
const workflow = () => ({
	id: 1,
	name: 'node-tests',
	status: 'completed',
	conclusion: 'success',
	app: { slug: 'circleci-checks' }
});

describe('CircleCI deployment requirements', () => {
	it('requires both job statuses to succeed', () => {
		expect(circleCIState({ statuses: passedJobs, checkRuns: [] })).toBe(
			'success'
		);
	});

	it.each([
		{ statuses: [] },
		{ statuses: passedJobs.slice(0, 1) },
		{ statuses: [{ context: 'unrelated', state: 'success' }] }
	])('waits when required job statuses are missing: $statuses', ({
		statuses
	}) => {
		expect(circleCIState({ statuses, checkRuns: [] })).toBe('pending');
	});

	it('waits when a required job is pending', () => {
		expect(
			circleCIState({
				statuses: [passedJobs[0], { ...passedJobs[1], state: 'pending' }],
				checkRuns: []
			})
		).toBe('pending');
	});

	it.each([
		'failure',
		'error'
	])('rejects a required job reporting %s', (state) => {
		expect(
			circleCIState({ statuses: [{ ...passedJobs[0], state }], checkRuns: [] })
		).toBe('failure');
	});

	it('accepts a successful CircleCI workflow check when job statuses are disabled', () => {
		expect(circleCIState({ statuses: [], checkRuns: [workflow()] })).toBe(
			'success'
		);
	});

	it.each([
		'failure',
		'cancelled',
		'timed_out',
		'neutral',
		'skipped',
		null
	])('rejects a completed workflow with conclusion %s', (conclusion) => {
		expect(
			circleCIState({
				statuses: passedJobs,
				checkRuns: [{ ...workflow(), conclusion }]
			})
		).toBe('failure');
	});

	it('waits for the newest workflow attempt even when older results passed', () => {
		expect(
			circleCIState({
				statuses: passedJobs,
				checkRuns: [
					workflow(),
					{ ...workflow(), id: 2, status: 'in_progress', conclusion: null }
				]
			})
		).toBe('pending');
	});

	it('ignores successful checks from other apps or workflows', () => {
		expect(
			circleCIState({
				statuses: [],
				checkRuns: [
					{ ...workflow(), app: { slug: 'other-app' } },
					{ ...workflow(), name: 'other-workflow' }
				]
			})
		).toBe('pending');
	});
});

describe('Waiting for the exact commit', () => {
	const sha = 'test-commit';
	const request = jest.fn(
		/** @type {typeof fetch} */ (async () => new Response())
	);
	const sleep = jest.fn((_ms = 0) => Promise.resolve());
	const options = {
		repository: 'example/site',
		sha,
		token: 'synthetic-token',
		request,
		sleep,
		maxAttempts: 2,
		intervalMs: 1
	};

	beforeEach(() => {
		jest.spyOn(console, 'log').mockReturnValue();
		request.mockReset();
		sleep.mockReset().mockResolvedValue();
	});

	/** @param {import('./wait-for-circleci.js').CommitStatus[]} statuses */
	const respond = (statuses = passedJobs, head = sha) => {
		request
			.mockResolvedValueOnce(Response.json({ object: { sha: head } }))
			.mockResolvedValueOnce(Response.json({ statuses }))
			.mockResolvedValueOnce(Response.json({ check_runs: [] }));
	};

	it('queries statuses and checks for the deployment SHA', async () => {
		respond();
		await expect(waitForCircleCI(options)).resolves.toBeUndefined();
		expect(request.mock.calls.map(([url]) => url)).toEqual([
			'https://api.github.com/repos/example/site/git/ref/heads/main',
			`https://api.github.com/repos/example/site/commits/${sha}/status?per_page=100`,
			`https://api.github.com/repos/example/site/commits/${sha}/check-runs?filter=latest&per_page=100`
		]);
		expect(sleep).not.toHaveBeenCalled();
	});

	it('waits for missing results and then accepts success', async () => {
		respond([]);
		respond();
		await expect(waitForCircleCI(options)).resolves.toBeUndefined();
		expect(sleep).toHaveBeenCalledTimes(1);
	});

	it('fails rather than deploying when results never arrive', async () => {
		respond([]);
		respond([]);
		await expect(waitForCircleCI(options)).rejects.toThrow('Timed out waiting');
		expect(sleep).toHaveBeenCalledTimes(1);
	});

	it('fails immediately on a failed required job', async () => {
		respond([{ ...passedJobs[1], state: 'failure' }]);
		await expect(waitForCircleCI(options)).rejects.toThrow('CircleCI failed');
		expect(sleep).not.toHaveBeenCalled();
	});

	it('rejects a passing commit that is no longer main', async () => {
		respond(passedJobs, 'newer-commit');
		await expect(waitForCircleCI(options)).rejects.toThrow('Main has moved');
	});

	it('stops when GitHub denies access', async () => {
		request.mockResolvedValue(new Response(null, { status: 403 }));
		await expect(waitForCircleCI(options)).rejects.toThrow(
			'GitHub API returned 403'
		);
	});

	it('stops on network errors', async () => {
		request.mockRejectedValue(new Error('Network unavailable'));
		await expect(waitForCircleCI(options)).rejects.toThrow(
			'Network unavailable'
		);
	});

	it('requires credentials before making requests', async () => {
		await expect(waitForCircleCI({ ...options, token: '' })).rejects.toThrow(
			'are required'
		);
		expect(request).not.toHaveBeenCalled();
	});
});
