import { politeSetInterval } from '../../../client/helpers.js';
import { setUpTimestampPopover } from './dom-setup.js';
import { getRelativeTime } from './get-relative-time.js';

const oneMinute = 60000;

export const popoverClassName = 'fake-popover';
export const attributeName = 'aria-expanded';

/**
 * @param {Element} timestampEl
 */
const setRelativeTime = (timestampEl) => {
	const isoDatetime = timestampEl.getAttribute('datetime') || '';
	timestampEl.innerHTML = getRelativeTime(new Date(isoDatetime));
};

/**
 * @param {Element[]} timestampEls
 */
export const setUpRelativeTimestamps = (timestampEls) => {
	/**
	 * @param {Element} [target]
	 */
	const closePopovers = (target) => {
		timestampEls.forEach((el) => {
			const button = el.parentNode?.querySelector(`.${popoverClassName}`);

			if (!button || button === target) {
				return;
			}

			button.ariaExpanded = 'false';
		});
	};

	document.body.addEventListener('click', (ev) => {
		if (ev.target instanceof Element) {
			closePopovers(ev.target);
		}
	});

	document.body.addEventListener('keyup', (ev) => {
		if (ev.key === 'Escape') {
			closePopovers();
		}
	});

	timestampEls.forEach(setUpTimestampPopover);
	politeSetInterval(() => timestampEls.forEach(setRelativeTime), oneMinute);
};
