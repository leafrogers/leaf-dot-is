import { Pool } from 'postgres-pool';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMeEvents, fetchMeEventTypes } from './services.js';

const query = vi.spyOn(Pool.prototype, 'query');

beforeEach(() => {
	query.mockReset().mockResolvedValue({
		command: 'SELECT',
		fields: [],
		oid: 0,
		rowCount: 0,
		rows: []
	});
});

describe('Inhaling database queries', () => {
	it('restricts the unfiltered feed to the recent past, newest first, with a 200 event cap', async () => {
		await expect(fetchMeEvents()).resolves.toEqual([]);
		expect(query).toHaveBeenCalledWith(
			expect.stringMatching(/timestamp <= current_timestamp/),
			[]
		);
		const sql = query.mock.calls[0][0];
		expect(sql).toContain(
			"timestamp >= current_timestamp at time zone 'UTC' - interval '6 days'"
		);
		expect(sql).toMatch(/order by timestamp desc\s+limit 200/);
		expect(sql).not.toContain('where type_short');
		expect(sql).toContain("and verb = 'inhaling'");
	});

	it.each(['listened', "unknown' OR '1'='1"])(
		'passes category %s as a parameter rather than SQL',
		async (category) => {
			await expect(fetchMeEvents(category)).resolves.toEqual([]);
			expect(query).toHaveBeenCalledWith(
				expect.stringContaining('where type_short = $1'),
				[category]
			);
			const sql = query.mock.calls[0][0];
			expect(sql).not.toContain(category);
			expect(sql).not.toContain("interval '6 days'");
			expect(sql).toContain('timestamp <= current_timestamp');
			expect(sql).toContain("and verb = 'inhaling'");
			expect(sql).toMatch(/order by timestamp desc\s+limit 200/);
		}
	);

	it('requests only inhaling categories and sorts them alphabetically', async () => {
		await expect(fetchMeEventTypes()).resolves.toEqual([]);
		expect(query).toHaveBeenCalledWith(
			expect.stringMatching(
				/from lis.me_event_types\s+where verb = 'inhaling'\s+order by type asc/
			)
		);
	});
});
