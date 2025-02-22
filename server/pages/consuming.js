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

	const sprinkledEvents = [];

	// FIXME: Possible bug if consecutive non-event-title events
	for (const meEvent of meEvents) {
		const lastThing = sprinkledEvents[sprinkledEvents.length - 1];

		if (!lastThing || lastThing.parentEvent.groupTitle !== meEvent.groupTitle) {
			const e = {
				parentEvent: meEvent,
				childEvents: []
			};
			if (meEvent.eventTitle) {
				e.childEvents.push(meEvent);
			}
			sprinkledEvents.push(e);
		} else {
			lastThing.childEvents.push(meEvent);
		}
	}

	return `
		<ol class="group__container">
			${sprinkledEvents
				.map(
					(sprinkledEvent) => `
						<li>
							<dl class="group ${sprinkledEvent.parentEvent.typeShort}">
								<dt class="visually-hidden">Event type</dt>
								<dd class="group__tag">${sprinkledEvent.parentEvent.type}</dd>

								<dt class="visually-hidden">Timestamp</dt>
								<dd class="group__timestamp">
									<time datetime="${sprinkledEvent.parentEvent.timestamp.toISOString()}">${new Intl.DateTimeFormat(
										'en-GB',
										{ dateStyle: 'short', timeStyle: 'short' }
									).format(sprinkledEvent.parentEvent.timestamp)}</time>
								</dd>

								<dt class="visually-hidden">Group title</dt>
								<dd class="group__title">${sprinkledEvent.parentEvent.groupTitle}${sprinkledEvent.childEvents.length ? ':' : ''}</dd>

								${sprinkledEvent.childEvents
									.map(
										(childEvent) => `
											<dt class="visually-hidden">Sub event</dt>
											<dd class="group__child">
												<span class="group__icon" aria-hidden="true">↳ </span>${childEvent.eventTitle}
											</dd>
										`
									)
									.join('\n')}
							</dl>
						</li>
					`
				)
				.join('\n')}
		</ol>
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

			.group__container {
				list-style: none;
				margin: 0;
				padding: 0;
			}

			.group {
				display: grid;
				grid-template-columns: max-content 1fr;
				margin-top: 1.7rem;
			}

			.group__tag {
				border-radius: 6px;
				border: 1px solid;
				grid-column: 1/2;
				margin: 0;
				padding: 0.2rem 0.4rem 0.4rem;
			}

			.group__timestamp {
				align-self: center;
				margin-left: auto;
			}

			.group__title {
				border-right: 1px dashed;
				grid-column: 1/-1;
				margin-left: 0.4rem;
				padding: 0.5rem 0.5rem 0 0;
			}

			.group__child {
				border-right: 1px dashed;
				display: flex;
				grid-column: 1/-1;
				line-height: 1.4;
				margin-left: 0.5rem;
				padding: 0.4rem 0.4rem 0.4rem 0;
			}

			.group__icon {
				border-radius: 6px;
				margin-right: 0.3rem;
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
