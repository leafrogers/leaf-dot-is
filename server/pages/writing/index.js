import { format } from 'date-fns';
import config from '../../config.js';
import {
	importFile,
	stripFootnoteRefs,
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
	const tags = config.IS_PRODUCTION ? ['live'] : ['draft', 'live'];
	const weeknotes = await fetchWeeknotes({ tags });
	const data = {
		items: weeknotes.map(toWeeknoteViewModel),
		navLevels: [{ text: 'Leaf.is', url: `${config.BASE_URL}/` }],
		title: 'Writing'
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ items, navLevels, title }) => {
	return toHtmlDocString({
		body: `
			<div>
				<h2>Weeknotes</h2>
				<a href="${config.BASE_URL}/writing/weeknotes.rss">RSS feed</a>
			</div>
			<ol reversed>
				${items
					.map(
						({ date, titleAsText, uid }) =>
							`<li>
								<a href="${config.BASE_URL}/writing/weeknotes/${uid}">
									${titleAsText.replace(
										...stripFootnoteRefs
									)}</a> <span class="published">${format(
										date,
										'do MMM'
									)}</span>
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
