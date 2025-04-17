/* eslint-disable complexity */
/* eslint-disable max-depth */
import { relativeTimestampStyles } from '../../shared/components/relative-timestamps/styles.js';
import { importFile, toHtmlDocString } from '../helpers.js';
import { fetchMeEventTypes, fetchMeEvents } from '../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @typedef MeEvent
 * @property {string} className
 * @property {string} [eventTitle]
 * @property {number} groupingThreshold
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
 * @typedef {MeEventGroup[]} MeEventGroups
 *
 * @typedef MeEventGroup
 * @property {(string | undefined)[]} events
 * @property {Date} timestamp
 * @property {string} title
 * @property {string} type
 *
 * @typedef PageSpecificViewModel
 * @property {MeEventGroups} meEventGroups
 * @property {MeEventTypes} meEventTypes
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */

/**
 * @param {MeEvents} meEvents
 */
const groupEvents = (meEvents) => {
	/**
	 * @type {MeEventGroups}
	 */
	const groupedEvents = [];

	// For each meEvent…
	for (let i = 0, l = meEvents.length; i < l; i += 1) {
		const currentEvent = meEvents[i];

		/** @type {MeEvents} */
		let consecutiveEvents = [currentEvent];

		// …if there’s an event title then start collecting any consecutive events
		// with the same event type
		for (let j = i; j < l - 1; j += 1, i += 1) {
			const thisEvent = meEvents[j];
			const nextEvent = meEvents[j + 1];

			if (
				!nextEvent ||
				nextEvent.typeShort !== currentEvent.typeShort ||
				new Date(thisEvent.timestamp).getTime() -
					new Date(nextEvent.timestamp).getTime() >
					currentEvent.groupingThreshold * 60000
			) {
				break;
			}

			consecutiveEvents.push(nextEvent);
		}

		/**
		 * @type {string[]}
		 */
		let processedEvents = [];
		let title = '';

		if (consecutiveEvents.length > 1) {
			if (
				consecutiveEvents.every((e) => e.groupTitle === currentEvent.groupTitle)
			) {
				processedEvents = consecutiveEvents.map(({ eventTitle }) => eventTitle);

				title = `${currentEvent.groupTitle}:`;
			} else {
				processedEvents = consecutiveEvents.map(
					({ groupTitle, eventTitle }) => `${groupTitle}: ${eventTitle}`
				);
			}
		} else {
			if (currentEvent.eventTitle) {
				processedEvents = [currentEvent.eventTitle];
				title = `${currentEvent.groupTitle}:`;
			} else {
				processedEvents = [];
				title = currentEvent.groupTitle;
			}
		}

		groupedEvents.push({
			events: processedEvents,
			timestamp: new Date(currentEvent.timestamp),
			title,
			type: currentEvent.type
		});
	}

	return groupedEvents;
};

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
		meEventGroups: groupEvents(meEvents),
		meEventTypes,
		navLevels,
		title
	};

	res.send(await view(data));
};

/**
 * @param {MeEventGroups} meEventGroups
 */
const buildEvents = (meEventGroups) => {
	if (!meEventGroups?.length) {
		return '';
	}

	return `
		<ol class="group__container">
			${meEventGroups
				.map(
					(eventGroup) => `
						<li>
							<dl class="group">
								<dt class="visually-hidden">Event type</dt>
								<dd class="group__tag">${eventGroup.type}</dd>

								<dt class="visually-hidden">Timestamp</dt>
								<dd class="group__timestamp">
									<time datetime="${eventGroup.timestamp.toISOString()}">${new Intl.DateTimeFormat(
										'en-GB',
										{ dateStyle: 'short', timeStyle: 'short' }
									).format(eventGroup.timestamp)}</time>
								</dd>

								<dt class="visually-hidden">Group title</dt>
								<dd class="group__title">${eventGroup.title}</dd>

								${eventGroup.events
									.map(
										(text) => `
											<dt class="visually-hidden">Sub event</dt>
											<dd class="group__child">
												<span class="group__icon" aria-hidden="true">↳ </span>${text}
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
const view = ({ meEventGroups, meEventTypes, navLevels, title }) =>
	toHtmlDocString({
		body: `
			${
				navLevels.length > 1
					? `<p>Here’s a feed of just ${meEventGroups[0].type.toLowerCase()} (capped at the last 200, to keep things snappy):</p>`
					: `
						<p>Here’s a mostly automated feed of things that have happened in m’life this past week.</p>
						<p>Categories I’m tracking:</p>

						${buildEventTypeList(meEventTypes)}
					`
			}
			${buildEvents(meEventGroups)}
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
				position: relative;
			}

			.group__title {
				border-right: 1px dashed;
				grid-column: 1/-1;
				margin-left: 0.4rem;
				padding: 0.5rem 0.5rem 0 0;
				text-wrap: balance;
			}

			.group__child {
				border-right: 1px dashed;
				display: flex;
				grid-column: 1/-1;
				line-height: 1.4;
				margin-left: 0.5rem;
				padding: 0.4rem 0.4rem 0.4rem 0;
				text-wrap: balance;
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

			${relativeTimestampStyles}
		`,
		title
	});
