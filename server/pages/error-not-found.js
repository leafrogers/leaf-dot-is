import { importFile, logger, toHtmlDocString } from '../helpers.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} req
 * @param {ExpressResponse} res
 */
export const controller = async (req, res) => {
	const requestId = req.get('X-Request-ID');
	const acceptsHtml = Boolean(req.accepts('html'));
	const data = getData();

	logger.debug({
		event: 'ROUTE_NOT_FOUND',
		acceptsHtml,
		requestId,
		url: req.url
	});

	if (acceptsHtml) {
		const html = view(data);

		return res.status(404).send(html);
	}

	res.status(404).json({
		message: data.message,
		status: 404
	});
};

const getData = () => {
	/**
	 * @type ViewModel
	 */
	const data = {
		message:
			'Page not found.</p><p>Did you go to this address manually? Try going back and following the links, or starting again, back at the <a href="/">home page</a>. That <i>should</i> fix it for you, fingers crossed.',
		navLevels: [],
		title: 'An error happened (404)'
	};

	return data;
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
		navLevels: [],
		styles: commonCss,
		title
	});
};

/**
 * @typedef {BaseUiViewModel & { message: string }} ViewModel
 */
