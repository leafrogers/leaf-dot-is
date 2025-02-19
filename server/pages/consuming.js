import config from '../config.js';
import { importFile, toHtmlDocString } from '../helpers.js';
import { fetchMeEvents } from '../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const feed = await fetchMeEvents();

	/** @type {ViewModel} */
	const data = {
		meEvents: feed,
		navLevels: [{ text: 'Leaf.is', url: `${config.BASE_URL}/` }],
		title: 'Consuming'
	};

	res.send(await view(data));
};

/**
 * @param {MeEvents} meEvents
 */
const buildGroupsFromEvents = (meEvents) => {
	if (!meEvents || !meEvents.length) {
		return '';
	}

	return `
		<dl>
			${meEvents
				.map((meEvent) =>
					meEvent
						? `
							<div class="group ${meEvent.typeShort}">
								<dt class="group__tag">${meEvent.type}</dt>
								<dd class="group__timestamp">
									<time datetime="${meEvent.timestamp.toISOString()}">${new Intl.DateTimeFormat(
										'en-GB',
										{ dateStyle: 'short', timeStyle: 'short' }
									).format(meEvent.timestamp)}</time>
								</dd>
								<dd class="group__title">${meEvent.groupTitle}${meEvent.eventTitle ? `: ${meEvent.eventTitle}` : ''}</dd>
							</div>
						`
						: ''
				)
				.join('\n')}
		</dl>
	`;
};

/**
 * @param {ViewModel} settings
 */
const view = ({ meEvents, navLevels, title }) =>
	toHtmlDocString({
		body: `
			<p>Here’s a bunch of stuff I’ve been inhaling over the last week:</p>
			${buildGroupsFromEvents(meEvents)}
		`,
		navLevels,
		styles: `
			${commonCss}

			.group {
				align-items: center;
				padding-top: 1.5rem;
				transition: opacity 100ms ease-in-out 100ms;
			}

			.group:first-child {
				padding-top: 0;
			}

			.group.books + .group.books,
			.group.games + .group.games,
			.group.movies + .group.movies,
			.group.music + .group.music,
			.group.tv + .group.tv {
				padding-top: 0.3rem;
			}

			.group__tag {
				border-radius: 6px;
				border: 1px solid;
				display: inline-block;
				font-size: 1rem;
				margin-inline-end: 0;
				padding: 0.2rem 0.4rem 0.4rem;
			}

			.group__title {
				margin-left: 0;
				overflow: hidden;
				padding-top: 0.3rem;
				text-overflow: ellipsis;
				text-wrap: nowrap;
			}

			.group__timestamp {
				display: inline-block;
				margin-left: auto;
				min-width: max-content;
			}

			@media (min-width: 600px) {
				.container {
					padding-bottom: 1rem;
				}

				.group {
					display: flex;
				}

				.group__tag {
					margin-inline-end: 0.5rem;
					min-width: max-content;
				}

				.group__timestamp {
					order: 3;
					padding-left: 1rem;
				}

				.group__title {
					padding-top: 0;
				}
		`,
		title
	});

/**
 * @typedef MeEvent
 * @property {string} className
 * @property {string} [eventTitle]
 * @property {string} groupTitle
 * @property {Date} timestamp
 * @property {string} type
 * @property {string} typeShort
 *
 * @typedef {(MeEvent | null)[]} MeEvents
 *
 * @typedef PageSpecificViewModel
 * @property {MeEvents} meEvents
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */
