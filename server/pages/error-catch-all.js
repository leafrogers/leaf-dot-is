import config from '../config.js';
import { importFile, logger, toHtmlDocString } from '../helpers.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressError} error
 * @param {ExpressRequest} req
 * @param {ExpressResponse} res
 * @param {NextFunction} next
 */
export const controller = (error, req, res, next) => {
	const requestId = req.get('X-Request-ID');
	const acceptsHtml = Boolean(req.accepts('html'));

	if (res.headersSent) {
		return next(error);
	}

	try {
		const data = getData({
			error,
			status: error.status
		});

		logger.debug({
			event: 'PROCESSING_ERROR',
			acceptsHtml,
			error,
			requestId
		});

		if (acceptsHtml) {
			const html = view(data);
			return res.status(data.status).send(html);
		}

		res.status(data.status).json({
			message: data.message,
			status: data.status
		});
	} catch (err) {
		next(err);
	}
};

/**
 * @param {object} settings
 * @param {Error} settings.error
 * @param {number} settings.status
 *
 * @returns {ViewModel}
 */
const getData = ({ error, status = 0 }) => {
	const publicStatus = status < 400 ? 500 : status;

	try {
		return {
			message: config.IS_PRODUCTION ? 'Something went wrong.' : error.message,
			status: publicStatus,
			title: `An error happened (${publicStatus})`
		};
	} catch (error) {
		return {
			message:
				'Something unexpected happened that messed up the serving of this page.',
			status: publicStatus,
			title: 'A confusing error happened'
		};
	}
};

/**
 * @param {ViewModel} settings
 */
const view = ({ message, title }) => {
	return toHtmlDocString({
		body: `
			<h1>${title}</h1>
			<p>${message}</p>
		`,
		styles: commonCss,
		title
	});
};

/**
 * @typedef PageSpecificViewModel
 * @property {number} status
 * @property {string} message
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
