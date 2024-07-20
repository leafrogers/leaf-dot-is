import config from '../../config.js';
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
	const tags = config.IS_PRODUCTION ? ['live'] : ['draft', 'live'];
	const weeknotes = await fetchWeeknotes({ tags });
	const data = {
		items: weeknotes.map(toWeeknoteViewModel),
		navLevels: [{ text: 'Leaf.is', url: `${config.BASE_URL}/` }],
		title: 'Writing'
	};

	res.send(await view(data));
};

/**
 * @param {BaseUiViewModel} settings
 */
const view = ({ navLevels, title }) => {
	return toHtmlDocString({
		body: `
			<ul>
				<li>
					<a href="${config.BASE_URL}/writing/weeknotes">Weeknotes</a>
					<span>(<a href="${config.BASE_URL}/writing/weeknotes.rss">RSS feed</a>)</span>
				</li>
				<li>
					<a href="${config.BASE_URL}/writing/grooklets">Grooklets</a>
				</li>
			</ul>
		`.trim(),
		navLevels,
		styles: `
			${commonCss}
			li span {
				font-size: smaller;
			}
		`,
		title
	});
};
