import { toHtmlDocString } from '../helpers.js';

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		text: { title: '🍂 Hello I am Leaf' }
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ text }) => {
	const body = `
		<h1>${text.title}</h1>
		<p>One day I will make this nice. Find me on:</p>
		<ul>
			<li><a rel="me" href="https://neurodifferent.me/@leaf">Mastodon</a></li>
			<li><a href="https://twitter.com/LeafRogers">Twitter</a> until stocks last</li>
			<li><a href="https://github.com/leafrogers">GitHub</a> although my current work is in a private GitLab account, boo</li>
			<li><a href="https://www.linkedin.com/in/leafrogers">LinkedIn</a> if that’s your thing</li>
		</ul>
		<p>I’m unavailable for work contracts until May 2023.</p>
		<p>This content is a bit dry isn’t it! Yeah bit dry. Anyway you look nice today.</p>
	`.trim();

	return toHtmlDocString({
		body,
		title: text.title
	});
};

/**
 * @typedef PageSpecificViewModel
 * @property {object} text
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
