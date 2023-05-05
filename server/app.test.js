// eslint-disable-next-line node/no-extraneous-import
import { jest } from '@jest/globals';
import nock from 'nock';
import supertest from 'supertest';
import app from './app.js';
import config from './config.js';

const request = supertest(app);
const originalFriendlyTitle = config.APP_FRIENDLY_NAME;
const originalIsProduction = config.IS_PRODUCTION;

jest.spyOn(global.console, 'debug').mockImplementation(() => {});
jest.spyOn(global.console, 'error').mockImplementation(() => {});

describe(`The ${config.APP_FRIENDLY_NAME} app`, () => {
	beforeAll(() => {
		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');
	});

	beforeEach(() => {
		config.APP_FRIENDLY_NAME = 'Test Title';
	});

	afterEach(() => {
		config.APP_FRIENDLY_NAME = originalFriendlyTitle;
		config.IS_PRODUCTION = originalIsProduction;
		nock.cleanAll();
	});

	afterAll(() => nock.enableNetConnect());

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
		});
	});

	describe('GET /writing/weeknotes', () => {
		it('serves a 200 status with expected content', async () => {
			const { status, text } = await request.get('/writing/weeknotes');

			expect(status).toBe(200);
			expect(text).toContain('<h1>Weeknotes</h1>');
		});
	});

	describe('GET /writing/weeknotes.rss', () => {
		it('serves a 200 status with expected content', async () => {
			const { status, text } = await request.get('/writing/weeknotes.rss');

			expect(status).toBe(200);
			expect(text).toContain('<title>Leaf Rogers’ Weeknotes</title>');
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
			const { status, text } = await request.get('/contracting/here/is/his/cv');

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
		it('sets a 1 month cache header for favicon images', async () => {
			const { headers, status } = await request.get('/apple-touch-icon.png');
			expect(status).toBe(200);
			expect(headers['cache-control']).toEqual('public, max-age=2592000');
		});

		it('sets a no-cache header for the homepage', async () => {
			const { headers, status } = await request.get('/');
			expect(status).toBe(200);
			expect(headers['cache-control']).toEqual('public, max-age=2592000');
		});

		it('sets a 1 month cache header for 404 pages', async () => {
			const { headers, status } = await request.get('/made-up-path');
			expect(status).toBe(404);
			expect(headers['cache-control']).toEqual('public, max-age=2592000');
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
