import { attributeName, popoverClassName } from './index.js';

const formatStyle = 'short';

/**
 * @param {Element} timestampEl
 */
export const setUpTimestampPopover = (timestampEl) => {
	// I would use the popover API but anchoring it to an element
	// isn’t supported in Firefox or iOS Safari, at time of writing
	const fakePopover = Object.assign(document.createElement('button'), {
		ariaExpanded: 'false',
		ariaLabel: 'Show timestamp',
		className: popoverClassName,
		innerHTML: '(?)'
	});

	fakePopover.addEventListener('click', (ev) => {
		const el = ev.currentTarget;

		if (!(el instanceof Element)) {
			return;
		}

		el.setAttribute(
			attributeName,
			`${el.getAttribute(attributeName) === 'false'}`
		);
	});

	const fakePopoverTarget = Object.assign(document.createElement('div'), {
		className: `${popoverClassName}-target`,
		innerHTML: new Intl.DateTimeFormat('en-GB', {
			dateStyle: formatStyle,
			timeStyle: formatStyle
		}).format(new Date(timestampEl.getAttribute('datetime') || ''))
	});

	timestampEl.parentNode?.append(fakePopover, fakePopoverTarget);
};
