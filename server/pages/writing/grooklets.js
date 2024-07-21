import config from '../../config.js';
import { importFile, toHtmlDocString } from '../../helpers.js';
import { fetchGrooklets } from '../../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const grooklets = await fetchGrooklets();
	const data = {
		items: grooklets.map(({ body, title }) => ({
			body: body.trim().replaceAll('\n', '<br>'),
			title
		})),
		navLevels: [
			{ text: 'Leaf.is', url: `${config.BASE_URL}/` },
			{ text: 'Writing', url: `${config.BASE_URL}/writing` }
		],
		title: 'Grooklets'
	};

	res.send(await view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ items, navLevels, title }) => {
	return toHtmlDocString({
		body: `
			<div class="what-the-heck">
				<h2>What is a Grooklet?</h2>
				<p>A grooklet is a little homage to <a href="https://en.wikipedia.org/wiki/Grook">Piet Hein’s Grooks</a>.</p>
			</div>

			${items
				.map(
					({ body, title }, index) => `
						<div class="grooklet">
							<h2${typeof title === 'string' ? '' : ' class="visually-hidden"'}>${title ?? `Grooklet ${index + 1}`}</h2>
							<p>${body}</p>
						</div>
					`
				)
				.join('\n')}
		`.trim(),
		navLevels,
		styles: `
			${commonCss}

			.what-the-heck h2 {
				font-size: 1.9rem;
				margin: 2rem 0 1rem;
			}

			.what-the-heck p {
				margin: 1rem 0 3.5rem;
			}

			.grooklet::before,
			.grooklet:last-of-type::after {
				content: '~~~ ❀ ~~~' / '';
				display: block;
				line-height: 1;
				margin: 2.5rem 0;
			}
		`,
		title
	});
};

/**
 * @typedef PageSpecificViewModel
 * @property {Grooklet[]} items
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
