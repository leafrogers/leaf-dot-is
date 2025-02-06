const timeUnitsInMs = {
	year: 24 * 60 * 60 * 1000 * 365,
	month: (24 * 60 * 60 * 1000 * 365) / 12,
	day: 24 * 60 * 60 * 1000,
	hour: 60 * 60 * 1000,
	minute: 60 * 1000,
	second: 1000
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * @param {Date} date1
 * @param {Date} date2
 */
export const getRelativeTime = (date1, date2 = new Date()) => {
	const elapsed = date1.getTime() - date2.getTime();

	// "Math.abs" accounts for both "past" & "future" scenarios
	for (const unit in timeUnitsInMs) {
		// @ts-ignore
		if (Math.abs(elapsed) > timeUnitsInMs[unit] || unit === 'second') {
			// @ts-ignore
			return rtf.format(Math.round(elapsed / timeUnitsInMs[unit]), unit);
		}
	}

	return '';
};

/**
 * @param {number} frequency
 * @param {() => void} func
 * @param {unknown[]} args
 */
export const politeSetInterval = (func, frequency, ...args) => {
	let previousTimestamp = 0;

	/**
	 * @param {number} now
	 */
	function render(now) {
		if (!previousTimestamp || now - previousTimestamp >= frequency) {
			previousTimestamp = now;
			// @ts-ignore
			func(...args);
		}

		requestAnimationFrame(render);
	}

	render(0);
};
