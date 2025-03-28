import { importFile, toHtmlDocString } from '../helpers.js';
import { fetchMeEventTypes, fetchMeEvents } from '../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @typedef MeEvent
 * @property {string} className
 * @property {string} [eventTitle]
 * @property {string} groupTitle
 * @property {Date} timestamp
 * @property {string} type
 * @property {string} typeShort
 *
 * @typedef MeEventType
 * @property {string} type
 * @property {string} typeShort
 *
 * @typedef {MeEvent[]} MeEvents
 * @typedef {MeEventType[]} MeEventTypes
 *
 * @typedef GroupedEvent
 * @property {MeEvent} parentEvent
 * @property {MeEvents} childEvents
 *
 * @typedef PageSpecificViewModel
 * @property {MeEvents} meEvents
 * @property {MeEventTypes} meEventTypes
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */

/**
 * @param {ExpressRequest} req
 * @param {ExpressResponse} res
 * @param {NextFunction} next
 */
export const controller = async (req, res, next) => {
	const { eventType } = req.params;
	let title = 'Inhaling';

	const [meEvents, meEventTypes] = await Promise.all([
		fetchMeEvents(eventType),
		fetchMeEventTypes()
	]);

	const eventTypeObj = meEventTypes.find((obj) => obj.typeShort === eventType);

	if (eventType && !eventTypeObj) {
		// fall through to 404
		return next();
	}

	const navLevels = [{ text: 'Leaf.is', url: '/' }];

	if (eventType) {
		navLevels.push({ text: 'Inhaling', url: '/inhaling' });
		title = eventTypeObj.type;
	}

	/** @type {ViewModel} */
	const data = {
		meEvents,
		meEventTypes,
		navLevels,
		title
	};

	res.send(await view(data));
};

/**
 * @param {MeEvents} meEvents
 */
// eslint-disable-next-line complexity
const groupEvents = (meEvents) => {
	const groupedEvents = [];

	for (const meEvent of meEvents) {
		const lastThing = groupedEvents[groupedEvents.length - 1];

		if (lastThing && lastThing.parentEvent.groupTitle === meEvent.groupTitle) {
			lastThing.childEvents.push(meEvent);
			continue;
		}

		const e = {
			parentEvent: meEvent,
			/** @type {MeEvents} */
			childEvents: []
		};
		if (meEvent.eventTitle) {
			e.childEvents.push(meEvent);
		}
		groupedEvents.push(e);
	}

	return groupedEvents;
};

/**
 * @param {MeEvent} childEvent
 */
const buildChildEvent = (childEvent) => `
	<dt class="visually-hidden">Sub event</dt>
	<dd class="group__child">
		<span class="group__icon" aria-hidden="true">↳ </span>${childEvent.eventTitle}
	</dd>
`;

/**
 * @param {GroupedEvent} groupedEvent
 */
const buildGroupedEvent = (groupedEvent) => `
	<dl class="group ${groupedEvent.parentEvent.typeShort}">
		<dt class="visually-hidden">Event type</dt>
		<dd class="group__tag">${groupedEvent.parentEvent.type}</dd>

		<dt class="visually-hidden">Timestamp</dt>
		<dd class="group__timestamp">
			<time datetime="${groupedEvent.parentEvent.timestamp.toISOString()}">${new Intl.DateTimeFormat(
				'en-GB',
				{ dateStyle: 'short', timeStyle: 'short' }
			).format(groupedEvent.parentEvent.timestamp)}</time>
		</dd>

		<dt class="visually-hidden">Group title</dt>
		<dd class="group__title">${
			groupedEvent.parentEvent.groupTitle
		}${groupedEvent.childEvents.length ? ':' : ''}</dd>

		${groupedEvent.childEvents.map(buildChildEvent).join('\n')}
	</dl>
`;

/**
 * @param {MeEvents} meEvents
 */
const buildGroupedEvents = (meEvents) => {
	if (!meEvents || !meEvents.length) {
		return '';
	}

	return `
		<ol class="group__container">
			${groupEvents(meEvents)
				.map((meEvent) => `<li>${buildGroupedEvent(meEvent)}</li>`)
				.join('\n')}
		</ol>
	`;
};

/**
 * @param {MeEvent} ungroupedEvent
 */
const buildUngroupedEvent = (ungroupedEvent) => `
	<dl class="group ${ungroupedEvent.typeShort}">
		<dt class="visually-hidden">Event type</dt>
		<dd class="group__tag">${ungroupedEvent.type}</dd>

		<dt class="visually-hidden">Timestamp</dt>
		<dd class="group__timestamp">
			<time datetime="${ungroupedEvent.timestamp.toISOString()}">${new Intl.DateTimeFormat(
				'en-GB',
				{ dateStyle: 'short', timeStyle: 'short' }
			).format(ungroupedEvent.timestamp)}</time>
		</dd>

		<dt class="visually-hidden">Group title</dt>
		<dd class="group__title">${
			ungroupedEvent.groupTitle
		}${ungroupedEvent.eventTitle ? ':' : ''}</dd>

		${
			ungroupedEvent.eventTitle
				? `
				<dt class="visually-hidden">Sub event</dt>
				<dd class="group__child">
					<span class="group__icon" aria-hidden="true">↳ </span>${ungroupedEvent.eventTitle}
				</dd>`
				: ''
		}
	</dl>
`;

/**
 * @param {MeEvents} meEvents
 */
const buildUngroupedEvents = (meEvents) =>
	meEvents && meEvents.length
		? `
		<ol class="group__container">
			${meEvents
				.map((meEvent) => `<li>${buildUngroupedEvent(meEvent)}</li>`)
				.join('\n')}
		</ol>
		`
		: '';

/**
 * @param {MeEventTypes} meEventTypes
 */
const buildEventTypeList = (meEventTypes) =>
	meEventTypes?.length
		? `
		<ul class="inline-list">
			${meEventTypes
				.map(
					(eventType) =>
						`<li><a href="/inhaling/${eventType.typeShort}">${eventType.type.toLowerCase()}</a></li>`
				)
				.join('\n')}
		</ul>
		`
		: '';

/**
 * @param {ViewModel} settings
 */
const view = ({ meEvents, meEventTypes, navLevels, title }) =>
	toHtmlDocString({
		body:
			navLevels.length > 1
				? `
					<p>Here’s a feed of just ${meEvents[0].type.toLowerCase()} (capped at the last 200, to keep things snappy):</p>
					${buildUngroupedEvents(meEvents)}
				`
				: `
					<p>Here’s a mostly automated feed of things that have happened in m’life this past week.</p>
					<p>Categories I’m tracking:</p>

					${buildEventTypeList(meEventTypes)}
					${buildGroupedEvents(meEvents)}
				`,
		navLevels,
		styles: `
			${commonCss}

			p {
				display: inline;
			}

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

			.inline-list {
				column-gap: 0.3rem;
				display: flex;
				flex-wrap: wrap;
				list-style: none;
				margin: 0 0 3rem;
				padding: 0;
			}

			.inline-list li {
				margin-bottom: 0;
			}

			.inline-list li::after {
				content: ',';
			}

			.inline-list li:last-child::after {
				content: '.';
			}
		`,
		title
	});
