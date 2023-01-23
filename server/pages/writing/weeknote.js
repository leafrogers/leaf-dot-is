import { format } from 'date-fns';
import { parse } from 'node-html-parser';
import {
	importFile,
	toHtmlDocString,
	toWeeknoteViewModel
} from '../../helpers.js';
import { fetchWeeknote } from '../../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} req
 * @param {ExpressResponse} res
 * @param {NextFunction} next
 */
export const controller = async (req, res, next) => {
	const { uid } = req.params;
	const weeknote = await fetchWeeknote(uid);

	if (!weeknote) {
		return next();
	}

	const data = {
		...toWeeknoteViewModel(weeknote),
		navLevels: [
			{ text: 'Leaf.is', url: '/' },
			{ text: 'Writing', url: '/writing' },
			{ text: 'Weeknotes', url: '/writing/weeknotes' }
		],
		title: ''
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ bodyAsHtml, navLevels, firstPublicationDate, titleAsText }) => {
	const body = parse(bodyAsHtml);

	return toHtmlDocString({
		body: body.toString(),
		header: `
			<p class="published">${format(
				new Date(firstPublicationDate),
				'eee do MMM ’yy'
			)}</p>
			<h1>${titleAsText}</h1>
		`,
		navLevels,
		styles: `
			${commonCss}
		`,
		title: titleAsText
	});
};

/**
 * @typedef {BaseUiViewModel & Weeknote} ViewModel
 */
