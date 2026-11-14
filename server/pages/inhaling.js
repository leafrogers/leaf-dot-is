/* eslint-disable complexity */
/* eslint-disable max-depth */
import { relativeTimestampStyles } from '../../shared/components/relative-timestamps/styles.js';
import { importFile, toHtmlDocString } from '../helpers.js';
import { fetchMeEvents, fetchMeEventTypes } from '../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @typedef MeEvent
 * @property {string} className
 * @property {string} [eventTitle]
 * @property {number} groupingThreshold
 * @property {string} [groupTitle]
 * @property {MeEvent[]} [items]
 * @property {number} [repeatCount]
 * @property {Date} timestamp
 * @property {string} [title]
 * @property {string} [titleParent]
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
 * @property {MeEvent[]} items
 * @property {Date} timestamp
 * @property {string} [title]
 * @property {string} type
 *
 * @typedef PageSpecificViewModel
 * @property {MeEventGroups} meEventGroups
 * @property {MeEventTypes} meEventTypes
 *
 * @typedef {BaseUiViewModel & PageSpecificViewModel} ViewModel
 */

/**
 * @param {MeEvent} currentEvent
 * @param {MeEvent} previousEventInGroup
 */
const doesEventBelongInGroup = (currentEvent, previousEventInGroup) => {
	const timeBetweenEvents =
		previousEventInGroup.timestamp.getTime() - currentEvent.timestamp.getTime();
	const timeThresholdInMinutes = currentEvent.groupingThreshold * 60000;

	return (
		timeBetweenEvents < timeThresholdInMinutes &&
		previousEventInGroup.typeShort === currentEvent.typeShort
	);
};

/**
 * @param {MeEvent[]} meEvents
 */
function groupEventsByCategoryAndTime(meEvents) {
	if (!meEvents.length) {
		return [];
	}

	const categoryAndTimeGroups = [];
	let currentCategoryAndTimeGroup = /** @type {MeEventGroup} */ ({});

	for (const currentEvent of meEvents) {
		if (Object.keys(currentCategoryAndTimeGroup).length === 0) {
			currentCategoryAndTimeGroup = {
				items: [currentEvent],
				timestamp: currentEvent.timestamp,
				type: currentEvent.type
			};
			continue;
		}

		const previousEventInGroup =
			currentCategoryAndTimeGroup.items[
				currentCategoryAndTimeGroup.items.length - 1
			];
		const shouldAddEventToCurrentGroup = doesEventBelongInGroup(
			currentEvent,
			previousEventInGroup
		);

		// Either add event to current group…
		if (shouldAddEventToCurrentGroup) {
			if (
				currentEvent.titleParent === previousEventInGroup.titleParent &&
				currentEvent.title === previousEventInGroup.title
			) {
				previousEventInGroup.repeatCount =
					previousEventInGroup.repeatCount ?? 1;
				previousEventInGroup.repeatCount += 1;
				previousEventInGroup.timestamp = currentEvent.timestamp;
			} else {
				currentCategoryAndTimeGroup.items.push(currentEvent);
			}
			continue;
		}

		// …or start a new group
		categoryAndTimeGroups.push(currentCategoryAndTimeGroup);

		currentCategoryAndTimeGroup = {
			timestamp: currentEvent.timestamp,
			type: currentEvent.type,
			items: [currentEvent]
		};
	}

	if (currentCategoryAndTimeGroup.items.length > 0) {
		categoryAndTimeGroups.push(currentCategoryAndTimeGroup);
	}

	return categoryAndTimeGroups;
}

/**
 * @param {MeEvent} item
 * @param {number} numberOfSiblings
 * @param {number} depth
 */
const buildEvent = (item, numberOfSiblings = 0, depth = 1) => {
	const titleHtml = (item.title ?? '').replaceAll(/\n/g, '<br>');
	const { repeatCount, title } = item;
	const shouldShowListItemSeparator =
		(depth === 2 && title) || (depth === 3 && numberOfSiblings !== 1);

	let eventHtml = '';

	if (depth === 3 && numberOfSiblings === 1) {
		eventHtml += ' — ';
	}

	eventHtml += titleHtml || '';

	if (item.items?.length) {
		eventHtml +=
			item.items.length === 1
				? buildEvent(item.items[0], item.items.length ?? 0, depth + 1)
				: `
					<ol class="event-list">
						${item.items
							.map(
								(subItem) =>
									`<li>${buildEvent(subItem, item?.items?.length ?? 0, depth + 1)}</li>`
							)
							.join('\n')}
					</ol>
				`;
	}

	const content = `
		${eventHtml}
		${repeatCount ? ` <span class="repeat-count">${repeatCount} times</span>` : ''}
	`;

	return shouldShowListItemSeparator
		? `
			<div class="feed-item">
				${content}
			</div>
		`
		: content;
};

/**
 * @param {MeEventGroup[]} groups
 */
const determineParentTitles = (groups) => {
	return groups.map((group) => {
		const { items } = group;

		if (
			items.every(
				(item) =>
					item.titleParent && item.titleParent === group.items[0].titleParent
			)
		) {
			group.title = group.items[0].titleParent ?? '';
			group.items = items;
		} else if (group.items.length === 1) {
			Object.assign(group, group.items[0]);
			group.items = [];
		} else {
			group.title = '';

			const subGroupedItems = [];

			for (let index = 0; index < group.items.length; index++) {
				const thisItemUnsubgrouped = group.items[index];
				const latestSubgroupedItem =
					subGroupedItems[subGroupedItems.length - 1];

				if (
					latestSubgroupedItem &&
					(!latestSubgroupedItem.items.length ||
						latestSubgroupedItem.title === thisItemUnsubgrouped.titleParent)
				) {
					latestSubgroupedItem.items.push(thisItemUnsubgrouped);
				} else {
					subGroupedItems.push({
						title: thisItemUnsubgrouped.titleParent,
						items: [thisItemUnsubgrouped]
					});
				}
			}

			// @ts-expect-error
			group.items = subGroupedItems;
		}
		return group;
	});
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
		navLevels.push({
			text: 'Inhaling',
			url: `/inhaling`
		});
		title = eventTypeObj.type;
	}

	/** @type {ViewModel} */
	const data = {
		meEventGroups: determineParentTitles(
			groupEventsByCategoryAndTime(meEvents)
		),
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
						<li class="group">
							<header class="group__header">
								<p class="group__tag">${eventGroup.type}</p>
								<p class="group__timestamp">
									<time datetime="${eventGroup.timestamp.toISOString()}">${new Intl.DateTimeFormat(
										'en-GB',
										{ dateStyle: 'short', timeStyle: 'short' }
									).format(eventGroup.timestamp)}</time>
								</p>
							</header>
							<div class="group__content">
								${buildEvent(
									// @ts-expect-error
									eventGroup
								)}
							</div>
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
					? `<p>Here’s a feed of just ${title.toLowerCase()} (capped at the last 200, to keep things snappy):</p>`
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

				li {
					text-wrap: balance;
				}
			}

			.group {
				margin: 1.5rem 0;
			}

			.group__header {
				align-items: center;
				display: flex;
				margin-block-end: 0.3rem;
			}

			.group__tag {
				border-radius: 6px;
				border: 1px solid;
				margin: 0;
				padding: 0.2rem 0.4rem 0.4rem;
			}

			.group__timestamp {
				display: flex;
				gap: 0.2rem;
				margin: 0 0 0 auto;
				position: relative;
			}

			.group__content {
				border-right: 1px dashed;
				padding: 0.1rem 1rem 0 0.5rem;
			}

			.feed-item {
				background-image: url(data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBzdHJva2U9IiNmZmYwZTMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjY4Ij48cGF0aCBkPSJtMTkgMTVoLTkuNmE0LjQgNC40IDAgMCAxIC00LjQtNC40di01LjYiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIvPjxwYXRoIGQ9Im0xNSAxOSA0LTQtNC00IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9nPjwvc3ZnPg==);
				background-position: 0 2px;
				background-repeat: no-repeat;
			  background-size: 1.25rem;
				padding-left: 1.5rem;

				&:not(:has(.event-list)) {
					display: flex;
					gap: 0.5rem;
				}
			}

			@media (prefers-color-scheme: light) {
				.feed-item {
					background-image: url(data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBzdHJva2U9IiMwODExMWMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjY4Ij48cGF0aCBkPSJtMTkgMTVoLTkuNmE0LjQgNC40IDAgMCAxIC00LjQtNC40di01LjYiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIvPjxwYXRoIGQ9Im0xNSAxOSA0LTQtNC00IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9nPjwvc3ZnPg==);
				}
			}

			.event-list {
				list-style: none;
				margin: 0 0 0.5rem 0;
				padding: 0;

				li {
					margin: 0.2rem 0;
				}
			}

			.repeat-count {
				align-self: center;
				background: #fff0e3;
				border-radius: 5px;
				color: #000;
				font-size: small;
				height: fit-content;
				line-height: 1;
				padding: 2px 3px;
				text-wrap: nowrap;
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
