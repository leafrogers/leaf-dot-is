import { afterAll, afterEach, beforeEach, expect, vi } from 'vitest';

// HTTP route tests use local sockets. Outbound service calls must use fixtures.
const fetch = vi
	.spyOn(globalThis, 'fetch')
	.mockRejectedValue(
		new Error(
			'Unexpected outbound fetch: mock the external service in this test'
		)
	);

beforeEach(() => {
	fetch.mockClear();
});

afterEach(() => {
	expect(fetch).not.toHaveBeenCalled();
});

afterAll(() => {
	vi.restoreAllMocks();
});
