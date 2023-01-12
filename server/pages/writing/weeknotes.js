import {
	importFile,
	toHtmlDocString,
	toWeeknoteViewModel
} from '../../helpers.js';
import { fetchWeeknotes } from '../../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const weeknotes = await fetchWeeknotes();
	const data = {
		items: weeknotes.map(toWeeknoteViewModel),
		navLevels: [
			{ text: 'Leaf.is', url: '/' },
			{ text: 'Writing', url: '/writing' }
		],
		title: 'Weeknotes'
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ items, navLevels, title }) => {
	return toHtmlDocString({
		body: `
			<ol reversed>
				${items
					.map(
						({ titleAsText, uid }) =>
							`<li>
								<a href="/writing/weeknotes/${uid}">${titleAsText}</a>
							</li>`
					)
					.join('\n')}
			</ol>
		`.trim(),
		navLevels,
		styles: `
			${commonCss}
		`,
		title
	});
};

/**
 * @typedef PageSpecificViewModel
 * @property {Weeknote[]} items
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */