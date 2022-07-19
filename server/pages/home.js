import { toHtmlDocString } from '../helpers.js';

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		text: { title: '🍃' }
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ text }) => {
	const body = `
		<h1>${text.title}</h1>
	`.trim();

	return toHtmlDocString({
		body,
		title: text.title
	});
};

/**
 * @typedef PageSpecificViewModel
 * @property {object} text
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
