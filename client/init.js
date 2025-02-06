import { getRelativeTime, politeSetInterval } from './helpers.js';

const oneMinute = 60000;
const timestampEls = Array.from(
	document.querySelectorAll('.group__timestamp time')
);

if (timestampEls.length) {
	politeSetInterval(() => {
		timestampEls.forEach((timestampEl) => {
			const isoDatetime = timestampEl.getAttribute('datetime') || '';
			timestampEl.innerHTML = getRelativeTime(new Date(isoDatetime));
		});
	}, oneMinute);
}
