import { setUpRelativeTimestamps } from '../shared/components/relative-timestamps';

const timestampEls = Array.from(
	document.querySelectorAll('.group__timestamp time')
);

if (timestampEls.length) {
	setUpRelativeTimestamps(timestampEls);
}
