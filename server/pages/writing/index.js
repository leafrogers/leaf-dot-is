import { importFile, toHtmlDocString } from '../../helpers.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		items: [{ text: 'Weeknotes', url: '/writing/weeknotes' }],
		navLevels: [{ text: 'Leaf.is', url: '/' }],
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
			<ul>
				${items
					.map(
						({ text, url }) =>
							`<li>
								<a href="${url}">${text}</a>
							</li>`
					)
					.join('\n')}
			</ul>
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
 * @property {NavLink[]} items
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
