import { importFile, toHtmlDocString } from '../../../helpers.js';

const body = importFile('server/pages/cv/2015/partial.html');
const styles = importFile('server/pages/cv/2015/main.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		text: { title: 'Leaf Rogers' }
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ text }) => {
	return toHtmlDocString({ body, styles, title: text.title });
};

/**
 * @typedef PageSpecificViewModel
 * @property {object} text
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
