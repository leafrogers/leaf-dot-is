import app from './app.js';
import supertest from 'supertest';

const request = supertest(app);

describe('App', () => {
	it('serves a default route', async () => {
		const { status } = await request.get('/');

		expect(status).toBe(200);
	});
});
