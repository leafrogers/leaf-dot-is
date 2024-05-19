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
		navLevels: [
			{ text: 'Leaf.is', url: `${config.BASE_URL}/` },
			{ text: 'Writing', url: `${config.BASE_URL}/writing` }
		],
		rssUrl: `${config.BASE_URL}/writing/weeknotes.rss`,
		title: 'Weeknotes'
	};

	res.send(await view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ items, navLevels, rssUrl, title }) => {
	return toHtmlDocString({
		body: `
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
		header: `
			<h1>${title}</h1>
			<a href="${rssUrl}">RSS feed</a>
		`,
		navLevels,
		styles: `
			${commonCss}
			.published {
				margin-left: 1rem;
			}
		`,
		title
	});
};

/**
 * @typedef PageSpecificViewModel
 * @property {Weeknote[]} items
 * @property {URL['href']} rssUrl
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
