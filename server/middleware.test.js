import { jest } from '@jest/globals';
import config from './config.js';
import { disallowInProduction } from './middleware.js';

const originalIsProduction = config.IS_PRODUCTION;

describe('Server middleware', () => {
	afterEach(() => {
		config.IS_PRODUCTION = originalIsProduction;
	});

	describe('disallowInProduction: for routes that should throw an error in production, but not in development or test environments', () => {
		it('calls next with an error if IS_PRODUCTION is true', () => {
			config.IS_PRODUCTION = true;
			const stubbedNext = jest.fn();
			// @ts-expect-error
			disallowInProduction({}, {}, stubbedNext);
			expect(stubbedNext).toHaveBeenCalledTimes(1);
			expect(stubbedNext).toHaveBeenCalledWith(
				expect.objectContaining({ status: 405 })
			);
			expect(stubbedNext).toHaveBeenCalledWith(
				new Error('This method or route is not allowed in production')
			);
		});

		it('calls next without an error if IS_PRODUCTION is false', () => {
			config.IS_PRODUCTION = false;
			const stubbedNext = jest.fn();
			// @ts-expect-error
			disallowInProduction({}, {}, stubbedNext);
			expect(stubbedNext).toHaveBeenCalledWith();
		});
	});
});
