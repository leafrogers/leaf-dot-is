import { importFile, toHtmlDocString } from '../helpers.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		navLevels: [],
		title: 'Hello I am Leaf'
	};

	res.send(await view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ title }) => {
	return toHtmlDocString({
		body: `
			<p>One day I will make this nice. Until then, here’s what I’ve been up to:</p>
			<ul>
				<li><a href="/inhaling">Inhaling</a></li>
				<li><a href="/writing">Writing</a>…</li>
			</ul>
			<p>Find me elsewhere:</p>
			<ul>
				<li>
					<a rel="me" href="https://bsky.app/profile/www.leaf.is">Bluesky</a>,
					<a rel="me" href="https://neurodifferent.me/@leaf">Mastodon</a>
				</li>
				<li><a rel="me" href="https://github.com/leafrogers">GitHub</a> although my most recent work is in a private GitLab account, boo</li>
				<li><a href="https://www.linkedin.com/in/leafrogers">LinkedIn</a> if that’s your thing</li>
			</ul>
			<p>I’m available for contract work from May 2025.</p>
			<p>This content is a bit dry isn’t it! Yeah. Anyway you look nice today.</p>
		`,
		navLevels: [],
		styles: `
			${commonCss}
		`,
		title
	});
};

/**
 * @typedef {BaseUiViewModel} ViewModel
 */
