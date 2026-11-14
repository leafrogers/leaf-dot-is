import { jest } from '@jest/globals';
import { parse } from 'node-html-parser';
import { Pool } from 'postgres-pool';
import supertest from 'supertest';
import app from '../app.js';
import config from '../config.js';

/** @typedef {import('./inhaling.js').MeEvent} MeEvent */

const request = supertest(app);
const query = jest.spyOn(Pool.prototype, 'query');
const originalIsProduction = config.IS_PRODUCTION;
const eventTypes = [
	{ type: 'Listening', typeShort: 'listened' },
	{ type: 'Watching', typeShort: 'watched' }
];
/** @type {MeEvent[]} */
let events;

/** @param {Partial<MeEvent>} overrides */
const event = (overrides = {}) => ({
	className: '',
	groupingThreshold: 60,
	timestamp: new Date('2026-01-03T12:00:00Z'),
	title: 'First track',
	type: 'Listening',
	typeShort: 'listened',
	...overrides
});

/** @param {object[]} rows */
const result = (rows) => ({
	command: 'SELECT',
	fields: [],
	oid: 0,
	rowCount: rows.length,
	rows
});

/** @param {string} html */
const groups = (html) => parse(html).querySelectorAll('.group');

/** @param {string} html */
const groupContents = (html) =>
	groups(html).map((group) =>
		group
			.querySelector('.group__content')
			?.textContent.replace(/\s+/g, ' ')
			.trim()
	);

beforeEach(() => {
	events = [];
	jest.spyOn(console, 'debug').mockReturnValue();
	query.mockReset().mockImplementation(async (sql) => {
		if (typeof sql === 'string' && sql.includes('from lis.me_events')) {
			return result(structuredClone(events));
		}
		if (typeof sql === 'string' && sql.includes('from lis.me_event_types')) {
			return result(eventTypes);
		}
		throw new Error(`Unexpected database query: ${sql}`);
	});
});

afterEach(() => {
	config.IS_PRODUCTION = originalIsProduction;
});

describe('GET /inhaling', () => {
	it('lists category links even when the feed has no events', async () => {
		const { text } = await request.get('/inhaling').expect(200);
		expect(text).toContain('<h1>Inhaling</h1>');
		expect(text).toContain('<a href="/inhaling/listened">listening</a>');
		expect(text).toContain('<a href="/inhaling/watched">watching</a>');
		expect(groups(text)).toHaveLength(0);
	});

	it('renders a single event without a parent and preserves line breaks', async () => {
		events = [event({ title: 'First line\nSecond line' })];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groups(text)).toHaveLength(1);
		expect(groups(text)[0].querySelector('.group__tag')?.textContent).toBe(
			'Listening'
		);
		expect(
			groups(text)[0].querySelector('time')?.getAttribute('datetime')
		).toBe('2026-01-03T12:00:00.000Z');
		expect(groups(text)[0].querySelector('.group__content br')).not.toBeNull();
		expect(groupContents(text)[0]).toContain('First line');
		expect(groupContents(text)[0]).toContain('Second line');
	});

	it.each([
		{ minutes: 59, count: 1 },
		{ minutes: 60, count: 2 },
		{ minutes: 61, count: 2 }
	])('renders $count groups for events $minutes minutes apart with a 60 minute threshold', async ({
		minutes,
		count
	}) => {
		events = [
			event(),
			event({
				title: 'Second track',
				timestamp: new Date(Date.UTC(2026, 0, 3, 12, -minutes))
			})
		];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groups(text)).toHaveLength(count);
		const contents = groupContents(text).join(' ');
		expect(contents).toContain('First track');
		expect(contents).toContain('Second track');
		expect(contents.indexOf('First track')).toBeLessThan(
			contents.indexOf('Second track')
		);
	});

	it('groups by the gap from the previous event rather than the start of the group', async () => {
		events = [
			event(),
			event({
				title: 'Second track',
				timestamp: new Date('2026-01-03T11:10:00Z')
			}),
			event({
				title: 'Third track',
				timestamp: new Date('2026-01-03T10:20:00Z')
			})
		];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual([
			'First track Second track Third track'
		]);
	});

	it('starts a new group for every category change, preserving feed order', async () => {
		events = [
			event(),
			event({ title: 'A film', type: 'Watching', typeShort: 'watched' }),
			event({ title: 'Last track' })
		];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual([
			'First track',
			'A film',
			'Last track'
		]);
	});

	it('collapses consecutive repeats and uses their oldest timestamp when testing the next gap', async () => {
		events = [
			event(),
			event({ timestamp: new Date('2026-01-03T11:10:00Z') }),
			event({ timestamp: new Date('2026-01-03T10:20:00Z') }),
			event({
				title: 'Next track',
				timestamp: new Date('2026-01-03T09:30:00Z')
			})
		];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual(['First track 3 times Next track']);
		expect(parse(text).querySelectorAll('.repeat-count')).toHaveLength(1);
	});

	it('keeps repeats separate when another title intervenes', async () => {
		events = [event(), event({ title: 'Interlude' }), event()];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual(['First track Interlude First track']);
		expect(parse(text).querySelectorAll('.repeat-count')).toHaveLength(0);
	});

	it('does not collapse matching titles across the time threshold', async () => {
		events = [event(), event({ timestamp: new Date('2026-01-03T11:00:00Z') })];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual(['First track', 'First track']);
		expect(parse(text).querySelectorAll('.repeat-count')).toHaveLength(0);
	});

	it('renders a shared parent once with the child titles in order', async () => {
		events = [
			event({ titleParent: 'An album' }),
			event({ titleParent: 'An album', title: 'Second track' })
		];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual(['An album First track Second track']);
	});

	it('renders a single child inline after its parent', async () => {
		events = [event({ titleParent: 'An album' })];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual(['An album First track']);
	});

	it('creates separate parent subgroups and keeps matching child titles distinct', async () => {
		events = [
			event({ titleParent: 'First album' }),
			event({ titleParent: 'Second album' }),
			event({ titleParent: 'Second album', title: 'Second track' }),
			event({ titleParent: 'First album', title: 'Last track' })
		];
		const { text } = await request.get('/inhaling').expect(200);
		expect(groupContents(text)).toEqual([
			'First album — First track Second album First track Second track First album — Last track'
		]);
		expect(parse(text).querySelectorAll('.repeat-count')).toHaveLength(0);
	});
});

describe('GET /inhaling/:eventType', () => {
	it('renders a known category even when it has no events', async () => {
		const { text } = await request.get('/inhaling/listened').expect(200);
		expect(text).toContain('<h1>Listening</h1>');
		expect(text).toContain('Here’s a feed of just listening');
		expect(groups(text)).toHaveLength(0);
	});

	it('renders the selected category heading, introduction, and navigation', async () => {
		events = [event()];
		const { text } = await request.get('/inhaling/listened').expect(200);
		expect(text).toContain('<h1>Listening</h1>');
		expect(text).toContain('Here’s a feed of just listening');
		expect(text).toContain('<a href="/inhaling">Inhaling</a>');
		expect(groupContents(text)).toEqual(['First track']);
	});

	it('returns 404 for an unknown category', async () => {
		const { text } = await request.get('/inhaling/not-a-category').expect(404);
		expect(text).toContain('Page not found.');
		expect(groups(text)).toHaveLength(0);
	});
});

describe('Inhaling dependency failures', () => {
	it.each([
		'events',
		'event types'
	])('renders an uncached public error when fetching %s fails', async (dependency) => {
		config.IS_PRODUCTION = true;
		if (dependency === 'event types') {
			query.mockResolvedValueOnce(result([]));
		}
		query.mockRejectedValueOnce(new Error('Private database details'));
		const { text, headers } = await request.get('/inhaling').expect(500);
		expect(text).toContain('Something went wrong.');
		expect(text).not.toContain('Private database details');
		expect(headers['cache-control']).toContain('no-store');
	});
});
