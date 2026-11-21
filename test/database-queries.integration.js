import { Pool } from 'postgres-pool';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { fetchMeEvents, fetchMeEventTypes } from '../server/services.js';

// The runner supplies an empty disposable database with the real migrations.
const database = process.env.LEAF_TEST_DATABASE;
if (!database?.startsWith('leaf_integration_test_')) {
	throw new Error('A disposable Leaf test database is required');
}
const pool = new Pool({
	connectionString: `postgresql://postgres:postgres@127.0.0.1:55322/${database}`
});
/** @type {import('postgres-pool').PoolClient} */
let client;

beforeAll(async () => {
	client = await pool.connect();
	await client.query('BEGIN');
	await client.query("SET LOCAL TIME ZONE 'UTC'");
	await client.query(`INSERT INTO lis.me_event_types (id, type, type_short, grouping_threshold, verb)
		VALUES (1, 'Watching', 'watched', 90, 'inhaling'),
		(2, 'Listening', 'listened', 60, 'inhaling'),
		(3, 'Exercising', 'exercised', 60, 'living')`);
	// Keep fixture timestamps and application queries on one transaction clock.
	vi.spyOn(Pool.prototype, 'query').mockImplementation((sql, values) =>
		client.query(sql, values)
	);
});

beforeEach(async () => {
	await client.query('DELETE FROM lis.me_events');
});

afterAll(async () => {
	vi.restoreAllMocks();
	if (client) {
		await client.query('ROLLBACK');
		await client.release(true);
	}
	await pool.end();
});

it('returns recent events newest first with joined names and camel-case fields', async () => {
	await client.query(`INSERT INTO lis.me_events (type_id, timestamp, title, title_parent) VALUES
		(1, now() - interval '2 hours', 'Earlier film', 'Series'),
		(2, now() - interval '1 hour', 'Latest track', NULL),
		(3, now() - interval '30 minutes', 'Experimental exercise', NULL),
		(1, now() + interval '1 second', 'Future film', NULL),
		(2, now() - interval '6 days', 'Boundary track', NULL),
		(2, now() - interval '6 days 1 second', 'Old track', NULL)`);
	const events = await fetchMeEvents();
	expect(events.map((event) => event.title)).toEqual([
		'Latest track',
		'Earlier film',
		'Boundary track'
	]);
	expect(events[1]).toEqual({
		title: 'Earlier film',
		titleParent: 'Series',
		type: 'Watching',
		typeShort: 'watched',
		groupingThreshold: 90,
		timestamp: expect.any(Date)
	});
});

it('includes older events for the chosen category while excluding future and other categories', async () => {
	await client.query(`INSERT INTO lis.me_events (type_id, timestamp, title) VALUES
		(1, now() - interval '1 hour', 'Other category'),
		(2, now() - interval '20 days', 'Old track'),
		(2, now() + interval '1 second', 'Future track'),
		(2, now() - interval '1 hour', 'Recent track')`);
	expect((await fetchMeEvents('listened')).map((event) => event.title)).toEqual(
		['Recent track', 'Old track']
	);
	expect(await fetchMeEvents("unknown' OR '1'='1")).toEqual([]);
});

it.each([undefined, 'listened'])(
	'caps category %s at the latest 200 events',
	async (category) => {
		await client.query(`INSERT INTO lis.me_events (type_id, timestamp, title)
		SELECT 2, now() - n * interval '1 minute', 'Track ' || n FROM generate_series(1, 201) n`);
		const events = await fetchMeEvents(category);
		expect(events).toHaveLength(200);
		expect(events[0].title).toBe('Track 1');
		expect(events[199].title).toBe('Track 200');
	}
);

it('excludes non-inhaling events when their category is requested directly', async () => {
	await client.query(`INSERT INTO lis.me_events (type_id, timestamp, title)
		VALUES (3, now() - interval '1 hour', 'Experimental exercise')`);
	expect(await fetchMeEvents('exercised')).toEqual([]);
});

it('returns only inhaling categories and sorts them alphabetically with their route identifiers', async () => {
	expect(await fetchMeEventTypes()).toEqual([
		{ type: 'Listening', typeShort: 'listened' },
		{ type: 'Watching', typeShort: 'watched' }
	]);
});
