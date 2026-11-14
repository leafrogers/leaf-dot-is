import { Client, filter } from '@prismicio/client';
import { parse } from 'node-html-parser';
import { Pool } from 'postgres-pool';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { weeknote } from '../test/fixtures.js';
import app from './app.js';
import config from './config.js';

const request = supertest(app);
const originalFriendlyTitle = config.APP_FRIENDLY_NAME;
const originalPermalinkBase = config.PERMALINK_BASE_URL;
const originalIsProduction = config.IS_PRODUCTION;

vi.spyOn(global.console, 'debug').mockReturnValue();
vi.spyOn(global.console, 'error').mockReturnValue();
const query = vi.spyOn(Pool.prototype, 'query');
const getWeeknotes = vi.spyOn(Client.prototype, 'getAllByType');

describe(`The ${config.APP_FRIENDLY_NAME} app`, () => {
	beforeEach(() => {
		config.APP_FRIENDLY_NAME = 'Test Title';
		config.PERMALINK_BASE_URL = 'https://www.example.test';
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
		config.PERMALINK_BASE_URL = originalPermalinkBase;
		config.IS_PRODUCTION = originalIsProduction;
	});

	describe('GET /', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get('/');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Hello I am Leaf</h1>');
			const page = parse(text);
			for (const destination of [
				'/inhaling',
				'/writing',
				'https://github.com/leafrogers'
			]) {
				expect(
					page.querySelector(`main a[href="${destination}"]`)
				).not.toBeNull();
			}
			expect(page.querySelector('main')?.textContent).toContain(
				'unavailable for contract work'
			);
		});
	});

	it('shows dependency error details during development', async () => {
		config.IS_PRODUCTION = false;
		getWeeknotes.mockRejectedValueOnce(new Error('Synthetic Prismic failure'));
		const { text, headers } = await request
			.get('/writing/weeknotes')
			.expect(500);
		expect(text).toContain('Synthetic Prismic failure');
		expect(headers['cache-control']).toContain('no-store');
	});

	it('serves the archived 2022 CV separately from the current version', async () => {
		const { text } = await request.get('/contracting/cv/2022').expect(200);
		expect(text).toContain('<h1>Leaf Rogers</h1>');
		expect(text).toContain('January ’25');
		expect(text).toContain('<h2>Experience</h2>');
	});

	it('redirects the former consuming URL permanently to inhaling', async () => {
		const { headers } = await request.get('/consuming').expect(301);
		expect(headers.location).toBe('/inhaling');
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
			expect(
				parse(text).querySelector('.subnav-list')?.querySelectorAll('li')
			).toHaveLength(0);
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
			const { status, text, headers } = await request.get(
				'/writing/weeknotes.rss'
			);
			expect(headers['content-type']).toContain('application/xml');
			expect(parse(text).querySelectorAll('item')).toHaveLength(1);

			expect(status).toBe(200);
			expect(text).toContain('<title>Leaf Rogers’ Weeknotes</title>');
			expect(text).toContain(
				'<title><![CDATA[Dear Internet: A quiet week]]></title>'
			);
			expect(text).toContain(
				'<link>https://www.example.test/writing/weeknotes/a-quiet-week</link>'
			);
			expect(text).toContain('A walk beside the river.');
			expect(text).toContain('Sat, 03 Jan 2026 12:00:00 GMT');
		});
	});

	describe('GET /contracting/cv', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get('/contracting/cv');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Leaf Rogers</h1>');
			expect(text).toContain('<h2>Experience</h2>');
			expect(text).toContain('<h3>Contract Full-stack Engineer</h3>');
		});
	});

	describe('GET /contracting/here/is/his/cv', () => {
		it('redirects to the current CV alias', async () => {
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
			expect(text).toContain('<h2>Experience</h2>');
			expect(text).toContain('<h3>Contract Full-stack Engineer</h3>');
		});
	});

	describe('GET /contracting/cv/2015', () => {
		it('serves a 200 status', async () => {
			const { status, text } = await request.get('/contracting/cv/2015');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Leaf Rogers</h1>');
			expect(text).toContain('<h3>Freelance Front-end Developer</h3>');
			expect(text).not.toContain('Contract Full-stack Engineer');
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

		it('renders the not-found document title with the site name', () => {
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
			expect(parse(response.text).querySelector('title')?.textContent).toBe(
				'An error happened (405) — leaf.is'
			);
		});

		it('renders a public-facing error message', () => {
			expect(response.text).toMatch('Something went wrong.');
		});
	});
});

it('keeps production CVs readable without editing controls or development scripts', async () => {
	config.IS_PRODUCTION = true;
	try {
		for (const path of ['/contracting/cv', '/contracting/cv/2025']) {
			const { text } = await request.get(path).expect(200);
			const page = parse(text);
			expect(page.querySelector('[contenteditable]')).toBeNull();
			expect(page.querySelectorAll('script')).toHaveLength(0);
			expect(page.querySelector('h2')?.textContent).toBe('Tech skills');
		}
	} finally {
		config.IS_PRODUCTION = originalIsProduction;
	}
});

it('returns a JSON 404 to API clients', async () => {
	const { body, headers } = await request
		.get('/missing')
		.accept('json')
		.expect(404);
	expect(headers['content-type']).toContain('application/json');
	expect(body).toEqual({
		message: expect.stringContaining('Page not found.'),
		status: 404
	});
});

it('returns public JSON errors and security headers in production', async () => {
	config.IS_PRODUCTION = true;
	try {
		const { body, headers } = await request
			.get('/throw-error-in-prod')
			.accept('json')
			.expect(405);
		expect(body).toEqual({ message: 'Something went wrong.', status: 405 });
		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['x-frame-options']).toBe('SAMEORIGIN');
		expect(headers['content-security-policy']).toContain(
			"script-src 'self' 'sha256-BxipDLngHa9KSbGACViVDOeFGCKCGXaPUjSbEuOH5hk='"
		);
		expect(headers['strict-transport-security']).toContain('includeSubDomains');
		expect(headers['cache-control']).toContain('no-store');
	} finally {
		config.IS_PRODUCTION = originalIsProduction;
	}
});
