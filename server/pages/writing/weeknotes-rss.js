import { Feed } from 'feed';
import config from '../../config.js';
import { toWeeknoteViewModel } from '../../helpers.js';
import { fetchWeeknotes } from '../../services.js';

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const weeknotes = await fetchWeeknotes();
	const data = {
		items: weeknotes.map(toWeeknoteViewModel),
		navLevels: [],
		title: 'Weeknotes'
	};

	res.setHeader('Content-Type', 'application/xml');
	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ items, title }) => {
	const feed = new Feed({
		author: {
			name: 'Leaf Rogers',
			link: `${config.BASE_URL}/writing/weeknotes.rss`
		},
		copyright: `© ${new Date().getFullYear()} Leaf Rogers`,
		description: 'Leaf writes some words about the past week.',
		favicon: `${config.BASE_URL}/favicon.ico`,
		feedLinks: {
			rss: `${config.BASE_URL}/writing/weeknotes.rss`
		},
		id: `${config.BASE_URL}/writing/weeknotes.rss`,
		language: 'en',
		link: `${config.BASE_URL}/writing/weeknotes.rss`,
		title: `Leaf Rogers’ ${title}`
		//updated: new Date(2013, 6, 14), // optional, default = today
	});

	items.forEach((post) => {
		feed.addItem({
			content: post.bodyAsHtml,
			date: post.firstPublicationDate,
			id: `${config.BASE_URL}/writing/weeknotes/${post.uid}`,
			link: `${config.BASE_URL}/writing/weeknotes/${post.uid}`,
			title: post.titleAsText
			//image: ''
		});
	});

	feed.addCategory('Weeknotes');

	return feed.rss2();
};

/**
 * @typedef PageSpecificViewModel
 * @property {Weeknote[]} items
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
