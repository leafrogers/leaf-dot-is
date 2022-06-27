import { toHtmlDocString } from '../helpers.js';
import config from '../config.js';

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		text: { title: config.APP_FRIENDLY_NAME }
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ text }) => {
	const body = `
			<h1>${text.title}</h1>
			<p>Hello</p>
	`;

	return toHtmlDocString({ body, title: text.title });
};

/**
 * @typedef PageSpecificViewModel
 * @property {object} text
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
