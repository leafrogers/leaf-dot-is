import { jest } from '@jest/globals';
import { Client, filter } from '@prismicio/client';
import { Pool } from 'postgres-pool';
import supertest from 'supertest';
import { weeknote } from '../test/fixtures.js';
import app from './app.js';
import config from './config.js';

const request = supertest(app);
const originalFriendlyTitle = config.APP_FRIENDLY_NAME;
const originalIsProduction = config.IS_PRODUCTION;

jest.spyOn(global.console, 'debug').mockReturnValue();
jest.spyOn(global.console, 'error').mockReturnValue();
const query = jest.spyOn(Pool.prototype, 'query');
const getWeeknotes = jest.spyOn(Client.prototype, 'getAllByType');

describe(`The ${config.APP_FRIENDLY_NAME} app`, () => {
	beforeEach(() => {
		config.APP_FRIENDLY_NAME = 'Test Title';
		query.mockReset().mockResolvedValue({
			command: 'SELECT',
			fields: [],
			oid: 0,
			rowCount: 1,
			rows: [{ title: 'Grooklet title', body: 'Grooklet body' }]
		});
		getWeeknotes.mockReset().mockResolvedValue([weeknote()]);
	});

	afterEach(() => {
		config.APP_FRIENDLY_NAME = originalFriendlyTitle;
		config.IS_PRODUCTION = originalIsProduction;
	});

	describe('GET /', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get('/');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Hello I am Leaf</h1>');
		});
	});

	describe('GET /writing', () => {
		it('serves a 200 status with expected content', async () => {
			const { status, text } = await request.get('/writing');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Writing</h1>');
			expect(text).toContain('<a href="/writing/weeknotes">Weeknotes</a>');
			expect(text).toContain('<a href="/writing/grooklets">Grooklets</a>');
		});
	});

	describe('GET /writing/grooklets', () => {
		it('serves a 200 status with expected content', async () => {
			const { status, text } = await request.get('/writing/grooklets');

			expect(text).toContain('<h1>Grooklets</h1>');
			expect(text).toContain('<h2>Grooklet title</h2>');
			expect(text).toContain('<p>Grooklet body</p>');
			expect(status).toBe(200);
		});
	});

	describe('GET /writing/weeknotes', () => {
		it('serves a 200 status with expected content', async () => {
			const { status, text } = await request.get('/writing/weeknotes');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Weeknotes</h1>');
			expect(text).toContain('href="/writing/weeknotes/a-quiet-week"');
			expect(text).toContain('A quiet week');
			expect(text).toContain('3rd Jan');
		});

		it.each([
			{ production: true, tags: ['live'] },
			{ production: false, tags: ['draft', 'live'] }
		])('requests the appropriate tags when production=$production', async ({
			production,
			tags
		}) => {
			config.IS_PRODUCTION = production;
			await request.get('/writing/weeknotes').expect(200);
			expect(getWeeknotes).toHaveBeenLastCalledWith('weeknotes', {
				predicates: [filter.any('document.tags', tags)],
				orderings: { field: 'my.weeknotes.date', direction: 'desc' }
			});
		});

		it('renders an empty list when there are no weeknotes', async () => {
			getWeeknotes.mockResolvedValueOnce([]);
			const { text } = await request.get('/writing/weeknotes').expect(200);
			expect(text).toContain('<h1>Weeknotes</h1>');
			expect(text).not.toContain('/writing/weeknotes/a-quiet-week');
		});

		it('forwards service failures to the public error page without caching them', async () => {
			config.IS_PRODUCTION = true;
			getWeeknotes.mockRejectedValueOnce(new Error('Private service details'));
			const { text, headers } = await request
				.get('/writing/weeknotes')
				.expect(500);
			expect(text).toContain('Something went wrong.');
			expect(text).not.toContain('Private service details');
			expect(headers['cache-control']).toContain('no-store');
		});
	});

	describe('GET /writing/weeknotes.rss', () => {
		it('serves a 200 status with expected content', async () => {
			const { status, text } = await request.get('/writing/weeknotes.rss');

			expect(status).toBe(200);
			expect(text).toContain('<title>Leaf Rogers’ Weeknotes</title>');
			expect(text).toContain(
				'<title><![CDATA[Dear Internet: A quiet week]]></title>'
			);
			expect(text).toContain('<link>/writing/weeknotes/a-quiet-week</link>');
			expect(text).toContain('A walk beside the river.');
			expect(text).toContain('Sat, 03 Jan 2026 12:00:00 GMT');
		});
	});

	describe('GET /contracting/cv', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get('/contracting/cv');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Leaf Rogers</h1>');
		});
	});

	describe('GET /contracting/here/is/his/cv', () => {
		it('serves a 200 status', async () => {
			const { status, headers } = await request.get(
				'/contracting/here/is/his/cv'
			);

			expect(status).toBe(302);
			expect(headers.location).toBe('/contracting/here/is/their/cv');
		});
	});

	describe('GET /contracting/here/is/their/cv', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get(
				'/contracting/here/is/their/cv'
			);

			expect(status).toBe(200);
			expect(text).toContain('<h1>Leaf Rogers</h1>');
		});
	});

	describe('GET /contracting/cv/2015', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get('/contracting/cv/2015');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Leaf Rogers</h1>');
		});
	});

	describe('Caching', () => {
		it('sets a 1 year cache header for favicon images', async () => {
			const { headers, status } = await request.get('/apple-touch-icon.png');
			expect(status).toBe(200);
			expect(headers['cache-control']).toEqual('public, max-age=31536000');
		});

		it('sets a 1 year cache header for the homepage', async () => {
			const { headers, status } = await request.get('/');
			expect(status).toBe(200);
			expect(headers['cache-control']).toEqual('public, max-age=31536000');
		});

		it('sets a 1 year cache header for 404 pages', async () => {
			const { headers, status } = await request.get('/made-up-path');
			expect(status).toBe(404);
			expect(headers['cache-control']).toEqual('public, max-age=31536000');
		});

		it('sets a no-cache header for non-404 error pages', async () => {
			config.IS_PRODUCTION = true;
			const { headers, status } = await request.get('/throw-error-in-prod');
			expect(status).toBe(405);
			expect(headers['cache-control']).toEqual(
				'no-store, no-cache, must-revalidate, proxy-revalidate'
			);
		});
	});

	describe('Not found page', () => {
		/**
		 * @type {supertest.Response}
		 */
		let response;

		beforeEach(async () => {
			response = await request.get('/made-up-path');
		});

		it('renders the config file’s app title as the HTML title', () => {
			expect(response.text).toMatch(
				'<title>An error happened (404) — leaf.is</title>'
			);
		});

		it('renders a “page not found” paragraph', () => {
			expect(response.text).toMatch('<p>Page not found.</p>');
		});
	});

	describe('Catch-all error page for unexpected scenarios', () => {
		/**
		 * @type {supertest.Response}
		 */
		let response;

		beforeEach(async () => {
			config.IS_PRODUCTION = true;
			response = await request.get('/throw-error-in-prod');
		});

		it('renders a fallback document title', () => {
			expect(response.text).toMatch('<h1>An error happened (405)</h1>');
		});

		it('renders a public-facing error message', () => {
			expect(response.text).toMatch('Something went wrong.');
		});
	});
});
