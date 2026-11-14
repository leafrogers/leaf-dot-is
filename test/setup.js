import { afterAll, afterEach, beforeEach, expect, jest } from '@jest/globals';

// HTTP route tests use local sockets. Outbound service calls must use fixtures.
const fetch = jest
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
	jest.restoreAllMocks();
});
