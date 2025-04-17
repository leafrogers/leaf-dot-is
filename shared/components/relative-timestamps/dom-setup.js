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
		innerHTML:
			'<span class="visually-hidden">Information</span><svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="m12 11v5m0 5a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm.05-13v.1h-.1v-.1z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>'
	});

	fakePopover.addEventListener('click', (ev) => {
		const el = ev.currentTarget;
		if (!(el instanceof Element)) {
			return;
		}
		ev.stopPropagation();
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
