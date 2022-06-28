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
			expect(text).toContain('Hello');
		});
	});
});
