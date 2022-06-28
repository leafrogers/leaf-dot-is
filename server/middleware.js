import config from './config.js';
import { HttpError } from './helpers.js';

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} _res
 * @param {NextFunction} next
 */
export const disallowInProduction = (_req, _res, next) => {
	if (config.IS_PRODUCTION) {
		return next(
			new HttpError(405, 'This method or route is not allowed in production')
		);
	}
	next();
};
